# 📋 Comment Partager les Logs pour Debug

## 🎯 Méthode Simple (Recommandée)

### Étape 1: Tuer le serveur actuel en arrière-plan
```bash
cd backend
pkill -9 -f "medusa|pnpm"
```

### Étape 2: Redémarrer en mode visible (dans votre terminal)
```bash
cd backend
./start-clean.sh
```

**OU** directement :
```bash
cd backend
rm -rf .medusa/server
pnpm run build
pnpm run dev
```

### Étape 3: Importer un produit

1. Ouvrir http://localhost:9000/app
2. Aller dans **Products**
3. Widget Odoo → Rechercher (ex: "54765")
4. Cocher et cliquer **"Importer"**

### Étape 4: Copier les logs

**Dans votre terminal**, vous verrez des logs comme :
```
🔨 Création du produit: [54765] ABSORBINE LIQUID 950ML
📝 Options: [...]
📝 Variantes (1):
...
```

**Sélectionnez et copiez TOUS les logs** depuis `🔨 Création...` jusqu'à `✅ COMPLET...` ou l'erreur.

### Étape 5: Me les partager

Collez les logs dans votre prochaine réponse.

---

## 📊 Méthode Alternative: Sauvegarder dans un fichier

### Option A: Rediriger vers un fichier dès le départ
```bash
cd backend
pkill -9 -f "medusa|pnpm"
rm -rf .medusa/server
pnpm run build
pnpm run dev 2>&1 | tee import-logs.txt
```

Ensuite, importez un produit, puis :
```bash
cat import-logs.txt | grep -A 50 "🔨 Création"
```

### Option B: Capturer les logs après coup
Si le serveur tourne déjà :
```bash
cd backend
# Trouver le PID
ps aux | grep medusa

# Exemple de logs système (macOS)
log show --predicate 'process == "node"' --last 5m > system-logs.txt
```

---

## 🔍 Ce que je cherche dans les logs

### ✅ Logs de SUCCÈS complet :
```
🔨 Création du produit: [54765] ABSORBINE LIQUID 950ML
📝 Options: [{"title":"Default","values":["Default"]}]
📝 Variantes (1):
  [0] SKU: 54765, Titre: Default, Prix: 4495
🚀 Appel createProducts()...
📦 Résultat createProducts: 1 produit(s)
✅ Produit créé avec ID: prod_01K725VH914F4XF3MYMGKQN6R4
📺 Sales channel: Sera associé via l'admin
📷 Upload image vers MinIO...
🖼️ Image uploadée: https://bucket-production-de72.up.railway.app/medusa-media/odoo-product-...
📦 Stock initialisé: 54765 = 10
✅ COMPLET: [54765] ABSORBINE LIQUID 950ML
→ Images: 1
→ Variantes: 1
```

### ❌ Logs d'ERREUR :
```
❌ Produit non créé - pas d'ID retourné!
❌ Erreur upload image: Could not resolve 'minioFileProviderService'
⚠️ Erreur initialisation stock: ...
```

---

## 💡 Logs Spécifiques à Partager

### Si "Pas d'image" :
Cherchez la ligne qui commence par `📷 Upload image...` et copiez tout jusqu'à `🖼️` ou l'erreur.

### Si "Pas de prix" :
Cherchez la ligne `📝 Variantes` et vérifiez si le prix est affiché :
```
[0] SKU: 54765, Titre: Default, Prix: 4495  ← Doit être > 0
```

### Si "Pas de stock" :
Cherchez la ligne `📦 Stock initialisé` :
```
📦 Stock initialisé: 54765 = 10  ← Doit afficher la quantité
```

---

## 🆘 Problème: Je ne vois AUCUN log

Si après l'import, vous ne voyez **aucun** log commençant par 🔨 :

### Cause possible :
Le serveur tourne en arrière-plan et les logs ne s'affichent pas.

### Solution :
```bash
# 1. Tuer TOUT
cd backend
pkill -9 -f "medusa|pnpm"
lsof -ti:9000 | xargs kill -9

# 2. Vérifier que c'est mort
ps aux | grep medusa
# Ne devrait rien retourner

# 3. Redémarrer en PREMIER PLAN (pas de &)
rm -rf .medusa/server
pnpm run build
pnpm run dev
# Laissez ce terminal ouvert et visible

# 4. Importez dans le navigateur

# 5. Les logs apparaissent dans CE terminal
```

---

## ✅ Checklist avant de partager

- [ ] Le serveur tourne en PREMIER PLAN (pas en arrière-plan)
- [ ] J'ai importé un produit via l'admin web
- [ ] J'ai attendu que l'import se termine (10-30 secondes)
- [ ] J'ai copié TOUS les logs depuis `🔨` jusqu'à `✅ COMPLET` ou l'erreur
- [ ] Les logs contiennent les emojis (🔨📝🚀✅❌📷🖼️📺📦)

Si tous ces points sont ✅, partagez les logs !

---

## 🎯 Exemple de logs à me partager

Copiez quelque chose comme ça :

```
🔨 Création du produit: [54765] ABSORBINE LIQUID 950ML
📝 Options: [{"title":"Default","values":["Default"]}]
📝 Variantes (1):
  [0] SKU: 54765, Titre: Default, Prix: 4495
🚀 Appel createProducts()...
📦 Résultat createProducts: 1 produit(s)
✅ Produit créé avec ID: prod_01K725VH914F4XF3MYMGKQN6R4
📺 Sales channel: Sera associé via l'admin
📷 Upload image vers MinIO...
❌ Erreur upload image: Could not resolve 'minioFileProviderService'
    Stack: AwilixResolutionError: Could not resolve...
```

**Avec ces logs, je peux identifier le problème exact !** 🎯

