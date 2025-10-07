# 📝 Changelog - Intégration Odoo

## 🎯 Résumé des modifications

Ce document liste tous les fichiers créés et modifiés pour l'intégration Odoo.

## ✨ Nouveaux fichiers créés

### Module Odoo
```
backend/src/modules/odoo/
├── index.ts                    # Point d'entrée du module Odoo
├── service.ts                  # Service avec méthodes de connexion à Odoo
└── README.md                   # Documentation technique du module
```

**Fonctionnalités** :
- Connexion à l'API Odoo via JSON-RPC
- Authentification automatique
- Récupération des produits avec pagination
- Support des variantes de produits
- Gestion des attributs et options

### Workflow de synchronisation
```
backend/src/workflows/
└── sync-from-erp.ts           # Workflow de synchronisation Odoo → Medusa
```

**Fonctionnalités** :
- Récupération des produits depuis Odoo
- Comparaison avec les produits existants dans Medusa
- Création des nouveaux produits
- Mise à jour des produits existants
- Support des variantes et options
- Prévention des doublons via `external_id`

### Job planifié
```
backend/src/jobs/
└── sync-products-from-erp.ts  # Job exécuté quotidiennement à minuit
```

**Fonctionnalités** :
- Synchronisation automatique selon le cron configuré
- Pagination automatique pour gérer de gros catalogues
- Logs détaillés avec emojis pour faciliter le suivi
- Gestion des erreurs

### Documentation
```
backend/
├── ODOO_SETUP.md              # Guide de configuration complet
├── README_ODOO.md             # Documentation générale de l'intégration
└── CHANGELOG_ODOO.md          # Ce fichier
```

## 🔧 Fichiers modifiés

### 1. `backend/package.json`
**Ajout de la dépendance JSON-RPC** :
```json
{
  "dependencies": {
    "json-rpc-2.0": "^1.7.0"
  }
}
```

### 2. `backend/src/lib/constants.ts`
**Ajout des constantes Odoo** :
```typescript
export const ODOO_URL = process.env.ODOO_URL;
export const ODOO_DB_NAME = process.env.ODOO_DB_NAME;
export const ODOO_USERNAME = process.env.ODOO_USERNAME;
export const ODOO_API_KEY = process.env.ODOO_API_KEY;
```

### 3. `backend/medusa-config.js`
**Configuration du module Odoo** :
```javascript
import {
  // ... autres imports
  ODOO_URL,
  ODOO_DB_NAME,
  ODOO_USERNAME,
  ODOO_API_KEY
} from 'lib/constants';

// Dans modules:
...(ODOO_URL && ODOO_DB_NAME && ODOO_USERNAME && ODOO_API_KEY ? [{
  resolve: './src/modules/odoo',
  options: {
    url: ODOO_URL,
    dbName: ODOO_DB_NAME,
    username: ODOO_USERNAME,
    apiKey: ODOO_API_KEY
  }
}] : [])
```

## 🚀 Variables d'environnement à ajouter sur Railway

Pour activer l'intégration, ajoutez ces 4 variables dans Railway :

| Variable | Description | Exemple |
|----------|-------------|---------|
| `ODOO_URL` | URL de l'instance Odoo | `https://mycompany.odoo.com` |
| `ODOO_DB_NAME` | Nom de la base de données | `mycompany_prod` |
| `ODOO_USERNAME` | Email de connexion Odoo | `admin@mycompany.com` |
| `ODOO_API_KEY` | Clé API Odoo | `abc123xyz...` |

## 📊 Architecture de l'intégration

```
┌─────────────────┐
│   Odoo ERP      │
│   (Produits)    │
└────────┬────────┘
         │
         │ JSON-RPC API
         │
         ▼
┌─────────────────────────────┐
│  Module Odoo                │
│  (service.ts)               │
│  - Connexion                │
│  - Authentification         │
│  - Récupération produits    │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Workflow                   │
│  (sync-from-erp.ts)         │
│  - Comparaison              │
│  - Transformation           │
│  - Création/Mise à jour     │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Job Planifié               │
│  (sync-products-from-erp.ts)│
│  - Cron: 0 0 * * *          │
│  - Pagination               │
│  - Logs                     │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Medusa Backend             │
│  (Produits synchronisés)    │
└─────────────────────────────┘
```

## 🔍 Flux de données

### 1. Authentification
```
1. Le service Odoo se connecte via JSON-RPC
2. Envoie credentials (DB, Username, API Key)
3. Reçoit un UID d'authentification
4. Utilise cet UID pour toutes les requêtes suivantes
```

### 2. Récupération des produits
```
1. Job planifié démarre (cron)
2. Appelle le workflow avec pagination
3. Workflow appelle le service Odoo
4. Service récupère les produits depuis Odoo
   - Liste des IDs de produits
   - Détails de chaque produit
   - Variantes (si applicable)
   - Attributs et options
```

### 3. Traitement
```
1. Workflow récupère les produits existants dans Medusa
2. Compare via external_id
3. Identifie :
   - Nouveaux produits à créer
   - Produits existants à mettre à jour
```

### 4. Synchronisation
```
1. Crée les nouveaux produits via createProductsWorkflow
2. Met à jour les existants via updateProductsWorkflow
3. Gère les variantes et options automatiquement
4. Logs des résultats
```

## 📋 Checklist de déploiement

### Avant le déploiement

- [ ] Le code a été téléchargé depuis Git
- [ ] Les fichiers du module Odoo sont présents
- [ ] Le workflow est créé
- [ ] Le job planifié est créé
- [ ] Les configurations sont mises à jour

### Sur Railway

- [ ] Créer les 4 variables d'environnement Odoo
- [ ] Déployer le backend
- [ ] Vérifier que le déploiement réussit
- [ ] Vérifier les logs au démarrage
- [ ] Attendre la première synchronisation (minuit)

### Après le déploiement

- [ ] Vérifier les logs de synchronisation
- [ ] Vérifier les produits dans l'admin Medusa
- [ ] Confirmer qu'il n'y a pas de doublons
- [ ] Tester quelques produits en détail
- [ ] Configurer la fréquence de synchronisation selon vos besoins

## 🧪 Tests recommandés

### 1. Test de connexion
```
✅ Le module Odoo se charge au démarrage
✅ Pas d'erreur d'authentification dans les logs
```

### 2. Test de synchronisation
```
✅ Le job s'exécute au bon moment
✅ Les produits sont créés dans Medusa
✅ Les variantes sont correctement associées
✅ Les prix sont corrects
✅ Les options (couleur, taille, etc.) sont présentes
```

### 3. Test de mise à jour
```
✅ Modifier un produit dans Odoo
✅ Attendre la prochaine synchronisation
✅ Vérifier que les changements sont reflétés dans Medusa
✅ Pas de doublons créés
```

## 🔧 Personnalisations possibles

### Changer la fréquence de synchronisation

**Fichier** : `backend/src/jobs/sync-products-from-erp.ts`

```typescript
export const config = {
  name: "daily-product-sync",
  schedule: "0 */6 * * *", // Toutes les 6 heures au lieu de quotidien
}
```

### Filtrer les produits à synchroniser

**Fichier** : `backend/src/modules/odoo/service.ts`

Dans la méthode `fetchProducts`, ligne ~110 :

```typescript
// Exemple: seulement les produits vendables
"search",
[[["sale_ok", "=", true]]],
```

### Ajouter des champs personnalisés

**Fichier** : `backend/src/workflows/sync-from-erp.ts`

Dans la transformation des produits :

```typescript
const product: any = {
  // ... champs existants
  custom_field: odooProduct.x_custom_field, // Champ personnalisé Odoo
}
```

### Synchroniser l'inventaire

**Fichier** : `backend/src/workflows/sync-from-erp.ts`

Changer `manage_inventory` de `false` à `true` et ajouter la logique de récupération des quantités.

## 📊 Métriques et surveillance

### Logs à surveiller

```
✅ "🔄 Début de la synchronisation des produits Odoo..."
   → La synchronisation a démarré

✅ "✓ Synchronisé X produits (Total: Y)"
   → Progression de la synchronisation

✅ "✅ Synchronisation terminée : X produits synchronisés"
   → Synchronisation réussie

❌ "❌ Erreur lors de la synchronisation des produits:"
   → Erreur à investiguer
```

### KPIs à suivre

- **Fréquence de synchronisation** : Respectée ou non
- **Nombre de produits synchronisés** : Correspond-il au nombre attendu ?
- **Temps de synchronisation** : Surveiller si ça devient trop long
- **Taux d'erreurs** : Devrait être à 0%

## 🎓 Pour aller plus loin

### Extensions possibles

1. **Synchronisation bidirectionnelle**
   - Envoyer les commandes Medusa vers Odoo
   - Synchroniser les stocks en temps réel

2. **Synchronisation des images**
   - Récupérer les images produits depuis Odoo
   - Les uploader vers MinIO

3. **Synchronisation des catégories**
   - Créer les collections Medusa depuis les catégories Odoo

4. **Webhook en temps réel**
   - Au lieu du cron, écouter les webhooks Odoo
   - Synchronisation instantanée

5. **Gestion avancée des stocks**
   - Synchroniser les quantités disponibles
   - Gérer les ruptures de stock
   - Alertes automatiques

## 📚 Ressources

- [Documentation Medusa](https://docs.medusajs.com/)
- [Documentation Odoo API](https://www.odoo.com/documentation/17.0/developer/reference/external_api.html)
- [Guide d'intégration ERP Medusa](https://docs.medusajs.com/resources/recipes/erp/odoo)
- [JSON-RPC Client npm](https://www.npmjs.com/package/json-rpc-2.0)
- [Cron Expression Generator](https://crontab.guru/)

## ✅ Version

- **Date de création** : 7 octobre 2025
- **Version Medusa** : 2.10.2
- **Version du boilerplate** : LaCabrade_V4
- **Dépendance ajoutée** : json-rpc-2.0 ^1.7.0

## 👨‍💻 Développeur

Cette intégration a été créée en suivant la documentation officielle de Medusa pour l'intégration ERP Odoo.

---

**🎉 L'intégration Odoo est complète et prête pour Railway !**

Tous les fichiers sont créés, toutes les configurations sont faites. Il suffit maintenant de configurer les 4 variables d'environnement sur Railway et de déployer ! 🚀

