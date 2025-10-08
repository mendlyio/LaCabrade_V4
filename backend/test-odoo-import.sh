#!/bin/bash

echo "🧪 Test de l'import Odoo local"
echo "================================"
echo ""

# Attendre que le serveur soit prêt
echo "⏳ Attente du serveur local..."
until curl -s http://localhost:9000/health > /dev/null 2>&1; do
  sleep 1
  echo "   Serveur pas encore prêt..."
done

echo "✅ Serveur prêt!"
echo ""

# Test 1: Vérifier la connexion Odoo
echo "📡 Test 1: Connexion Odoo"
curl -s http://localhost:9000/admin/odoo/status | jq '.'
echo ""

# Test 2: Lister les produits Odoo
echo "📦 Test 2: Liste des produits Odoo (limit=3)"
curl -s "http://localhost:9000/admin/odoo/products?limit=3" | jq '.products[] | {id, display_name, list_price}'
echo ""

# Test 3: Tester l'import d'un produit spécifique
echo "🔨 Test 3: Import du produit ID 19176 (ABSORBINE)"
curl -X POST http://localhost:9000/admin/odoo/sync-selected \
  -H "Content-Type: application/json" \
  -d '{"productIds": ["19176"]}' | jq '.'
echo ""

echo "✅ Tests terminés!"
echo ""
echo "📊 Pour voir les logs détaillés:"
echo "   tail -f dev.log"

