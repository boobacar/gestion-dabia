# Smoke Test Release — Gestion Dabia

Durée cible: 15-20 min
Pré-requis: compte admin + compte secrétaire + compte dentiste

## 0) API Health

- Ouvrir `/api/health`
- Attendu:
  - admin: `status: ok` + `checks.env` true
  - user: `status: ok`

## 1) Parcours Admin

1. Login admin
2. `/admin/exports`
   - télécharger `patients.csv`
   - télécharger `appointments.csv`
   - télécharger `finance.csv`
3. `/admin/patients/[id]` -> onglet factures
   - ouvrir modale facture
   - cliquer `Télécharger Facture`
   - cliquer `Télécharger Devis`
   - cliquer `Ajouter facture aux documents`
   - cliquer `Ajouter devis aux documents`
4. Onglet documents patient
   - vérifier présence des nouveaux documents ajoutés

## 2) Parcours Secrétaire

1. Login secrétaire
2. créer patient test
3. créer RDV
4. vérifier affichage dans agenda
5. créer facture simple + paiement

## 3) Parcours Dentiste

1. Login dentiste
2. ouvrir patient
3. créer ordonnance
4. imprimer/ouvrir document lié

## 4) Critères GO/NO-GO

## GO si:
- aucun 500 sur parcours critiques
- exports téléchargent correctement
- PDF facture/devis téléchargent
- ajout aux documents fonctionne

## NO-GO si:
- erreur auth/rôle
- export KO
- PDF KO
- ajout document KO

## 5) En cas de NO-GO

- suivre `RUNBOOK_INCIDENT_RESPONSE.md`
- rollback code (git revert) ou rollback DB (backup/PITR)
