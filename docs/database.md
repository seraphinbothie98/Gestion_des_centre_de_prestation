# Centre Management System (CMS) — Base de Données PostgreSQL

## 1. Schéma Relationnel & Normalisation
Le schéma de base de données est modélisé pour PostgreSQL 14+ et Supabase. Il est disponible dans [`database/schema.sql`](file:///c:/Users/bothi/.gemini/antigravity-ide/scratch/Gestion_des_centre_de_prestation/database/schema.sql).

### Tables Principales & Domaines
1. **Multi-Tenant & Organisation** :
   - `tenants` (Multi-centres, paramètres généraux, devise, mentions légales)
   - `branches` (Agences et annexes par centre)
2. **RBAC & Sécurité** :
   - `users` (Collaborateurs avec hash sécurisé, appartenance tenant/branch)
   - `roles` (Super Admin, Admin Centre, Gérant, Réceptionniste, Caissier, Opérateur, Responsable Formation, Formateur, Magasinier)
   - `permissions` (Permissions atomiques, ex: `orders.create`, `cash.open`, `certificates.create`)
   - `user_roles`, `role_permissions`
3. **Personnes Unifiées** :
   - `persons` (Entité pivot pour Clients, Apprenants, Formateurs)
   - `customers`, `learners`, `trainers`
4. **Pôle 1 : Services & Production** :
   - `service_categories`, `services`, `service_pricing_rules` (Tarification par volume et type client)
   - `orders`, `order_items`, `order_files`, `order_status_history`
   - `production_jobs` (File Kanban atelier, chronométrage)
5. **Pôle 2 : Formation & LMS** :
   - `training_categories`, `trainings`, `training_modules`
   - `classrooms`, `training_sessions`, `enrollments`
   - `attendance_sheets`, `attendance_records`
   - `assessments`, `assessment_results`
   - `certificates`, `certificate_verifications` (QR Code et URL publique)
6. **Finances & Caisse** :
   - `cash_registers`, `cash_sessions`, `cash_movements`, `expenses`
   - `payments` (Espèces, Orange Money, MTN MoMo, Carte, Virement)
7. **Stock & Fournisseurs** :
   - `products`, `service_product_consumptions` (Déstockage automatique)
   - `stock_movements`, `suppliers`, `purchase_orders`, `purchase_items`
8. **Facturation & Audit** :
   - `invoices`, `invoice_items`, `document_sequences`
   - `notifications`, `audit_logs`

## 2. Politiques Row-Level Security (RLS)
Voir [`database/rls_policies.sql`](file:///c:/Users/bothi/.gemini/antigravity-ide/scratch/Gestion_des_centre_de_prestation/database/rls_policies.sql) pour les règles d'isolation par `tenant_id`.
