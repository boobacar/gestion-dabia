# 🏥 DABIA - Documentation des Fonctionnalités

Bienvenue dans la documentation officielle de **DABIA**, votre solution de gestion clinique dentaire ultra-performante. Ce document détaille chaque menu et fonctionnalité de l'application.

---

## 📊 1. Tableau de Bord (Dashboard)
Le centre de pilotage de votre clinique.
- **Indicateurs KPI** : Visualisation en temps réel du nombre total de patients, du taux d'occupation du cabinet, du nombre de soins effectués et du CA encaissé ce mois-ci.
- **Graphique de Revenus** : Évolution mensuelle de votre chiffre d'affaires.
- **Activité Récente** : Liste des 5 dernières factures et des 5 derniers patients inscrits.
- **Gestion des Dettes** : Alerte sur le montant total à recouvrer avec accès rapide à la liste des impayés.

## 👥 2. Patients (DMP - Dossier Médical Partagé)
La gestion complète de votre base de données patients.
- **Liste des Patients** : Recherche intelligente (par nom, numéro ou téléphone) et pagination performante.
- **Profil Patient Ultra-Complet** :
    - **Dossier (DMP)** : Historique médical avec système de badges pour les allergies ou conditions critiques.
    - **Schéma Dentaire (Odontogramme)** : Interface interactive pour marquer les soins et conditions dent par dent.
    - **Rendez-vous** : Historique complet des consultations passées et futures.
    - **Imagerie & Documents** : Stockage sécurisé des radios et documents externes.
    - **Facturation** : Gestion des factures, devis et règlements spécifiques au patient.
    - **Ordonnances** : Génération et historique des prescriptions.

## 📅 3. Agenda & RDV
Planification intelligente et visuelle.
- **Calendrier Interactif** : Vue mensuelle, hebdomadaire ou journalière avec support du drag-and-drop (à venir) et clic pour créer.
- **Code Couleur** : Chaque patient possède sa propre couleur unique pour une identification rapide.
- **Actions Rapides** : Modifier le statut (Terminé, Absent, Annulé) directement depuis la barre latérale.
- **Rappels Automatiques** : Confirmation d'envoi automatique via WhatsApp lors de la création d'un RDV.

## 📄 4. Factures & Devis
La gestion financière simplifiée.
- **Création de Factures** : Sélection de soins dans un catalogue, calcul automatique des remises et des prises en charge d'assurance.
- **Gestion des Assurances/IPM** : Support complet des compagnies (AXA, Sonam, IPM Sonatel, etc.) avec calcul de la quote-part patient.
- **Journal des Mouvements** : Filtre par date, par statut (Payé, En attente, Dette) et par type (Assurance).
- **Règlements Partiels** : Possibilité d'encaisser des acomptes et de suivre le reste à payer.

## 📉 5. Dépenses (Comptabilité)
Suivi des sorties d'argent de la clinique.
- **Enregistrement des Frais** : Loyers, consommables, salaires, etc.
- **Calcul du Bénéfice Net** : Déduction automatique des dépenses par rapport aux revenus sur le Dashboard.

## 📦 6. Stocks & Inventaire
Évitez les ruptures de stock.
- **Suivi des Quantités** : Alertes visuelles pour les produits en stock faible.
- **Historique des Mouvements** : Suivi des entrées et sorties de matériel.

## 📥 7. Importation CSV
Migration facile depuis d'anciens systèmes.
- **Import en Masse** : Intégration de milliers de patients en quelques secondes via un fichier CSV.
- **Standardisation Auto** : Nettoyage automatique des numéros de téléphone au format international.

---

## 📱 8. Intégration WhatsApp (DABIA Connect)
L'outil le plus puissant pour la fidélisation patient.

- **DABIA Broadcast** : Envoyez des messages personnalisés ("Joyeuses Fêtes {prenom} !") à toute votre base de données en un clic.
- **DABIA Connect (Chat)** : Interface de discussion en temps réel intégrée. Communiquez avec vos patients sans quitter l'application.
- **Rappels 24h** : Envoi automatique de rappels aux patients ayant un RDV le lendemain.
- **Relance Inactifs** : Identifiez et relancez automatiquement les patients n'ayant pas consulté depuis plus de 6 mois.
- **Partage de Documents** : Envoyez les factures ou ordonnances directement sur le WhatsApp du patient.
- **Sécurité** : Système anti-spam avec délais aléatoires pour protéger votre numéro contre le bannissement.

---

## ⚙️ 9. Paramètres & Sécurité
- **Gestion des Utilisateurs** : Création de comptes pour les dentistes et assistants avec contrôle d'accès (RBAC).
- **Profils** : Les dentistes sont automatiquement redirigés vers leur agenda personnel.
- **Sécurité Supabase** : Protection des données sensibles par Row Level Security (RLS).

## ⚡ 10. Performance & Expérience Utilisateur
- **Ultra-Fluide** : Navigation instantanée grâce au streaming de données et à la parallélisation des requêtes.
- **Premium Design** : Interface moderne, mode sombre subtil, et glassmorphism pour un confort visuel maximal.

---
*DABIA - L'innovation au service de votre sourire.* 🦷🚀🏁
