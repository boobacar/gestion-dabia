-- DIAG + FIX: appointments without resolvable patient/dentist names
-- Run in Supabase SQL Editor

-- 1) DIAGNOSTIC: appointments whose patient_id has no matching patient row
select
  a.id as appointment_id,
  a.patient_id,
  a.dentist_id,
  a.appointment_date,
  a.status,
  a.notes,
  p.id as matched_patient_id,
  p.first_name as patient_first_name,
  p.last_name as patient_last_name
from public.appointments a
left join public.patients p on p.id = a.patient_id
where p.id is null
order by a.appointment_date desc;

-- 2) DIAGNOSTIC: appointments whose dentist_id has no matching profile row
select
  a.id as appointment_id,
  a.patient_id,
  a.dentist_id,
  a.appointment_date,
  a.status,
  pr.id as matched_dentist_id,
  pr.first_name as dentist_first_name,
  pr.last_name as dentist_last_name
from public.appointments a
left join public.profiles pr on pr.id = a.dentist_id
where a.dentist_id is not null
  and pr.id is null
order by a.appointment_date desc;

-- 3) QUICK COUNTS (for release decision)
select
  count(*) filter (where p.id is null) as orphan_patient_refs,
  count(*) filter (where a.dentist_id is not null and pr.id is null) as orphan_dentist_refs,
  count(*) as total_appointments
from public.appointments a
left join public.patients p on p.id = a.patient_id
left join public.profiles pr on pr.id = a.dentist_id;

-- 4) TEMPLATE FIX (manual remap)
-- Replace <NEW_PATIENT_UUID> and <APPOINTMENT_UUID> then execute.
-- update public.appointments
-- set patient_id = '<NEW_PATIENT_UUID>'::uuid
-- where id = '<APPOINTMENT_UUID>'::uuid;

-- 5) OPTIONAL SAFETY: block future bad patient references (if constraint is missing)
-- Check existing FK(s):
-- select conname, pg_get_constraintdef(c.oid)
-- from pg_constraint c
-- join pg_class t on c.conrelid = t.oid
-- where t.relname = 'appointments' and c.contype = 'f';

-- If patient FK is missing, add it (run once, only after cleaning bad rows):
-- alter table public.appointments
--   add constraint appointments_patient_id_fkey
--   foreign key (patient_id) references public.patients(id)
--   on delete cascade;
