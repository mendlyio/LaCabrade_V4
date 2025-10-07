# 🎨 Interface Admin Odoo

## ✅ Ce qui a été ajouté

### 1. Widget Admin (`src/admin/widgets/odoo-sync-widget.tsx`)
Un widget React qui s'affiche dans l'admin Medusa pour gérer Odoo :

**Fonctionnalités :**
- ✅ Affiche le statut de connexion Odoo (Connecté / Non configuré)
- ✅ Affiche les informations de configuration (URL, DB, utilisateur)
- ✅ Bouton pour synchroniser manuellement les produits
- ✅ Toast notifications pour les succès/erreurs
- ✅ Message informatif si Odoo n'est pas configuré

**Emplacement dans l'admin :**
Le widget s'affiche en haut de la page **Products** (avant la liste des produits)

### 2. Routes API Admin

#### `POST /admin/odoo/sync`
Déclenche manuellement la synchronisation des produits.

**Réponse succès :**
```json
{
  "success": true,
  "message": "Synchronisation réussie : 25 produits synchronisés",
  "total": 25
}
```

#### `GET /admin/odoo/status`
Récupère le statut de la configuration Odoo.

**Réponse :**
```json
{
  "configured": true,
  "connected": true,
  "url": "https://mycompany.odoo.com",
  "database": "mycompany_prod",
  "username": "admin@mycompany.com",
  "message": "Module Odoo configuré et actif"
}
```

## 🎯 Utilisation

### Dans l'admin Medusa

1. **Accédez à l'admin** : `https://votre-backend.railway.app/app`
2. **Allez dans Products**
3. **Le widget Odoo apparaît en haut de la page**
4. **Cliquez sur "Synchroniser maintenant"** pour lancer une sync manuelle

### États du widget

#### ✅ Configuré et connecté (Badge vert)
```
┌─────────────────────────────────────┐
│ Synchronisation Odoo    [Connecté]  │
├─────────────────────────────────────┤
│ URL Odoo: mycompany.odoo.com        │
│ Base de données: mycompany_prod     │
│ Utilisateur: admin@mycompany.com    │
├─────────────────────────────────────┤
│ [Synchroniser maintenant]           │
└─────────────────────────────────────┘
```

#### ❌ Non configuré (Badge rouge)
```
┌─────────────────────────────────────┐
│ Synchronisation Odoo [Non configuré]│
├─────────────────────────────────────┤
│ Le module Odoo n'est pas configuré. │
│ Variables requises:                 │
│ • ODOO_URL                          │
│ • ODOO_DB_NAME                      │
│ • ODOO_USERNAME                     │
│ • ODOO_API_KEY                      │
└─────────────────────────────────────┘
```

## 📁 Structure des fichiers

```
backend/src/
├── admin/
│   └── widgets/
│       └── odoo-sync-widget.tsx      # Widget React dans l'admin
│
└── api/
    └── admin/
        └── odoo/
            ├── sync/
            │   └── route.ts          # API sync manuelle
            └── status/
                └── route.ts          # API statut Odoo
```

## 🎨 Aperçu du design

Le widget utilise **Medusa UI** pour rester cohérent avec le reste de l'admin :
- Container avec padding standard
- Badges de couleur pour le statut
- Boutons Medusa UI
- Toast notifications
- Grid layout responsive
- Typographie Medusa

## 🔧 Personnalisation

### Changer l'emplacement du widget

Dans `src/admin/widgets/odoo-sync-widget.tsx` :

```typescript
export const config = defineWidgetConfig({
  zone: "product.list.before", // Avant la liste des produits
})
```

**Autres zones possibles :**
- `"product.list.after"` - Après la liste des produits
- `"product.details.before"` - Avant les détails d'un produit
- `"order.list.before"` - Page des commandes
- etc.

### Ajouter des statistiques

Vous pouvez étendre le widget pour afficher :
- Nombre de produits synchronisés
- Date de dernière synchronisation
- Historique des synchronisations
- Logs en temps réel

## ⚡ Avantages

1. **Pas besoin d'attendre minuit** - Sync manuelle à tout moment
2. **Visibilité du statut** - Voir immédiatement si Odoo est configuré
3. **Feedback utilisateur** - Notifications toast pour succès/erreurs
4. **Interface native** - S'intègre parfaitement dans l'admin Medusa
5. **Sécurisé** - Utilise les routes admin protégées de Medusa

## 🚀 Prêt pour Railway

Tout est prêt ! Le widget s'affichera automatiquement après le déploiement sur Railway. Aucune configuration supplémentaire n'est nécessaire.

**Important :** Le widget vérifie automatiquement si les variables d'environnement Odoo sont configurées et adapte l'affichage en conséquence.

