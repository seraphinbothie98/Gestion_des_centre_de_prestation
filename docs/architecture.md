# Centre Management System (CMS) — Documentation d'Architecture

## 1. Vue d'Ensemble
Le **Centre Management System (CMS)** est une application logicielle d'entreprise full-stack conçue pour automatiser l'intégralité des opérations d'un centre combinant deux activités maîtresses :
1. **Pôle Services** (Reprographie, Impression, Reliure, Plastification, Scan, etc.)
2. **Pôle Formation** (LMS intégré : Formations, Sessions, Inscriptions, Évaluations, Certificats avec QR Code)

## 2. Piliers d'Ingénierie
- **Multi-Tenant d'Origine** : Chaque ressource métier est rattachée à un `tenant_id` et optionnellement un `branch_id`.
- **Modèle de Données Unifié** : L'entité centrale `Person` regroupe clients, apprenants, formateurs et contacts afin d'éliminer toute redondance.
- **Sécurité Granulaire (RBAC)** : 9 rôles par défaut et plus de 25 permissions unitaires vérifiées au frontend et au backend.
- **Atomicité & Intégrité** : Cohérence stricte entre les commandes, les paiements, le fond de caisse, et les niveaux de stock (consommations automatiques).

## 3. Structure des Modules Métier
- `src/modules/auth` : Gestion de session, authentification JWT/Supabase, profil utilisateur.
- `src/modules/dashboard` : Métriques temps réel, KPI multi-pôles, graphiques d'évolution et filtres temporels.
- `src/modules/persons` : Carnet d'adresses unifié et historique transversal (commandes, formations, factures).
- `src/modules/services` & `src/modules/orders` : Catalogue de prestations, moteur de calcul par palier de volume, tunnel de commande express.
- `src/modules/production` : File Kanban pour les opérateurs, prise en charge, minuterie et clôture de tâche.
- `src/modules/training` : Catalogue de cours, découpage en modules, planification de sessions, gestion des salles.
- `src/modules/enrollments` & `src/modules/attendance` : Inscriptions avec contrôle strict des jauges et feuille d'émargement numérique.
- `src/modules/assessments` & `src/modules/certificates` : Relevés de notes pondérés, génération de certificats PDF conformes avec QR code sécurisé.
- `src/modules/cash` & `src/modules/payments` : Gestion de caisse au centime près (ouverture, écarts, clôtures) et paiements fractionnés (Espèces, Mobile Money, Carte).
- `src/modules/stock` & `src/modules/suppliers` : Décrémentation automatique des consommables par prestation et réapprovisionnement.
- `src/modules/billing` : Génération de devis, factures normalisées et reçus d'encaissement.
- `src/modules/notifications` : Hub multi-canaux (In-App, Email, SMS, WhatsApp) et historique d'envois.
- `src/modules/reports` : Moteur d'analyse financière et opérationnelle avec exports PDF, Excel et CSV.
- `src/modules/audit` : Traçabilité immuable de chaque action sensible.
