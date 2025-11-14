#!/bin/bash

# Script de démarrage pour La Cabrade V4
# Démarre le backend Medusa et le storefront Next.js

echo "🚀 Démarrage de La Cabrade V4..."
echo ""

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vérifier si les node_modules existent
if [ ! -d "backend/node_modules" ]; then
    echo "${YELLOW}⚠️  Installation des dépendances backend...${NC}"
    cd backend && npm install && cd ..
fi

if [ ! -d "storefront/node_modules" ]; then
    echo "${YELLOW}⚠️  Installation des dépendances storefront...${NC}"
    cd storefront && npm install && cd ..
fi

# Nettoyer les anciens processus sur les ports 9000 et 3000
echo "${BLUE}🧹 Nettoyage des ports 9000 et 3000...${NC}"
lsof -ti:9000 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null

echo ""
echo "${GREEN}✅ Démarrage du backend Medusa (port 9000)...${NC}"
cd backend
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
cd ..

# Attendre que le backend soit prêt
echo "${BLUE}⏳ Attente du backend (15 secondes)...${NC}"
sleep 15

echo ""
echo "${GREEN}✅ Démarrage du storefront Next.js (port 3000)...${NC}"
cd storefront
npm run dev > ../storefront.log 2>&1 &
STOREFRONT_PID=$!
echo "   Storefront PID: $STOREFRONT_PID"
cd ..

# Attendre que le storefront soit prêt
echo "${BLUE}⏳ Attente du storefront (10 secondes)...${NC}"
sleep 10

echo ""
echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${GREEN}🎉 La Cabrade V4 est prêt !${NC}"
echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📦 Backend Medusa:     ${BLUE}http://localhost:9000${NC}"
echo "🔐 Admin Medusa:       ${BLUE}http://localhost:9000/app${NC}"
echo "🛍️  Storefront:         ${BLUE}http://localhost:3000${NC}"
echo ""
echo "📝 Logs:"
echo "   Backend:   tail -f backend.log"
echo "   Storefront: tail -f storefront.log"
echo ""
echo "🛑 Pour arrêter:"
echo "   kill $BACKEND_PID $STOREFRONT_PID"
echo "   ou appuyer sur Ctrl+C dans les deux terminaux"
echo ""
echo "${YELLOW}💡 Astuce: Ouvrez http://localhost:3000 dans votre navigateur${NC}"
echo ""

