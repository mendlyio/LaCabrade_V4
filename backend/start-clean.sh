#!/bin/bash

echo "🧹 ======================================"
echo "   NETTOYAGE ET DÉMARRAGE PROPRE"
echo "======================================"
echo ""

# 1. Tuer TOUS les processus Node/Medusa/pnpm
echo "🔪 Étape 1: Arrêt de tous les processus..."
pkill -9 -f "medusa" 2>/dev/null
pkill -9 -f "pnpm" 2>/dev/null
pkill -9 -f "node.*9000" 2>/dev/null
lsof -ti:9000 | xargs kill -9 2>/dev/null
sleep 2
echo "   ✅ Processus arrêtés"
echo ""

# 2. Nettoyer le cache
echo "🧹 Étape 2: Nettoyage du cache..."
rm -rf .medusa/server
rm -f dev.log
echo "   ✅ Cache nettoyé"
echo ""

# 3. Vérifier le port
echo "🔍 Étape 3: Vérification du port 9000..."
if lsof -Pi :9000 -sTCP:LISTEN -t >/dev/null ; then
    echo "   ⚠️  Port 9000 encore occupé, force kill..."
    lsof -ti:9000 | xargs kill -9
    sleep 1
fi
echo "   ✅ Port 9000 libre"
echo ""

# 4. Build
echo "🏗️  Étape 4: Build du projet..."
pnpm run build 2>&1 | grep -E "(error|success|info:.*completed)"
if [ $? -ne 0 ]; then
    echo "   ❌ Build échoué!"
    exit 1
fi
echo "   ✅ Build réussi"
echo ""

# 5. Démarrer le serveur
echo "🚀 Étape 5: Démarrage du serveur..."
echo "   📊 Logs disponibles ci-dessous..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  LOGS EN TEMPS RÉEL (Ctrl+C pour arrêter)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Démarrer avec tous les logs visibles
pnpm run dev 2>&1 | grep -E "(info:|error|warn|🔨|📝|🚀|📦|✅|❌|📷|🖼️|📺|Creating server|Server is ready|Gracefully|EADDR)"

