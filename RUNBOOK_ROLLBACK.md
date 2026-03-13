# RUNBOOK — Rollback Phase 2 RLS

## Quand rollbacker ?

Rollback immédiat si après déploiement tu observes :
- erreurs `permission denied` sur pages admin critiques
- actions métier bloquées (factures, paiements, dépenses, prescriptions)
- WhatsApp/QR inaccessible pour les rôles attendus

## Pré-check (1 min)

- Vérifie que le problème est bien lié aux droits (RLS) et non à une panne réseau/API.
- Ouvre les logs applicatifs et repère les erreurs SQL/RLS.

## Action rollback (2 min)

### Option A — via migration versionnée (recommandé)
```bash
cd /home/fallcon/.openclaw/workspace/gestion-dabia
npx supabase db push
```

> Cette commande appliquera: `20260313193000_rollback_phase2_rls.sql`

### Option B — urgence SQL Editor
- Exécuter `supabase/ROLLBACK_PHASE2_RLS.sql` dans Supabase SQL Editor.

## Vérification post-rollback (5 min)

### 1) Smoke test UI
- Login admin: dashboard + patients + invoices + expenses
- Login secretary/assistant: patients + appointments + invoices/payments
- Login dentist: appointments + prescriptions

### 2) Vérification policies
```sql
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

## Après incident

1. Ouvrir ticket interne: cause + impact + heure + users touchés
2. Garder rollback actif pour stabilité
3. Corriger RLS en staging
4. Redéployer avec checklist complète

## Commandes utiles

```bash
# état des migrations locales/distantes
npx supabase migration list

# lier au bon projet si besoin
npx supabase link --project-ref hatltsmkxzhcopxrvkre
```
