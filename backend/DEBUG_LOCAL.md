# 🐛 Guide de Debug Local - Import Odoo

## 🚀 Démarrage Propre

### Script automatique (recommandé)
```bash
cd backend
chmod +x start-clean.sh
./start-clean.sh
```

Ce script fait :
1. ✅ Tue tous les processus en conflit
2. ✅ Nettoie le cache (`.medusa/server`)
3. ✅ Vérifie que le port 9000 est libre
4. ✅ Build le projet
5. ✅ Démarre avec logs filtrés et lisibles

### Démarrage manuel
```bash
# 1. Nettoyer
pkill -9 -f "medusa|pnpm"
lsof -ti:9000 | xargs kill -9
rm -rf .medusa/server

# 2. Build
pnpm run build

# 3. Démarrer
pnpm run dev
```

---

## 🧪 Tester l'Import Odoo

### 1. Ouvrir l'admin
http://localhost:9000/app

### 2. Se connecter
- Email: votre email admin
- Password: votre mot de passe

### 3. Aller dans Products
Menu de gauche → **Products**

### 4. Widget Odoo
En haut de la page, vous verrez le widget avec :
- 🔍 Champ de recherche (code postal ou nom)
- 📋 Liste des produits Odoo
- ☑️ Cases à cocher pour sélection
- 🔘 Bouton "Importer les produits sélectionnés"

### 5. Importer un produit
1. Rechercher (ex: "54765" ou "ABSORBINE")
2. Cocher un produit
3. Cliquer "Importer"
4. Observer les logs dans votre terminal

---

## 📊 Logs à Observer

### Logs attendus (SUCCÈS complet) :

```
🔨 Création du produit: [54765] ABSORBINE LIQUID 950ML

📝 Options: [
  {
    "title": "Default",
    "values": ["Default"]
  }
]

📝 Variantes (1):
  [0] SKU: 54765, Titre: Default, Prix: 4495

🚀 Appel createProducts()...
📦 Résultat createProducts: 1 produit(s)
✅ Produit créé avec ID: prod_01XXXXX

📺 Sales channel: Sera associé via l'admin ou API séparée

📷 Upload image vers MinIO...
🖼️ Image uploadée: https://bucket-production-de72.up.railway.app/medusa-media/odoo-product-...

📦 Stock initialisé: 54765 = 10

✅ COMPLET: [54765] ABSORBINE LIQUID 950ML
→ Images: 1
→ Variantes: 1
```

### Logs en cas d'ERREUR :

```
❌ Produit non créé - pas d'ID retourné!
❌ Erreur upload image: Could not resolve 'minioFileProviderService'
⚠️  Erreur initialisation stock: ...
```

---

## 🔍 Vérifications après Import

### 1. Dans l'Admin Medusa
Aller dans **Products** → Voir le produit importé

**Vérifier :**
- ✅ Titre et description présents
- ✅ Image affichée (miniature)
- ✅ Prix affiché (ex: 44,95 €)
- ✅ Stock disponible (ex: "10 en stock")

### 2. Cliquer sur le produit

**Onglet "General" :**
- ✅ Titre, Description, Handle
- ✅ Thumbnail image visible

**Onglet "Variants" :**
- ✅ Au moins 1 variante
- ✅ SKU (ex: "54765")
- ✅ Prix en EUR
- ✅ Manage inventory: ON
- ✅ Barcode si disponible

**Onglet "Media" :**
- ✅ Au moins 1 image
- ✅ URL MinIO visible : `https://bucket-production-de72.up.railway.app/medusa-media/...`

**Onglet "Inventory" :**
- ✅ Quantité disponible (ex: 10)
- ✅ Location par défaut

---

## 🐛 Problèmes Courants

### Problème 1: Port 9000 occupé
```
Error: listen EADDRINUSE: address already in use :::9000
```

**Solution :**
```bash
lsof -ti:9000 | xargs kill -9
# Puis redémarrer
pnpm run dev
```

### Problème 2: Redis connection closed
```
Error: Connection is closed
```

**Solution :**
```bash
# Vérifier que Redis Railway est accessible
redis-cli -h shortline.proxy.rlwy.net -p 29025 -a spKkjOCiIokrSEKddOQMOWJXKGpcCRrh ping
# Devrait retourner: PONG
```

### Problème 3: Image non uploadée
```
❌ Erreur upload image: Could not resolve 'minioFileProviderService'
```

**Solution :**
Le provider MinIO n'est pas résolu correctement. Vérifier :
1. `.env` contient `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`
2. Build récent : `rm -rf .medusa/server && pnpm run build`

### Problème 4: Pas de prix
```
✅ Produit créé mais prix à 0 ou non défini
```

**Cause :** Les prix ne sont pas passés correctement lors de `createProducts()`

**Vérifier dans les logs :**
```
📝 Variantes (1):
  [0] SKU: 54765, Titre: Default, Prix: 4495  ← Le prix doit être là
```

Si le prix est `N/A` ou `0`, le problème vient de la transformation Odoo → Medusa.

### Problème 5: Pas de stock
```
⚠️ Erreur initialisation stock
```

**Cause :** L'inventory item n'est pas créé automatiquement

**Solution :** Le stock est initialisé APRÈS la création du produit. Si erreur, vérifier que :
- `manage_inventory: true` est défini sur la variante
- Le SKU est unique
- Le stock location par défaut existe

---

## 🔬 Debug Avancé

### Voir TOUS les logs (sans filtre)
```bash
pnpm run dev 2>&1 | tee full-logs.txt
```

### Tester la connexion Odoo
```bash
curl http://localhost:9000/admin/odoo/status
```

Devrait retourner :
```json
{
  "configured": true,
  "ok": true
}
```

### Tester l'upload MinIO manuellement
```bash
node -e "
const minio = require('minio');
const client = new minio.Client({
  endPoint: 'bucket-production-de72.up.railway.app',
  port: 443,
  useSSL: true,
  accessKey: 'jrkw3qd9t17ftl',
  secretKey: '9lmslk6nfmjhaph24v5qov71u43doz8x'
});
client.listBuckets((err, buckets) => {
  if (err) console.error('❌', err);
  else console.log('✅ MinIO OK:', buckets);
});
"
```

### Inspecter la base de données
```bash
# Connexion à PostgreSQL production
psql "postgresql://postgres:YIKujyFPHKidnMJIKJpXVpwyvRYCxCVV@shuttle.proxy.rlwy.net:52325/railway"

# Voir les produits récemment créés
SELECT id, title, created_at FROM product ORDER BY created_at DESC LIMIT 5;

# Voir les variantes d'un produit
SELECT v.id, v.title, v.sku, p.amount, p.currency_code 
FROM product_variant v
LEFT JOIN price p ON p.variant_id = v.id
WHERE v.product_id = 'prod_XXXXX';

# Voir le stock
SELECT il.stocked_quantity, sl.name as location
FROM inventory_level il
JOIN stock_location sl ON sl.id = il.location_id
WHERE il.inventory_item_id IN (
  SELECT id FROM inventory_item WHERE sku = '54765'
);
```

---

## ✅ Checklist de Vérification

Avant de dire que "ça marche pas" :

- [ ] Le serveur démarre sans erreur `EADDRINUSE`
- [ ] Le log montre `Server is ready on port 9000`
- [ ] L'admin est accessible : http://localhost:9000/app
- [ ] Le widget Odoo est visible dans Products
- [ ] La recherche Odoo fonctionne (retourne des produits)
- [ ] Lors de l'import, les logs détaillés apparaissent
- [ ] Le log montre `✅ Produit créé avec ID: prod_xxx`
- [ ] Le log montre `🖼️ Image uploadée: https://...`
- [ ] Le log montre `📦 Stock initialisé: XXX = Y`
- [ ] Le produit apparaît dans la liste Products de Medusa
- [ ] En cliquant sur le produit, l'image est visible
- [ ] Le prix est affiché (pas 0 €)
- [ ] Le stock est affiché (pas "N/A")

Si TOUS ces points sont ✅, alors **ça marche** ! 🎉

---

## 🆘 Besoin d'aide ?

Si après avoir suivi ce guide, l'import ne fonctionne toujours pas correctement :

1. **Copier TOUS les logs** depuis le démarrage jusqu'à l'erreur
2. **Indiquer précisément** ce qui ne fonctionne pas :
   - Pas d'image ?
   - Pas de prix ?
   - Pas de stock ?
   - Produit pas créé du tout ?
3. **Partager une capture d'écran** du produit dans l'admin

Cela permettra de diagnostiquer le problème exact.

