-- Phase 2: RLS hardening by role for sensitive tables

-- Helper functions for role checks
create or replace function public.current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin'::user_role, false);
$$;

create or replace function public.is_clinical_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('admin'::user_role, 'dentist'::user_role), false);
$$;

create or replace function public.is_backoffice_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('admin'::user_role, 'secretary'::user_role, 'assistant'::user_role), false);
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_clinical_staff() or public.is_backoffice_staff();
$$;

-- Ensure RLS is enabled on critical tables
alter table if exists public.treatment_catalog enable row level security;
alter table if exists public.prescriptions enable row level security;
alter table if exists public.payments enable row level security;
alter table if exists public.invoices enable row level security;
alter table if exists public.expenses enable row level security;
alter table if exists public.whatsapp_logs enable row level security;
alter table if exists public.treatment_plans enable row level security;
alter table if exists public.treatment_plan_items enable row level security;
alter table if exists public.insurance_companies enable row level security;

-- Remove permissive old policies
DROP POLICY IF EXISTS "Enable all for anyone" ON public.treatment_catalog;
DROP POLICY IF EXISTS "Enable all for anyone" ON public.prescriptions;
DROP POLICY IF EXISTS "Enable all for anyone" ON public.payments;
DROP POLICY IF EXISTS "Enable all for anyone" ON public.invoices;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.expenses;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.treatment_plans;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.treatment_plan_items;
DROP POLICY IF EXISTS "Enable all for admin" ON public.insurance_companies;
DROP POLICY IF EXISTS "Allow authenticated to read whatsapp_logs" ON public.whatsapp_logs;
DROP POLICY IF EXISTS "Allow authenticated to insert whatsapp_logs" ON public.whatsapp_logs;
DROP POLICY IF EXISTS "Allow authenticated to delete whatsapp_logs" ON public.whatsapp_logs;

-- treatment_catalog: everyone staff can read, only admin can mutate
CREATE POLICY "treatment_catalog_select_staff" ON public.treatment_catalog
FOR SELECT USING (public.is_staff());
CREATE POLICY "treatment_catalog_write_admin" ON public.treatment_catalog
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- prescriptions: dentists/admin can read-write, backoffice can read only
CREATE POLICY "prescriptions_select_staff" ON public.prescriptions
FOR SELECT USING (public.is_staff());
CREATE POLICY "prescriptions_write_clinical" ON public.prescriptions
FOR INSERT WITH CHECK (public.is_clinical_staff());
CREATE POLICY "prescriptions_update_clinical" ON public.prescriptions
FOR UPDATE USING (public.is_clinical_staff()) WITH CHECK (public.is_clinical_staff());
CREATE POLICY "prescriptions_delete_admin" ON public.prescriptions
FOR DELETE USING (public.is_admin());

-- payments: staff read, backoffice write, admin delete
CREATE POLICY "payments_select_staff" ON public.payments
FOR SELECT USING (public.is_staff());
CREATE POLICY "payments_insert_backoffice" ON public.payments
FOR INSERT WITH CHECK (public.is_backoffice_staff());
CREATE POLICY "payments_update_backoffice" ON public.payments
FOR UPDATE USING (public.is_backoffice_staff()) WITH CHECK (public.is_backoffice_staff());
CREATE POLICY "payments_delete_admin" ON public.payments
FOR DELETE USING (public.is_admin());

-- invoices: staff read, backoffice write, admin delete
CREATE POLICY "invoices_select_staff" ON public.invoices
FOR SELECT USING (public.is_staff());
CREATE POLICY "invoices_insert_backoffice" ON public.invoices
FOR INSERT WITH CHECK (public.is_backoffice_staff());
CREATE POLICY "invoices_update_backoffice" ON public.invoices
FOR UPDATE USING (public.is_backoffice_staff()) WITH CHECK (public.is_backoffice_staff());
CREATE POLICY "invoices_delete_admin" ON public.invoices
FOR DELETE USING (public.is_admin());

-- expenses: staff read, backoffice write, admin delete
CREATE POLICY "expenses_select_staff" ON public.expenses
FOR SELECT USING (public.is_staff());
CREATE POLICY "expenses_insert_backoffice" ON public.expenses
FOR INSERT WITH CHECK (public.is_backoffice_staff());
CREATE POLICY "expenses_update_backoffice" ON public.expenses
FOR UPDATE USING (public.is_backoffice_staff()) WITH CHECK (public.is_backoffice_staff());
CREATE POLICY "expenses_delete_admin" ON public.expenses
FOR DELETE USING (public.is_admin());

-- whatsapp logs: backoffice/admin read-write, admin delete
CREATE POLICY "whatsapp_logs_select_backoffice" ON public.whatsapp_logs
FOR SELECT USING (public.is_backoffice_staff());
CREATE POLICY "whatsapp_logs_insert_backoffice" ON public.whatsapp_logs
FOR INSERT WITH CHECK (public.is_backoffice_staff());
CREATE POLICY "whatsapp_logs_update_backoffice" ON public.whatsapp_logs
FOR UPDATE USING (public.is_backoffice_staff()) WITH CHECK (public.is_backoffice_staff());
CREATE POLICY "whatsapp_logs_delete_admin" ON public.whatsapp_logs
FOR DELETE USING (public.is_admin());

-- treatment plans/items: staff read/write, admin delete
CREATE POLICY "treatment_plans_select_staff" ON public.treatment_plans
FOR SELECT USING (public.is_staff());
CREATE POLICY "treatment_plans_write_staff" ON public.treatment_plans
FOR INSERT WITH CHECK (public.is_staff());
CREATE POLICY "treatment_plans_update_staff" ON public.treatment_plans
FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "treatment_plans_delete_admin" ON public.treatment_plans
FOR DELETE USING (public.is_admin());

CREATE POLICY "treatment_plan_items_select_staff" ON public.treatment_plan_items
FOR SELECT USING (public.is_staff());
CREATE POLICY "treatment_plan_items_write_staff" ON public.treatment_plan_items
FOR INSERT WITH CHECK (public.is_staff());
CREATE POLICY "treatment_plan_items_update_staff" ON public.treatment_plan_items
FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "treatment_plan_items_delete_admin" ON public.treatment_plan_items
FOR DELETE USING (public.is_admin());

-- insurance companies: staff read, admin write
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.insurance_companies;
CREATE POLICY "insurance_companies_select_staff" ON public.insurance_companies
FOR SELECT USING (public.is_staff());
CREATE POLICY "insurance_companies_write_admin" ON public.insurance_companies
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
