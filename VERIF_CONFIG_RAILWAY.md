# 🔍 Vérification Configuration Railway

## Problème : Module Odoo ne détecte plus les produits + Images ne s'affichent plus

### ✅ Variables d'environnement à vérifier sur Railway

#### 1. Module Odoo (Backend)

Le module Odoo ne se charge **QUE** si **TOUTES** ces variables sont définies :

```
ODOO_URL=https://votre-instance.odoo.com
ODOO_DB_NAME=votre_base_de_donnees  
ODOO_USERNAME=votre_email@exemple.com
ODOO_API_KEY=votre_cle_api_odoo
```

**Comment vérifier :**
1. Allez sur Railway → Service Backend → Variables
2. Vérifiez que ces 4 variables existent et ont des valeurs
3. Si une seule manque, le module ne se chargera pas

#### 2. MinIO / Images (Backend)

Les images ne s'affichent **QUE** si ces variables sont définies :

```
MINIO_ENDPOINT=bucket-production-de72.up.railway.app
MINIO_ACCESS_KEY=jrkw3qd9t17ftl
MINIO_SECRET_KEY=9lmslk6nfmjhaph24v5qov71u43doz8x
MINIO_BUCKET=medusa-media
```

**⚠️ IMPORTANT** : Le code a des valeurs par défaut hardcodées qui sont probablement obsolètes. Il faut définir les variables explicitement.

---

## 🛠️ Comment corriger

### Option 1 : Vérifier les variables Railway

1. **Backend** :
   - Railway → Backend Service → Variables tab
   - Ajoutez les variables manquantes
   - Redéployez le backend

2. **Vérifier les logs** après redéploiement :
   ```
   # Vous devriez voir ces lignes au démarrage :
   "modules": [
     ...
     {
       "key": "odoo",
       "resolve": "./src/modules/odoo",
       ...
     }
   ]
   ```

### Option 2 : Supprimer les valeurs hardcodées

Le fichier `backend/src/workflows/sync-from-erp.ts` ligne 406-412 a des valeurs par défaut :

```typescript
const rawEndpoint = process.env.MINIO_ENDPOINT || 'bucket-production-de72.up.railway.app'
const client = new Client({
    endPoint: endpoint,
    port: 443, useSSL: true,
    accessKey: process.env.MINIO_ACCESS_KEY || 'jrkw3qd9t17ftl',
    secretKey: process.env.MINIO_SECRET_KEY || '9lmslk6nfmjhaph24v5qov71u43doz8x'
})
```

**Solution** : Définir explicitement les variables sur Railway au lieu de compter sur les valeurs par défaut.

---

## 🧪 Test de connexion Odoo

Une fois les variables définies, testez :

1. Allez dans le backoffice Medusa
2. Menu "Odoo" dans la sidebar
3. Vous devriez voir la liste des produits Odoo

Si vide ou erreur → Les variables Odoo ne sont pas bonnes.

---

## 🖼️ Test des images

1. Importez un produit depuis Odoo
2. L'image devrait s'afficher dans :
   - Backoffice Medusa (liste produits)
   - Frontend (page produit)

Si l'image ne s'affiche pas → Les variables MinIO sont incorrectes ou le bucket n'est pas accessible.

---

## 🔄 Ordre de résolution

1. ✅ Vérifier que TOUTES les variables Odoo sont définies
2. ✅ Vérifier que TOUTES les variables MinIO sont définies  
3. ✅ Redéployer le backend
4. ✅ Tester l'import Odoo dans le backoffice
5. ✅ Vérifier les logs Railway pour les erreurs

---

## 📝 Variables complètes à avoir

Voici la liste complète des variables que le backend attend :

```env
# Base de données (requis)
DATABASE_URL=postgresql://...

# Secrets (requis)
JWT_SECRET=...
COOKIE_SECRET=...

# Odoo (optionnel mais requis pour le module)
ODOO_URL=https://...
ODOO_DB_NAME=...
ODOO_USERNAME=...
ODOO_API_KEY=...

# MinIO (optionnel mais requis pour les images)
MINIO_ENDPOINT=...
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
MINIO_BUCKET=medusa-media

# Stripe (optionnel)
STRIPE_API_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Email (optionnel)
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...

# Redis (optionnel mais recommandé)
REDIS_URL=...
```

