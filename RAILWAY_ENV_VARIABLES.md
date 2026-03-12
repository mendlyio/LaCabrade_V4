# Variables d'environnement Railway - LaCabrade V4

Ce document liste toutes les variables d'environnement nécessaires pour déployer l'application sur Railway.

## 📦 Backend (Medusa)

### Variables **OBLIGATOIRES** :

```bash
# Database PostgreSQL (fournie automatiquement par Railway si vous ajoutez un service PostgreSQL)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Secrets (générer des chaînes aléatoires sécurisées)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
COOKIE_SECRET=your-super-secret-cookie-key-min-32-chars

# URL publique du backend (Railway la génère automatiquement)
BACKEND_PUBLIC_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}

# CORS - URLs du frontend et admin (remplacer par vos URLs réelles)
STORE_CORS=https://votre-frontend.up.railway.app
ADMIN_CORS=https://votre-backend.up.railway.app
AUTH_CORS=https://votre-frontend.up.railway.app

# Mode serveur
MEDUSA_WORKER_MODE=shared
```

### Variables **OPTIONNELLES** :

```bash
# Redis (pour event bus et workflow - recommandé en production)
REDIS_URL=${{Redis.REDIS_URL}}

# MinIO pour stockage de fichiers
MINIO_ENDPOINT=votre-minio-endpoint.com
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET=medusa-media

# Email - Resend (domaine vérifié: sellerie-lacabrade.be)
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=contact@sellerie-lacabrade.be
CONTACT_EMAIL=contact@sellerie-lacabrade.be

# Email - SendGrid (alternative à Resend)
SENDGRID_API_KEY=SG.xxxxxxxxxxxx
SENDGRID_FROM_EMAIL=contact@sellerie-lacabrade.be

# Stripe Payment
STRIPE_API_KEY=sk_live_xxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx

# Meilisearch (recherche)
MEILISEARCH_HOST=https://votre-meilisearch.com
MEILISEARCH_ADMIN_KEY=your-admin-key

# Odoo ERP Integration
ODOO_URL=https://votre-odoo.com
ODOO_DB_NAME=votre-database
ODOO_USERNAME=admin@example.com
ODOO_API_KEY=your-api-key

# Bpost Shipping
BPOST_PUBLIC_KEY=your-public-key
BPOST_PRIVATE_KEY=your-private-key
BPOST_WEBHOOK_SECRET=your-webhook-secret

# Disable Admin (optionnel)
MEDUSA_DISABLE_ADMIN=false
```

---

## 🎨 Frontend (Next.js)

### Variables **OBLIGATOIRES** :

```bash
# URL du backend (remplacer par l'URL réelle de votre backend Railway)
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://votre-backend.up.railway.app

# Clé publishable (à générer depuis le backend après le premier déploiement)
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_xxxxxxxxxxxx

# URL publique du frontend
NEXT_PUBLIC_BASE_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}

# Région par défaut
NEXT_PUBLIC_DEFAULT_REGION=fr
```

### Variables **OPTIONNELLES** :

```bash
# MinIO endpoint public (si utilisé)
NEXT_PUBLIC_MINIO_ENDPOINT=votre-minio-endpoint.com
```

---

## 🔑 Comment générer les secrets

### JWT_SECRET et COOKIE_SECRET

Utilisez ces commandes pour générer des secrets sécurisés :

```bash
# Sur Linux/Mac
openssl rand -base64 32

# Sur Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Ou en ligne
# https://randomkeygen.com/
```

### NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

Cette clé doit être générée depuis le backend Medusa une fois qu'il est déployé :

1. Accédez au dashboard admin : `https://votre-backend.up.railway.app/app`
2. Allez dans **Settings** → **Publishable API Keys**
3. Créez une nouvelle clé
4. Copiez la clé et ajoutez-la aux variables d'environnement du frontend

**OU** utilisez le script backend :
```bash
# Depuis le backend
npm run ib
# La clé sera affichée dans les logs
```

---

## 🚀 Ordre de déploiement recommandé

1. **Créer le service PostgreSQL** sur Railway
2. **Déployer le Backend** avec toutes les variables obligatoires
3. **Générer la clé publishable** depuis le backend
4. **Déployer le Frontend** avec la clé publishable
5. **Configurer les DNS** et mettre à jour les CORS

---

## 🔧 Vérification

### Backend
- Healthcheck : `https://votre-backend.up.railway.app/health`
- Admin : `https://votre-backend.up.railway.app/app`

### Frontend
- Healthcheck : `https://votre-frontend.up.railway.app/api/healthcheck`
- Homepage : `https://votre-frontend.up.railway.app`

---

## ⚠️ Notes importantes

1. **DATABASE_URL** : Railway la génère automatiquement quand vous ajoutez PostgreSQL
2. **Redis** : Optionnel mais fortement recommandé pour la production
3. **CORS** : Mettez à jour après avoir obtenu les URLs définitives
4. **Secrets** : Ne jamais commiter les secrets dans git !
5. **NODE_ENV** : Automatiquement défini sur `production` par Railway

---

## 🆘 Troubleshooting

### Backend ne démarre pas
- Vérifiez que `DATABASE_URL`, `JWT_SECRET` et `COOKIE_SECRET` sont définis
- Consultez les logs Railway pour les erreurs de connexion PostgreSQL

### Frontend affiche des erreurs API
- Vérifiez que `NEXT_PUBLIC_MEDUSA_BACKEND_URL` pointe vers le bon backend
- Vérifiez que `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` est valide
- Vérifiez les paramètres CORS du backend

### Problèmes de CORS
- Ajoutez l'URL du frontend dans `STORE_CORS` et `AUTH_CORS` du backend
- Incluez http://localhost:3000 pour le développement local

