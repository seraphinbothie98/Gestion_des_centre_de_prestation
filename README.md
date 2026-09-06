# CENTRE MANAGEMENT SYSTEM (CMS)
> Application d'entreprise full-stack pour la gestion intégrale de centres combinant **Pôle Services (Reprographie, Tirages, Reliure)** et **Pôle Formation (LMS, Certificats, Inscriptions)**.

---

## 🚀 Fonctionnalités Clés

### 🏢 Architecture Multi-Tenant & RBAC
- Multi-Centres / Multi-Agences natif (`tenant_id`, `branch_id`).
- 9 rôles prédéfinis avec permissions granulaires (*Super Admin, Admin Centre, Gérant, Réceptionniste, Caissier, Opérateur, Responsable Formation, Formateur, Magasinier*).
- Répertoire unifié **Person** (éliminant la redondance entre Clients, Apprenants et Formateurs).

### 🖨️ Pôle 1 — Services & Production
- Catalogue de prestations configurable (Photocopie, Impression A4/A3, Reliure, Plastification, Scan, Tirages photo...).
- Moteur de tarification dynamique dégressif (par paliers de quantité et type client étudiant/entreprise).
- **Saisie Rapide de Commande** en quelques secondes avec calcul instantané et encaissement immédiat.
- **Tableau Kanban Atelier** pour les opérateurs de production avec suivi d'états, priorités et minuterie.

### 🎓 Pôle 2 — Formation & LMS
- Catalogue de cours, découpage en modules, planification de sessions et gestion des capacités de salles.
- **Saisie Rapide d'Inscription** avec contrôle strict de jauge.
- Feuille d'émargement et pointage numérique des présences.
- Évaluations, coefficients et calcul automatique des moyennes/mentions.
- **Génération de Certificats PDF avec QR Code** et **Page Publique de Vérification** (`/verify/certificate/:code`).

### 💰 Finances, Caisse & Paiements
- Gestion de sessions de caisse (Ouverture, Mouvements, Dépenses, Inventaire physique et calcul des écarts).
- Paiements partiels/totaux avec support Espèces, Orange Money, MTN MoMo, Virement et Carte.
- Facturation normalisée (FAC-YYYY-XXXXXX), devis et reçus imprimables.

### 📦 Stocks & Fournisseurs
- Gestion des articles de stock avec alertes de seuil critique.
- **Déstockage automatique** lors de la validation des prestations de reprographie.
- Gestion des fournisseurs et bons de commande d'achat.

---

## 🛠️ Stack Technique
- **Frontend** : React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts, QRCode.react.
- **Persistance & Données** : Schéma relationnel PostgreSQL normalisé (`database/schema.sql`) avec politiques Row-Level Security (`database/rls_policies.sql`).
- **Abstractions** : `PaymentProvider` (Cash, Mobile Money) & `NotificationProvider` (Email, SMS, WhatsApp).

---

## 💻 Démarrage Rapide

```bash
# 1. Cloner et installer les dépendances
npm install

# 2. Lancer en local
npm run dev

# 3. Compiler pour production
npm run build
```
