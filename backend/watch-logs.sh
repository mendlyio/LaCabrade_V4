#!/bin/bash

echo "📊 ======================================"
echo "   CAPTURE DES LOGS EN TEMPS RÉEL"
echo "======================================"
echo ""
echo "🔍 Recherche du processus Medusa..."

# Trouver le PID du processus medusa
MEDUSA_PID=$(ps aux | grep "medusa.*start" | grep -v grep | awk '{print $2}' | head -1)

if [ -z "$MEDUSA_PID" ]; then
    echo "❌ Aucun processus Medusa trouvé!"
    echo "💡 Lancez d'abord: ./start-clean.sh"
    exit 1
fi

echo "✅ Processus Medusa trouvé: PID $MEDUSA_PID"
echo ""
echo "📝 Création du fichier de logs: live-logs.txt"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  LOGS EN DIRECT (Ctrl+C pour arrêter)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Dans un autre terminal, lancez:"
echo "   tail -f backend/live-logs.txt"
echo ""
echo "🎯 Maintenant, importez un produit via l'admin:"
echo "   http://localhost:9000/app"
echo ""

# Capturer les logs et les afficher + sauvegarder
tail -f /proc/$MEDUSA_PID/fd/1 2>/dev/null || \
strace -e write -s 10000 -p $MEDUSA_PID 2>&1 | \
  grep -E "(write|🔨|📝|🚀|📦|✅|❌|📷|🖼️|📺|Création|Options|Variantes|createProducts|Image|Stock|COMPLET)" | \
  tee live-logs.txt

