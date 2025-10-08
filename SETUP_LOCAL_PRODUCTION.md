# 🚀 Configuration Locale avec Données de Production Railway

Ce guide vous permet de travailler en **local** avec les **vraies données de production** de Railway.

## ⚡ Setup Rapide (1 commande)

### Backend

```bash
cd backend
chmod +x setup-local-production.sh
./setup-local-production.sh
pnpm run dev
```

✅ Le backend local sera connecté à :
- 🗄️ **PostgreSQL Production** (Railway)
- 🔴 **Redis Production** (Railway)
- 📦 **MinIO Production** (Railway)
- 🏢 **Odoo Production** (lacabrade.dphi.be)

### Storefront

```bash
cd storefront
chmod +x setup-local-production.sh
./setup-local-production.sh
pnpm run dev
```

✅ Le storefront local sera connecté à votre backend local.

---

## 🔗 URLs Locales

| Service | URL | Description |
|---------|-----|-------------|
| **Backend API** | http://localhost:9000 | API Medusa |
| **Admin Panel** | http://localhost:9000/app | Interface d'administration |
| **Storefront** | http://localhost:8000 | Site e-commerce |

---

## 🗄️ Connexions Production

Votre environnement local sera connecté aux services de production Railway :

### PostgreSQL (Base de données)
```
Host: shuttle.proxy.rlwy.net:52325
Database: railway
User: postgres
```

### Redis (Cache & Queues)
```
Host: shortline.proxy.rlwy.net:29025
```

### MinIO (Stockage fichiers/images)
```
Endpoint: bucket-production-de72.up.railway.app
Bucket: medusa-media
```

### Odoo (ERP)
```
URL: https://lacabrade.dphi.be
Database: lacabrade
```

---

## ⚠️ IMPORTANT - Sécurité

### ⚡ Vous travaillez sur la PRODUCTION !

- ✅ **Vous pouvez** : Tester les imports Odoo, voir les vrais produits
- ✅ **Vous pouvez** : Tester le workflow complet
- ⚠️ **ATTENTION** : Les modifications sont réelles et visibles en production
- ❌ **NE PAS** : Supprimer des produits ou commandes réelles
- ❌ **NE PAS** : Modifier les configurations critiques

### 💡 Recommandation

Pour des tests destructifs, créez une copie de la base de données :

```bash
# Dumper la base de production
pg_dump postgresql://postgres:YIKujyFPHKidnMJIKJpXVpwyvRYCxCVV@shuttle.proxy.rlwy.net:52325/railway > backup.sql

# Créer une base locale de test
createdb medusa_test
psql medusa_test < backup.sql

# Modifier .env pour pointer vers la base locale
DATABASE_URL=postgresql://localhost:5432/medusa_test
```

---

## 🐛 Debug & Logs

### Voir les logs du backend
```bash
cd backend
pnpm run dev
```

### Voir les logs du storefront
```bash
cd storefront  
pnpm run dev
```

### Nettoyer le cache Medusa
```bash
cd backend
rm -rf .medusa/server
pnpm run build
```

---

## 📦 Tester l'Import Odoo en Local

Une fois le backend démarré :

1. Aller sur http://localhost:9000/app
2. Naviguer vers **Settings** > **Odoo**
3. Vérifier le statut de connexion (doit être ✅ Connecté)
4. Aller sur **Products** pour voir le widget Odoo
5. Rechercher un produit Odoo
6. Cliquer sur **Importer** pour tester le workflow complet

Vous verrez les logs détaillés en temps réel dans votre terminal ! 🎉

---

## 🔄 Synchronisation Continue

Le système synchronise automatiquement :

- ✅ **Stock** : Toutes les 2 heures (Odoo → Medusa)
- ✅ **Produits modifiés** : Toutes les 2 heures (Odoo → Medusa)
- ✅ **Commandes** : En temps réel (Medusa → Odoo)

---

## 🛠️ Configuration Manuelle (Alternative)

Si vous préférez configurer manuellement :

### Backend `.env`

Créer `backend/.env` avec :

```env
DATABASE_URL=postgresql://postgres:YIKujyFPHKidnMJIKJpXVpwyvRYCxCVV@shuttle.proxy.rlwy.net:52325/railway
REDIS_URL=redis://default:spKkjOCiIokrSEKddOQMOWJXKGpcCRrh@shortline.proxy.rlwy.net:29025
JWT_SECRET=shl360wn4c77k4qb7bkagiwi1tficdah
COOKIE_SECRET=ouqwemjikp1zow69r79d17aemdxzibqr
BACKEND_PUBLIC_URL=http://localhost:9000

MINIO_ENDPOINT=bucket-production-de72.up.railway.app
MINIO_ACCESS_KEY=jrkw3qd9t17ftl
MINIO_SECRET_KEY=9lmslk6nfmjhaph24v5qov71u43doz8x
MINIO_BUCKET=medusa-media

ODOO_URL=https://lacabrade.dphi.be
ODOO_DB_NAME=lacabrade
ODOO_USERNAME=admin
ODOO_API_KEY=1ff858128e30962da1e4af9b3aa8122915c5002c

ADMIN_CORS=http://localhost:7001,http://localhost:9000
AUTH_CORS=http://localhost:7001,http://localhost:9000
STORE_CORS=http://localhost:8000
```

### Storefront `.env.local`

Créer `storefront/.env.local` avec :

```env
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_BASE_URL=http://localhost:8000
```

---

## ✅ Vérification

Pour vérifier que tout fonctionne :

### 1. Backend
```bash
curl http://localhost:9000/health
# Devrait retourner: {"status":"ok"}
```

### 2. Admin Panel
Ouvrir http://localhost:9000/app dans votre navigateur.

### 3. Odoo Connection
```bash
curl http://localhost:9000/admin/odoo/status
# Devrait retourner: {"configured":true,"ok":true}
```

### 4. Storefront
Ouvrir http://localhost:8000 dans votre navigateur.

---

## 🚀 Ready to Go!

Vous êtes maintenant prêt à développer en local avec les vraies données de production ! 🎉

Pour toute question, vérifiez les logs du terminal où tourne le serveur.

