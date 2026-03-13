-- Official rollback migration for Phase 2 RLS hardening
-- Use this migration ONLY if strict role-based policies block production workflows.
-- This restores the previous permissive/dev policy model.

BEGIN;

-- Drop strict policies introduced in phase 2
DROP POLICY IF EXISTS "treatment_catalog_select_staff" ON public.treatment_catalog;
DROP POLICY IF EXISTS "treatment_catalog_write_admin" ON public.treatment_catalog;

DROP POLICY IF EXISTS "prescriptions_select_staff" ON public.prescriptions;
DROP POLICY IF EXISTS "prescriptions_write_clinical" ON public.prescriptions;
DROP POLICY IF EXISTS "prescriptions_update_clinical" ON public.prescriptions;
DROP POLICY IF EXISTS "prescriptions_delete_admin" ON public.prescriptions;

DROP POLICY IF EXISTS "payments_select_staff" ON public.payments;
DROP POLICY IF EXISTS "payments_insert_backoffice" ON public.payments;
DROP POLICY IF EXISTS "payments_update_backoffice" ON public.payments;
DROP POLICY IF EXISTS "payments_delete_admin" ON public.payments;

DROP POLICY IF EXISTS "invoices_select_staff" ON public.invoices;
DROP POLICY IF EXISTS "invoices_insert_backoffice" ON public.invoices;
DROP POLICY IF EXISTS "invoices_update_backoffice" ON public.invoices;
DROP POLICY IF EXISTS "invoices_delete_admin" ON public.invoices;

DROP POLICY IF EXISTS "expenses_select_staff" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert_backoffice" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update_backoffice" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete_admin" ON public.expenses;

DROP POLICY IF EXISTS "whatsapp_logs_select_backoffice" ON public.whatsapp_logs;
DROP POLICY IF EXISTS "whatsapp_logs_insert_backoffice" ON public.whatsapp_logs;
DROP POLICY IF EXISTS "whatsapp_logs_update_backoffice" ON public.whatsapp_logs;
DROP POLICY IF EXISTS "whatsapp_logs_delete_admin" ON public.whatsapp_logs;

DROP POLICY IF EXISTS "treatment_plans_select_staff" ON public.treatment_plans;
DROP POLICY IF EXISTS "treatment_plans_write_staff" ON public.treatment_plans;
DROP POLICY IF EXISTS "treatment_plans_update_staff" ON public.treatment_plans;
DROP POLICY IF EXISTS "treatment_plans_delete_admin" ON public.treatment_plans;

DROP POLICY IF EXISTS "treatment_plan_items_select_staff" ON public.treatment_plan_items;
DROP POLICY IF EXISTS "treatment_plan_items_write_staff" ON public.treatment_plan_items;
DROP POLICY IF EXISTS "treatment_plan_items_update_staff" ON public.treatment_plan_items;
DROP POLICY IF EXISTS "treatment_plan_items_delete_admin" ON public.treatment_plan_items;

DROP POLICY IF EXISTS "insurance_companies_select_staff" ON public.insurance_companies;
DROP POLICY IF EXISTS "insurance_companies_write_admin" ON public.insurance_companies;

-- Restore permissive/dev policies
CREATE POLICY "Enable all for anyone" ON public.treatment_catalog
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all for anyone" ON public.prescriptions
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all for anyone" ON public.payments
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all for anyone" ON public.invoices
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users" ON public.expenses
FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated to read whatsapp_logs" ON public.whatsapp_logs
FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated to insert whatsapp_logs" ON public.whatsapp_logs
FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated to delete whatsapp_logs" ON public.whatsapp_logs
FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all for authenticated users" ON public.treatment_plans
FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all for authenticated users" ON public.treatment_plan_items
FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read for authenticated users" ON public.insurance_companies
FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for admin" ON public.insurance_companies
FOR ALL USING (true);

COMMIT;
