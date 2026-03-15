# Blueprint — Gestion Dabia v2 (from scratch)

Objectif: reconstruire une plateforme neuve, inspirée des flux Dentisto, avec une transition fluide pour dentistes, secrétaires et assistantes.

---

## 1) Principes produit (non négociables)

1. **Patient = cockpit principal**
   - Toutes les actions partent de la fiche patient.
2. **Vocabulaire identique au terrain**
   - Libellés/stats/statuts proches de Dentisto pour réduire la courbe d’apprentissage.
3. **Double navigation**
   - Vue globale (module) + vue contextualisée patient.
4. **Workflow d’équipe**
   - Secrétaire: RDV/rappels/encaissements/docs
   - Dentiste: actes/plans/ordonnances/imagerie
   - Assistante: support clinique + admin partiel

---

## 2) Stack technique recommandée

- **Frontend**: Next.js 15 (App Router) + TypeScript + shadcn/ui
- **State/query**: TanStack Query
- **Forms**: React Hook Form + Zod
- **Backend**: Next Server Actions + Route Handlers
- **DB/Auth/Storage/Realtime**: Supabase (Postgres + RLS + Storage + Realtime)
- **Jobs async**: Upstash Redis + QStash (ou BullMQ si infra dédiée)
- **Observabilité**: Sentry + logs structurés
- **Tests**: Vitest (unit) + Playwright (e2e)

---

## 3) Modules V1 (parité opérationnelle)

### A. Dashboard
- KPIs jour/mois (patients du jour, absentéisme, encaissement, reste à payer)
- Liste RDV du jour + actions rapides

### B. Rendez-vous
- Agenda semaine/jour/mois
- Statuts: `Actif`, `Fini`, `Absence`, `Annulé patient`, `Annulé praticien`
- Réservation en ligne: `En attente`, `Valide`, `Non traité`, `Non validé`, `Absence`, `Brouillon`

### C. Patients + Fiche patient (core)
- Identité, assurance/mutuelle, contacts
- Actions rapides (WhatsApp, email, nouveau RDV, salle d’attente, remarques)
- Onglets: Actes, Paiements, RDV, Factures, Imageries, Céphalo, Ordonnances,
  Feuilles de soins, Notes d’honoraires, Certificats, Devis, Prothèses, Tâches,
  Chèques, Salle d’attente, Documents

### D. Actes + Plans de traitement
- Odontogramme (initial/actuel)
- Plan de traitement multi-lignes
- Statut acte + montant + reçu + reste

### E. Finance
- Devis, Factures, Paiements, Charges, Chèques
- Journal financier + exports

### F. Clinique
- Ordonnances
- Certificats médicaux
- Feuilles de soins
- Imageries + Céphalo
- Prothèses (labo/date/statut)

### G. Ops & communication
- Salle d’attente
- Rappels (WhatsApp/SMS/email) + statuts envoi
- Tâches & remarques

---

## 4) RBAC (rôles)

- `admin`
- `dentist`
- `secretary`
- `assistant`

### Matrice simplifiée
- **admin**: full
- **dentist**: clinique full, financier lecture/partiel
- **secretary**: RDV/patient/finance/docs, clinique limitée
- **assistant**: support patient/RDV/docs, moins de droits financiers

---

## 5) Modèle de données (noyau)

## Tables identité
- `profiles` (user_id, role, full_name, is_active)
- `practitioners`

## Patients
- `patients`
- `patient_contacts`
- `patient_insurances`
- `patient_notes`

## RDV
- `appointments`
- `online_appointments`
- `waiting_room_visits`

## Clinique
- `clinical_procedures`
- `treatment_plans`
- `treatment_plan_items`
- `prescriptions`
- `medical_certificates`
- `imageries`
- `cephalo_records`
- `prostheses`

## Finance
- `quotes`
- `invoices`
- `payments`
- `expenses`
- `cheques`

## Stock
- `inventory_products`
- `inventory_purchases`
- `inventory_movements`

## Docs & communication
- `documents`
- `message_logs`
- `notification_settings`
- `audit_logs`
- `login_histories`

---

## 6) Architecture routes (Next.js)

- `/dashboard`
- `/appointments`
- `/online-appointments`
- `/patients`
- `/patients/[id]`
  - `/procedures`
  - `/payments`
  - `/appointments`
  - `/invoices`
  - `/quotes`
  - `/imageries`
  - `/cephalo`
  - `/prescriptions`
  - `/treatment-forms`
  - `/honorary-notes`
  - `/medical-certificates`
  - `/prostheses`
  - `/tasks`
  - `/cheques`
  - `/waiting-room-visits`
  - `/documents`
- `/expenses`
- `/cheques`
- `/tasks`
- `/notes`
- `/inventory/products`
- `/inventory/purchases`
- `/exports`
- `/settings/profile`
- `/settings/security`
- `/settings/notifications`
- `/settings/integrations/google-calendar`

---

## 7) API/Actions critiques

- Auth/session + role guard
- CRUD patient
- CRUD RDV + status transitions
- CRUD treatment plan / procedure
- Génération devis/facture
- Paiement + recalcul reste
- Rappels async (queue)
- Upload documents/images
- Export CSV/PDF

---

## 8) UX de transition (important)

1. Sidebar avec mêmes intitulés
2. Fiche patient visuellement proche
3. Même ordre des onglets
4. Statuts et couleurs similaires
5. Boutons clés conservés (`Ajouter`, `Créer un devis`, `Paiement`, etc.)
6. Raccourcis clavier pour secrétaire (recherche patient, nouveau RDV)

---

## 9) Plan d’exécution (sprints)

## Sprint 0 — Fondation (3-5 jours)
- Setup Next/Supabase
- Auth + RBAC + layout sidebar
- Schéma DB initial + RLS de base

## Sprint 1 — Cœur patient/RDV (1-2 semaines)
- Patients + fiche patient
- Agenda RDV + salle d’attente
- Réservation en ligne + statuts

## Sprint 2 — Clinique + finance (1-2 semaines)
- Actes + plans + odontogramme
- Devis/factures/paiements
- Ordonnances + certificats

## Sprint 3 — Compléments ops (1 semaine)
- Imageries/céphalo/prothèses
- Charges/chèques
- Tâches/remarques/rappels

## Sprint 4 — Stabilisation (1 semaine)
- Tests e2e
- Optimisation perf
- formation équipe + runbook migration

---

## 10) DoD (Definition of Done)

- Tests e2e critiques passants:
  - login
  - création patient
  - création RDV
  - création acte
  - devis/facture/paiement
- RLS validée par rôle
- Aucun secret dans git
- Backup/rollback documenté

---

## 11) Checklist lancement repo

1. Initialiser projet Next.js TS
2. Ajouter Supabase + env (`.env.example`)
3. Créer migrations SQL initiales
4. Config ESLint/Prettier/Husky
5. Setup CI (lint, typecheck, test, build)

---

## 12) Étape suivante immédiate

Créer un **MVP scaffolding** dans ce repo avec:
- layout sidebar,
- auth + roles,
- modules vides route-par-route,
- schéma SQL initial,
- backlog GitHub Issues auto-généré.
