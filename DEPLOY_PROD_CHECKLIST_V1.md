# Deploy Prod Checklist — Gestion Dabia (projet principal)

## 1) Pré-release

- [ ] `npm run lint` (warnings tolérés, pas d'erreurs)
- [ ] `npm run build` OK
- [ ] Branche `master` à jour (GitHub)
- [ ] Snapshot/backup Supabase disponible

## 2) DB / Supabase

- [ ] `npx supabase link --project-ref <PROJECT_REF>`
- [ ] `npx supabase db push`
- [ ] `npx supabase migration list`
- [ ] Migration hardening RLS active (`20260313181000_harden_rls_phase2_patch.sql`)

## 3) Smoke test fonctionnel (10-15 min)

### Admin
- [ ] login
- [ ] /admin dashboard charge
- [ ] export CSV patients / rdv / finance
- [ ] paramétrage clinique (logo/coordonnées)

### Secrétaire
- [ ] création patient
- [ ] création/édition RDV
- [ ] ajout en salle d'attente (si flow activé)
- [ ] création facture/paiement

### Dentiste
- [ ] actes patient
- [ ] ordonnances
- [ ] impression facture/ordonnance

## 4) Sécurité

- [ ] `.env` non versionné
- [ ] routes sensibles protégées (admin)
- [ ] QR WhatsApp admin-only
- [ ] CRON protégé par `CRON_SECRET`

## 5) Post-release

- [ ] monitoring erreurs 30-60 min
- [ ] test WhatsApp reminder
- [ ] export CSV test
- [ ] backup post-release
