# Centre Management System (CMS) — Authentification & Sécurité

## 1. Modèle d'Authentification
- Support du protocole JWT sécurisé & Supabase Auth.
- Validation des sessions et rafraîchissement des tokens.
- Isolation stricte des contextes utilisateur : chaque requête transporte l'identité du tenant actif (`tenant_id`).

## 2. Protection des Routes
- Vérification côté frontend via `useAuth()` et `hasPermission()`.
- Vérification côté backend par middleware JWT et injection du `current_tenant_id` dans la session PostgreSQL pour activation des politiques RLS.
