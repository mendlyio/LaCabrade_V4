# ⚡ Quickstart - Développement Local avec Données Production

## 🚀 Setup en 2 minutes

### 1. Backend (Terminal 1)

```bash
cd backend
chmod +x setup-local-production.sh
./setup-local-production.sh
pnpm run dev
```

✅ Backend disponible sur : **http://localhost:9000**  
✅ Admin Panel disponible sur : **http://localhost:9000/app**

### 2. Storefront (Terminal 2)

```bash
cd storefront
chmod +x setup-local-production.sh
./setup-local-production.sh
pnpm run dev
```

✅ Storefront disponible sur : **http://localhost:8000**

---

## 🧪 Tester l'import Odoo

1. Ouvrir **http://localhost:9000/app**
2. Aller dans **Products**
3. Le widget Odoo apparaît en haut de la page
4. Rechercher un produit (ex: code "54765")
5. Cliquer sur **Importer**
6. Observer les logs détaillés dans le terminal backend

### Logs attendus :

```
🔨 Création du produit: [54765] ABSORBINE LIQUID 950ML
✅ Produit créé avec ID: prod_xxx
📺 Sales channel: Sera associé via l'admin
📷 Upload image vers MinIO...
🖼️  Image uploadée: https://bucket-production-de72.up.railway.app/...
📦 Stock initialisé: 54765 = 10
✅ COMPLET: [54765] ABSORBINE LIQUID 950ML
→ Images: 1
→ Variantes: 1
```

---

## 🎯 Ce qui fonctionne

### ✅ Import Produit Complet
- ✅ **Titre, Description, Handle, Status**
- ✅ **Image** uploadée sur MinIO production
- ✅ **Prix** en centimes (EUR)
- ✅ **Stock** depuis Odoo  
- ✅ **Variantes** avec options
- ✅ **Barcode** (code produit)
- ✅ **Poids** en grammes
- ✅ **Metadata** Odoo (ID externe, qty, etc.)

### ✅ Synchronisation Auto
- ✅ **Stock Odoo → Medusa** : Toutes les 2h
- ✅ **Produits modifiés** : Toutes les 2h
- ✅ **Commandes Medusa → Odoo** : Temps réel

### ✅ Données Production
- 🗄️ **PostgreSQL** Railway
- 🔴 **Redis** Railway
- 📦 **MinIO** Railway (images)
- 🏢 **Odoo** Production (lacabrade.dphi.be)

---

## 🛠️ Commandes Utiles

### Backend

```bash
# Démarrer en mode développement
pnpm run dev

# Build (si changements TypeScript)
pnpm run build

# Nettoyer le cache
rm -rf .medusa/server && pnpm run build

# Migrations database
pnpm run db:migrate

# Seed initial data
pnpm run seed

# Seed produit Bon Cadeau (requis pour la page /bon-cadeau)
pnpm run seed:gift-card
```

### Storefront

```bash
# Démarrer en mode développement
pnpm run dev

# Build production
pnpm run build

# Démarrer build production
pnpm start
```

---

## 🔍 Debug

### Voir les logs backend
Les logs s'affichent dans le terminal où vous avez lancé `pnpm run dev`

### Vérifier la connexion Odoo
```bash
curl http://localhost:9000/admin/odoo/status
# Réponse: {"configured":true,"ok":true}
```

### Vérifier la santé du backend
```bash
curl http://localhost:9000/health
# Réponse: {"status":"ok"}
```

### Problèmes de cache npm (lors du build)
```bash
sudo chown -R $(id -u):$(id -g) "~/.npm"
```

---

## ⚠️ ATTENTION Production

Vous travaillez sur les **vraies données de production** !

### ✅ Vous POUVEZ :
- Importer des produits Odoo
- Tester le workflow complet
- Voir les produits et commandes réels

### ❌ Ne PAS :
- Supprimer des produits/commandes réels
- Modifier des configurations critiques
- Faire des tests destructifs

### 💡 Pour tests destructifs :
Créez une copie de la base de données locale et modifiez `.env` :

```bash
# Dump production
pg_dump "postgresql://postgres:xxx@shuttle.proxy.rlwy.net:52325/railway" > backup.sql

# Créer DB locale
createdb medusa_test
psql medusa_test < backup.sql

# Modifier .env
DATABASE_URL=postgresql://localhost:5432/medusa_test
```

---

## 📚 Documentation Complète

Voir **[SETUP_LOCAL_PRODUCTION.md](./SETUP_LOCAL_PRODUCTION.md)** pour plus de détails.

---

## ✅ C'est Prêt !

Votre environnement local est maintenant connecté aux données de production Railway. Vous pouvez importer et tester les produits Odoo en temps réel ! 🎉

**Backend** : http://localhost:9000/app  
**Storefront** : http://localhost:8000

