# Centre Management System (CMS) — Matrice RBAC (Rôles & Permissions)

## 1. Rôles Définis

| Code Rôle | Intitulé | Description |
| :--- | :--- | :--- |
| `SUPER_ADMIN` | Super Administrateur | Accès complet multi-centres, gestion globale de la plateforme SaaS. |
| `ADMIN_CENTRE` | Administrateur Centre | Pilotage intégral de son centre, utilisateurs, tarifs et finances. |
| `GERANT` | Gérant Opérationnel | Gestion quotidienne des commandes, stocks, caisse et rapports. |
| `RECEPTIONNISTE` | Réceptionniste | Accueil client, devis, création des commandes et inscriptions. |
| `CAISSIER` | Caissier | Encaissements, gestion des sessions et mouvements de caisse. |
| `OPERATEUR` | Opérateur Atelier | File de production Kanban, minuterie, exécution des travaux. |
| `RESPONSABLE_FORMATION` | Responsable Formation | Gestion des cours, sessions, formateurs, notes et certificats. |
| `FORMATEUR` | Formateur | Pointage des présences et saisie des évaluations d'apprenants. |
| `MAGASINIER` | Magasinier | Gestion des stocks, alertes réapprovisionnement et réceptions. |

## 2. Permissions Granulaires
- **Commandes** : `orders.create`, `orders.view`, `orders.update`, `orders.cancel`
- **Production** : `production.view`, `production.manage`
- **Finances & Caisse** : `payments.create`, `payments.view`, `payments.refund`, `cash.open`, `cash.close`, `cash.view`, `expenses.manage`
- **Formation** : `trainings.view`, `trainings.manage`, `sessions.manage`, `enrollments.manage`, `attendance.manage`, `assessments.manage`, `certificates.create`, `certificates.verify`
- **Logistique** : `stock.view`, `stock.manage`, `suppliers.manage`
- **Administration** : `reports.view`, `users.manage`, `settings.manage`
