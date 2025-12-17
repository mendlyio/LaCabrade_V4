# Diagnostic Images - 404 Errors

## Étapes de diagnostic

### 1. Vérifier l'URL complète des images
Dans la console navigateur (onglet Network) :
- Filtrez par "images"
- Cliquez sur une image en erreur 404
- Copiez l'URL complète (ex: https://bucket-production-de72.up.railway.app/medusa-media/odoo/products/...)

### 2. Vérifier les variables d'environnement Railway

**Service Storefront** doit avoir :
```
NEXT_PUBLIC_MINIO_ENDPOINT=bucket-production-de72.up.railway.app
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://votre-backend.railway.app
```

**Service Backend** doit avoir :
```
MINIO_ENDPOINT=bucket-production-de72.up.railway.app
MINIO_ACCESS_KEY=votre-access-key
MINIO_SECRET_KEY=votre-secret-key
MINIO_BUCKET=medusa-media
```

### 3. Solutions possibles

#### Si les images ont des URLs invalides dans la DB :
```bash
# Réimporter les produits depuis Odoo pour régénérer les URLs
```

#### Si MinIO n'est pas accessible :
- Vérifier que le bucket Railway est actif
- Vérifier les credentials dans les variables d'env
- Tester l'accès : https://bucket-production-de72.up.railway.app/medusa-media/

#### Si le hostname n'est pas autorisé dans Next.js :
- Vérifier que le hostname est dans next.config.js remotePatterns
