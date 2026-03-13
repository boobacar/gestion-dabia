# Deploy Checklist (Phase 2 RLS)

## Before deploy (5 min)

- [ ] Confirm latest code is committed and pushed
- [ ] Supabase project linked to correct env (`npx supabase projects list`)
- [ ] Create a backup / snapshot in Supabase dashboard
- [ ] Keep rollback SQL ready: `supabase/ROLLBACK_PHASE2_RLS.sql`

## Smoke test after deploy (10 min)

Login as **admin**:
- [ ] Open `/admin`
- [ ] Open patients list + one patient detail
- [ ] Create/update/delete an expense
- [ ] Create/update invoice + payment
- [ ] Open WhatsApp settings and QR endpoint flow

Login as **dentist**:
- [ ] Open appointments
- [ ] Read patient detail + treatment plans
- [ ] Create/update a prescription
- [ ] Confirm forbidden actions are blocked where expected

Login as **secretary/assistant**:
- [ ] Open patients + appointments
- [ ] Create/update invoices/payments
- [ ] Read whatsapp logs and send allowed notifications
- [ ] Confirm restricted actions are blocked

## Quick DB checks (SQL editor)

```sql
-- list policies on sensitive tables
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'invoices','payments','expenses','prescriptions',
    'treatment_plans','treatment_plan_items',
    'whatsapp_logs','treatment_catalog','insurance_companies'
  )
order by tablename, policyname;
```

## If incident happens

1. Run rollback SQL in Supabase SQL Editor:
   - `supabase/ROLLBACK_PHASE2_RLS.sql`
2. Re-test critical flows (admin + secretary)
3. If still broken: revert app commit and redeploy previous stable version

## Stable release practice

- Use staging first when possible
- Keep migration files unique timestamp format
- Avoid broad `USING (true)` policies in production
