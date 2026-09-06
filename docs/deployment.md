# Centre Management System (CMS) — Guide de Déploiement

## 1. Déploiement Frontend (Vercel / Netlify)
1. Lier le dépôt GitHub au projet Vercel.
2. Build Command : `npm run build`
3. Output Directory : `dist`
4. Définir les variables d'environnement (`VITE_API_URL`, etc.).

## 2. Déploiement Base de Données PostgreSQL / Supabase
1. Exécuter le script DDL `database/schema.sql`.
2. Appliquer les politiques de sécurité `database/rls_policies.sql`.
3. Optionnel : Exécuter `database/seed.sql` pour initialiser le premier centre avec ses rôles et prestations par défaut.

## 3. Lancement Local
```bash
# Installation des dépendances
npm install

# Démarrage du serveur de développement Vite
npm run dev

# Construction de la version de production
npm run build
```
