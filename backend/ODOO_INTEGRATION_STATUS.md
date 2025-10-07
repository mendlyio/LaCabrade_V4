# 📊 Statut de l'intégration Odoo-Medusa

## ✅ Fonctionnalités implémentées

### 1. Service Odoo (JSON-RPC)
- ✅ Authentification via `common.authenticate`
- ✅ Méthode `ping()` pour tester la connexion
- ✅ Méthode `fetchProducts()` avec pagination
- ✅ Support des variantes de produits
- ✅ Support des attributs/options

**Fichier**: `src/modules/odoo/service.ts`

### 2. Synchronisation des produits
- ✅ Workflow avec support dry-run
- ✅ Création de nouveaux produits
- ✅ Mise à jour des produits existants
- ✅ Identification via `metadata.external_id`
- ✅ Support des variantes multiples

**Fichier**: `src/workflows/sync-from-erp.ts`

### 3. Scripts CLI
- ✅ `pnpm odoo:ping` - Test de connexion
- ✅ `pnpm odoo:sync:dry` - Aperçu de synchronisation
- ✅ `pnpm odoo:sync` - Synchronisation réelle

**Fichiers**:
- `src/scripts/odoo-ping.ts`
- `src/scripts/odoo-sync.ts`

### 4. Scheduler (Cron)
- ✅ Job automatique quotidien (2h du matin)
- ✅ Configurable via cron expression

**Fichier**: `src/jobs/odoo-sync-products.ts`

### 5. Configuration
- ✅ Variables d'environnement
- ✅ Enregistrement dans `medusa-config.js`
- ✅ Fichier `env.example.txt`

## ⚠️ Fonctionnalités TODO (stubs créés)

### 1. Synchronisation bi-directionnelle du stock
**Status**: Subscriber créé avec TODO  
**Fichier**: `src/subscribers/odoo-stock-sync.ts`

**Ce qui doit être fait**:
- Implémenter `updateStock()` dans le service Odoo
- Mapper les événements d'inventaire Medusa → Odoo
- Configurer webhook Odoo → Medusa pour changements de stock

### 2. Création de commandes dans Odoo
**Status**: Subscriber créé avec TODO  
**Fichier**: `src/subscribers/odoo-order-sync.ts`

**Ce qui doit être fait**:
- Implémenter `createOrder()` dans le service Odoo
- Mapper commande Medusa → `sale.order` Odoo
- Créer les lignes de commande (`sale.order.line`)
- Gérer les clients (créer ou lier au `res.partner` Odoo)
- Stocker l'ID Odoo dans metadata de la commande Medusa

## 🔧 Variables d'environnement requises

```env
ODOO_URL=https://your-instance.odoo.com
ODOO_DB_NAME=your_database_name
ODOO_USERNAME=your_email@example.com
ODOO_API_KEY=your_api_key_or_password
```

## 📝 Utilisation

### Test de connexion
```bash
pnpm odoo:ping
```

### Synchronisation manuelle (dry-run)
```bash
pnpm odoo:sync:dry
```

### Synchronisation manuelle (réelle)
```bash
pnpm odoo:sync
```

### Synchronisation automatique
Le job cron s'exécute automatiquement tous les jours à 2h du matin.  
Configurable dans `src/jobs/odoo-sync-products.ts`.

## 🚀 Prochaines étapes

1. **Stock sync**: Implémenter la logique dans `src/subscribers/odoo-stock-sync.ts`
2. **Order sync**: Implémenter la logique dans `src/subscribers/odoo-order-sync.ts`
3. **Service Odoo**: Ajouter les méthodes manquantes:
   - `updateStock(variantId, quantity)`
   - `createOrder(orderData)`
   - `createCustomer(customerData)`
4. **Tests**: Ajouter des tests unitaires pour le service
5. **Error handling**: Améliorer la gestion d'erreurs et les retry

## 📚 Documentation de référence

- [Medusa v2 Docs](https://docs.medusajs.com/)
- [Odoo API External](https://www.odoo.com/documentation/17.0/developer/reference/external_api.html)
- [JSON-RPC 2.0 Spec](https://www.jsonrpc.org/specification)

