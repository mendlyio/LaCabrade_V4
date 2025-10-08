#!/bin/bash

# ============================================
# Script de configuration locale avec données de production Railway
# ============================================

echo "🚀 Configuration de l'environnement local avec données de production Railway..."

# Créer le fichier .env
cat > .env << 'EOF'
# ===========================================
# MEDUSA CONFIGURATION - PRODUCTION RAILWAY
# ===========================================

# Base de données PostgreSQL (Railway Production)
DATABASE_URL=postgresql://postgres:YIKujyFPHKidnMJIKJpXVpwyvRYCxCVV@shuttle.proxy.rlwy.net:52325/railway

# Redis (Railway Production)
REDIS_URL=redis://default:spKkjOCiIokrSEKddOQMOWJXKGpcCRrh@shortline.proxy.rlwy.net:29025

# Secrets JWT et Cookies (Production)
JWT_SECRET=shl360wn4c77k4qb7bkagiwi1tficdah
COOKIE_SECRET=ouqwemjikp1zow69r79d17aemdxzibqr

# URL Backend (Local pour développement)
BACKEND_PUBLIC_URL=http://localhost:9000

# CORS Configuration (Local + Production)
ADMIN_CORS=http://localhost:7001,http://localhost:9000,https://backend-production-7bbb.up.railway.app
AUTH_CORS=http://localhost:7001,http://localhost:9000,https://backend-production-7bbb.up.railway.app
STORE_CORS=http://localhost:8000,https://storefront-production-03a4.up.railway.app

# Worker Mode
MEDUSA_WORKER_MODE=shared

# ===========================================
# MINIO FILE STORAGE (Railway Production)
# ===========================================

MINIO_ENDPOINT=bucket-production-de72.up.railway.app
MINIO_ACCESS_KEY=jrkw3qd9t17ftl
MINIO_SECRET_KEY=9lmslk6nfmjhaph24v5qov71u43doz8x
MINIO_BUCKET=medusa-media

# ===========================================
# ODOO ERP INTEGRATION (Production)
# ===========================================

ODOO_URL=https://lacabrade.dphi.be
ODOO_DB_NAME=lacabrade
ODOO_USERNAME=admin
ODOO_API_KEY=1ff858128e30962da1e4af9b3aa8122915c5002c

# ===========================================
# BPOST SHIPPING (if configured)
# ===========================================

# BPOST_PUBLIC_KEY=your_bpost_public_key
# BPOST_PRIVATE_KEY=your_bpost_private_key
# BPOST_WEBHOOK_SECRET=your_webhook_secret

# ===========================================
# EMAIL NOTIFICATIONS (if configured)
# ===========================================

# RESEND_API_KEY=your_resend_api_key
# RESEND_FROM_EMAIL=noreply@yourdomain.com

# ===========================================
# MEILISEARCH (if configured)
# ===========================================

# MEILISEARCH_HOST=http://localhost:7700
# MEILISEARCH_ADMIN_KEY=your_admin_key

# ===========================================
# STRIPE PAYMENT (if configured)
# ===========================================

# STRIPE_API_KEY=sk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_...
EOF

echo "✅ Fichier .env créé avec succès!"
echo ""
echo "📦 Installation des dépendances..."
pnpm install

echo ""
echo "🏗️  Build du projet..."
pnpm run build

echo ""
echo "✅ Configuration terminée!"
echo ""
echo "🚀 Pour démarrer le serveur local avec les données de production:"
echo "   cd backend"
echo "   pnpm run dev"
echo ""
echo "🔗 URLs:"
echo "   Backend API:  http://localhost:9000"
echo "   Admin Panel:  http://localhost:9000/app"
echo ""
echo "⚠️  ATTENTION: Vous travaillez sur la BASE DE DONNÉES DE PRODUCTION!"
echo "   Faites attention aux modifications que vous effectuez."
echo ""

