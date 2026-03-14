# Runbook Incident Response — Gestion Dabia

## 1) Incident identifié

- Capturer l'heure + endpoint/module touché
- Capturer erreur UI + logs serveur
- Identifier impact (admin / secrétaire / dentiste)

## 2) Mesures immédiates

1. Vérifier santé API:
   - `GET /api/health`
2. Vérifier Supabase (dashboard + logs)
3. Vérifier migrations:
   - `npx supabase migration list`

## 3) Rollback code

```bash
git log --oneline -n 10
git revert <sha>
git push origin master
```

## 4) Rollback DB

- Recommandé: restauration backup/PITR Supabase
- Alternative: migration corrective ciblée + `supabase db push`

## 5) Validation post-rollback

- login
- patients
- RDV
- factures/paiements
- exports
- WhatsApp settings

## 6) Post mortem court

- cause racine
- surface impactée
- correction durable
- action préventive (test/checklist)
