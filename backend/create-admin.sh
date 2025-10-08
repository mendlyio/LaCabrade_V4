#!/bin/bash

echo "👤 Création d'un utilisateur admin"
echo "===================================="
echo ""

# Demander les informations
read -p "Email: " EMAIL
read -sp "Password: " PASSWORD
echo ""

# Créer l'utilisateur via l'API Medusa
curl -X POST http://localhost:9000/admin/users \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }" | jq '.'

echo ""
echo "✅ Utilisateur créé!"
echo "📝 Vous pouvez maintenant vous connecter sur http://localhost:9000/app"

