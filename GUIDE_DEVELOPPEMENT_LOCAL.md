# 🛠️ GUIDE DE DÉVELOPPEMENT LOCAL - LA CABRADE V4

## 🎯 PROBLÈME ACTUEL

Le projet est configuré pour se connecter à la base de données **Railway (production)**.  
Pour le développement local, tu as **2 options** :

---

## ✅ OPTION 1 : Développement avec Base de Données Production (Plus Simple)

### Avantages
- ✅ Pas de configuration supplémentaire
- ✅ Données réelles (produits Odoo synchronisés)
- ✅ Pas besoin d'installer PostgreSQL localement

### Inconvénients
- ⚠️ Modifications directes sur la production (risqué)
- ⚠️ Nécessite une connexion internet

### Comment faire

**1. Le fichier `/backend/.env` devrait déjà être configuré pour Railway**

**2. Lance les serveurs :**

```bash
# Terminal 1 - Backend (utilise dev:local si erreurs Redis/MinIO)
cd /Users/valentinbronfort/Documents/LaCabrade_V4/backend
npm run dev:local   # ou npm run dev

# Terminal 2 - Storefront
cd /Users/valentinbronfort/Documents/LaCabrade_V4/storefront
npm run dev
```

> ⚠️ **Erreurs Redis / MinIO en local ?**  
> Si tu vois `getaddrinfo ENOTFOUND redis.railway.internal` ou `The Access Key Id you provided does not exist`, utilise **`npm run dev:local`** à la place de `npm run dev`. Ce script désactive Redis et MinIO pour utiliser le stockage local.

**3. Accède au site :**
- Storefront : http://localhost:3000
- Backend API : http://localhost:9000
- Admin Medusa : http://localhost:9000/app

---

## ✅ OPTION 2 : Développement avec Base de Données Locale (Recommandé)

### Avantages
- ✅ Aucun risque pour la production
- ✅ Travail hors ligne possible
- ✅ Tests sans impacter les données réelles

### Inconvénients
- ⚠️ Nécessite PostgreSQL installé localement
- ⚠️ Pas de données Odoo (à moins de faire un dump de production)

### Prérequis

#### 1. Installer PostgreSQL

**Sur macOS (avec Homebrew)** :
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Vérifier l'installation** :
```bash
psql --version
```

#### 2. Créer la base de données

```bash
# Se connecter à PostgreSQL
psql postgres

# Dans psql, créer la base de données
CREATE DATABASE lacabrade_local;

# Créer un utilisateur (optionnel)
CREATE USER medusa WITH PASSWORD 'medusa_password';
GRANT ALL PRIVILEGES ON DATABASE lacabrade_local TO medusa;

# Quitter
\q
```

#### 3. Configurer les variables d'environnement

**Créer `/backend/.env.local`** (ce fichier est ignoré par Git) :

```bash
# Database
DATABASE_URL=postgresql://medusa:medusa_password@localhost:5432/lacabrade_local

# Redis (optionnel pour le dev local, utilise in-memory si absent)
# REDIS_URL=redis://localhost:6379

# JWT & Cookie
JWT_SECRET=your-local-jwt-secret-here
COOKIE_SECRET=your-local-cookie-secret-here

# Backend URL
BACKEND_URL=http://localhost:9000

# CORS
STORE_CORS=http://localhost:3000,http://localhost:8000
ADMIN_CORS=http://localhost:9000,http://localhost:7001

# Worker Mode (use shared for local dev)
WORKER_MODE=shared

# Files (local storage for dev)
# Pas besoin de MinIO en local, utilise le système de fichiers

# Emails - Utilise Resend en mode test
RESEND_API_KEY=re_123456789 # Remplace par ta clé de test Resend
RESEND_FROM_EMAIL=dev@lacabrade.com

# Stripe - Mode Test
STRIPE_API_KEY=sk_test_... # Remplace par ta clé de test Stripe
STRIPE_WEBHOOK_SECRET=whsec_... # Remplace par ton secret webhook test

# Meilisearch (optionnel en dev)
# MEILISEARCH_HOST=http://localhost:7700
# MEILISEARCH_ADMIN_KEY=masterKey

# Odoo - Connecte à production ou désactive
# ODOO_URL=...
# ODOO_DB_NAME=...
# ODOO_USERNAME=...
# ODOO_API_KEY=...

# Bpost - Mode Test
# BPOST_PUBLIC_KEY=...
# BPOST_PRIVATE_KEY=...
```

#### 4. Initialiser la base de données

```bash
cd /Users/valentinbronfort/Documents/LaCabrade_V4/backend

# Lancer les migrations
npx medusa db:migrate

# (Optionnel) Seed avec des données de test
npm run seed
```

#### 5. Lancer les serveurs

```bash
# Terminal 1 - Backend
cd /Users/valentinbronfort/Documents/LaCabrade_V4/backend
npm run dev

# Terminal 2 - Storefront  
cd /Users/valentinbronfort/Documents/LaCabrade_V4/storefront
npm run dev
```

---

## 🚀 SCRIPTS UTILES

### Script de démarrage automatique

J'ai créé un script `/start-dev.sh` :

```bash
cd /Users/valentinbronfort/Documents/LaCabrade_V4
./start-dev.sh
```

### Voir les logs en temps réel

```bash
# Logs backend
tail -f backend.log

# Logs storefront
tail -f storefront.log
```

### Arrêter les serveurs

```bash
# Trouver les processus
lsof -i:9000  # Backend
lsof -i:3000  # Storefront

# Tuer les processus
kill -9 <PID>

# Ou tuer tous les processus Node
killall node
```

### Nettoyer les ports bloqués

```bash
lsof -ti:9000,3000 | xargs kill -9
```

---

## 🔍 RÉSOLUTION DES PROBLÈMES

### Problème : "ENOTFOUND postgres.railway.internal"

**Cause** : Le backend essaie de se connecter à Railway au lieu de ta DB locale.

**Solution** :
1. Vérifie que tu as créé `/backend/.env.local`
2. Vérifie que `DATABASE_URL` pointe vers `localhost:5432`
3. Relance le backend

### Problème : "Connection refused" sur le port 9000

**Cause** : Le backend n'a pas démarré correctement.

**Solution** :
1. Vérifie les logs : `cat backend.log`
2. Vérifie la connexion à PostgreSQL : `psql lacabrade_local`
3. Vérifie que le port 9000 n'est pas utilisé : `lsof -i:9000`

### Problème : Le storefront affiche "No products found"

**Cause** : La base de données locale est vide.

**Solution** :
1. Lance le seed : `cd backend && npm run seed`
2. Ou importe un dump de production
3. Ou connecte Odoo pour synchroniser les produits

### Problème : Erreurs de migration de base de données

**Solution** :
```bash
cd backend

# Reset la base de données (⚠️ Perte de données)
dropdb lacabrade_local
createdb lacabrade_local

# Relance les migrations
npx medusa db:migrate
npm run seed
```

---

## 📦 IMPORTER DES DONNÉES DE PRODUCTION (Optionnel)

Si tu veux avoir les vrais produits en local :

### 1. Créer un dump de la base de données Railway

```bash
# Connecte-toi à Railway CLI
railway login

# Sélectionne ton projet
railway link

# Créer un dump
railway run pg_dump > production_dump.sql
```

### 2. Importer le dump localement

```bash
psql lacabrade_local < production_dump.sql
```

---

## 🎨 DÉVELOPPEMENT FRONTEND UNIQUEMENT

Si tu veux juste voir le frontend sans toucher au backend :

```bash
# Le storefront se connecte automatiquement au backend Railway en production
cd storefront
npm run dev
```

✅ Le storefront va utiliser l'API de production automatiquement.

---

## 🔐 ACCÈS À L'ADMIN MEDUSA

### URL
http://localhost:9000/app

### Créer un admin user

```bash
cd backend
node create-admin.sh
```

Ou directement :
```bash
npx medusa user -e admin@sellerie-lacabrade.be -p motdepasse123
```

---

## 📊 STATUT DES SERVICES

### Vérifier que tout tourne

```bash
# Backend
curl http://localhost:9000/health

# Storefront
curl http://localhost:3000

# Admin
open http://localhost:9000/app
```

---

## 💡 RECOMMANDATIONS

### Pour le développement frontend uniquement
→ **Utilise OPTION 1** (production DB) ou laisse le storefront se connecter à Railway

### Pour le développement backend/features
→ **Utilise OPTION 2** (DB locale) pour éviter de casser la production

### Pour les tests de bout en bout
→ **DB locale** avec seed de données de test

---

## 🆘 BESOIN D'AIDE ?

Si tu rencontres des problèmes :

1. Vérifie les logs : `cat backend.log` et `cat storefront.log`
2. Vérifie les variables d'environnement : `cat backend/.env.local`
3. Vérifie que PostgreSQL tourne : `brew services list`
4. Redémarre tout : `killall node && ./start-dev.sh`

---

## ✅ CHECKLIST AVANT DE COMMENCER

- [ ] PostgreSQL installé et running (pour OPTION 2)
- [ ] Base de données `lacabrade_local` créée (pour OPTION 2)
- [ ] Fichier `/backend/.env.local` configuré (pour OPTION 2)
- [ ] Migrations exécutées : `npx medusa db:migrate`
- [ ] Seed de données : `npm run seed` (optionnel)
- [ ] Backend démarre sans erreur : `npm run dev`
- [ ] Storefront démarre sans erreur : `npm run dev`
- [ ] http://localhost:3000 accessible ✅
- [ ] http://localhost:9000/app accessible ✅

---

**🎉 Bon développement !**

