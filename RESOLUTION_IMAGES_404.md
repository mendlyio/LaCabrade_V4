# Résolution du problème d'images 404

## Problème identifié

Les images retournent "Access Denied" car le bucket MinIO n'autorise pas l'accès public en lecture.

**URL d'erreur** : `https://bucket-production-de72.up.railway.app/medusa-media/...`
**Erreur** : `<Code>AccessDenied</Code>`

## Solution

### Étape 1 : Configurer le bucket MinIO pour l'accès public

```bash
cd backend
npm run minio:setup
```

Ce script va :
- ✅ Vérifier que le bucket existe
- ✅ Configurer une policy publique pour autoriser la lecture
- ✅ Permettre l'accès aux images sans authentification

### Étape 2 : Vérifier la configuration

Après avoir exécuté le script, testez l'accès au bucket :
```
https://bucket-production-de72.up.railway.app/medusa-media/
```

Vous devriez voir une liste XML au lieu de "Access Denied".

### Étape 3 : Re-déployer sur Railway

Les images existantes devraient maintenant être accessibles !

## Alternative : Réimporter les produits

Si le problème persiste, réimportez les produits depuis Odoo :
1. Backoffice Medusa → Odoo
2. Sélectionnez les produits
3. Cliquez sur "Resynchroniser"

Les images seront ré-uploadées avec les bonnes permissions.

## Variables d'environnement requises

**Backend Railway** :
```env
MINIO_ENDPOINT=bucket-production-de72.up.railway.app
MINIO_ACCESS_KEY=votre_access_key
MINIO_SECRET_KEY=votre_secret_key
MINIO_BUCKET=medusa-media
```

**Storefront Railway** :
```env
NEXT_PUBLIC_MINIO_ENDPOINT=bucket-production-de72.up.railway.app
```

## Logs utiles

Pour vérifier que les images sont uploadées correctement, regardez les logs backend lors de l'import :
```
📷 [WORKFLOW] Image uploadée: https://bucket-production-de72.up.railway.app/...
```

