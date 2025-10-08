#!/bin/bash

# ============================================
# Script de configuration storefront local avec backend de production
# ============================================

echo "🚀 Configuration du storefront local avec backend de production Railway..."

# Créer le fichier .env.local
cat > .env.local << 'EOF'
# ===========================================
# STOREFRONT CONFIGURATION - LOCAL DEV
# ===========================================

# Backend API URL (peut être local OU production)
# Pour utiliser le backend local: http://localhost:9000
# Pour utiliser le backend prod: https://backend-production-7bbb.up.railway.app
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000

# Base URL du storefront
NEXT_PUBLIC_BASE_URL=http://localhost:8000

# ===========================================
# OPTIONAL: MEILISEARCH
# ===========================================

# NEXT_PUBLIC_SEARCH_ENDPOINT=http://localhost:7700
# NEXT_PUBLIC_SEARCH_API_KEY=your_search_api_key
# NEXT_PUBLIC_INDEX_NAME=products
EOF

echo "✅ Fichier .env.local créé avec succès!"
echo ""
echo "📦 Installation des dépendances..."
pnpm install

echo ""
echo "✅ Configuration terminée!"
echo ""
echo "🚀 Pour démarrer le storefront local:"
echo "   cd storefront"
echo "   pnpm run dev"
echo ""
echo "🔗 URLs:"
echo "   Storefront:   http://localhost:8000"
echo "   Backend API:  http://localhost:9000"
echo ""
echo "💡 TIP: Vous pouvez changer NEXT_PUBLIC_MEDUSA_BACKEND_URL dans .env.local"
echo "   pour pointer vers le backend de production si besoin."
echo ""

