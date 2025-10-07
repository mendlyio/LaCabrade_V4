# Module d'intégration Odoo

Ce module permet d'intégrer Odoo ERP avec Medusa pour synchroniser automatiquement les produits.

## 📋 Configuration

Pour activer ce module, ajoutez les variables d'environnement suivantes dans Railway :

```env
ODOO_URL=https://votre-instance.odoo.com
ODOO_DB_NAME=votre_base_de_donnees
ODOO_USERNAME=votre_email@exemple.com
ODOO_API_KEY=votre_cle_api_odoo
```

### Comment obtenir les informations Odoo :

1. **ODOO_URL** : L'URL de votre instance Odoo (ex: `https://mycompany.odoo.com`)
2. **ODOO_DB_NAME** : Le nom de votre base de données Odoo
3. **ODOO_USERNAME** : Votre email de connexion Odoo
4. **ODOO_API_KEY** : Générez une clé API dans Odoo :
   - Allez dans Paramètres → Utilisateurs & Sociétés → Utilisateurs
   - Sélectionnez votre utilisateur
   - Onglet "API Keys" → Générer une nouvelle clé

## 🔄 Synchronisation automatique

Le module synchronise automatiquement les produits d'Odoo vers Medusa :

- **Fréquence** : Tous les jours à minuit (configurable dans `src/jobs/sync-products-from-erp.ts`)
- **Fonctionnalités** :
  - ✅ Création de nouveaux produits
  - ✅ Mise à jour des produits existants
  - ✅ Support des variantes de produits
  - ✅ Synchronisation des prix
  - ✅ Gestion des options (couleur, taille, etc.)

## 🛠️ Structure du module

```
src/modules/odoo/
├── index.ts           # Point d'entrée du module
├── service.ts         # Service de connexion à Odoo
└── README.md          # Ce fichier

src/workflows/
└── sync-from-erp.ts   # Workflow de synchronisation

src/jobs/
└── sync-products-from-erp.ts   # Job planifié
```

## 📝 Personnalisation

### Changer la fréquence de synchronisation

Éditez le fichier `src/jobs/sync-products-from-erp.ts` :

```typescript
export const config = {
  name: "daily-product-sync",
  schedule: "0 0 * * *", // Cron expression
}
```

Exemples de cron :
- `"0 0 * * *"` : Tous les jours à minuit
- `"0 */6 * * *"` : Toutes les 6 heures
- `"*/30 * * * *"` : Toutes les 30 minutes

### Synchroniser l'inventaire

Par défaut, `manage_inventory` est défini sur `false`. Pour activer la synchronisation de l'inventaire, modifiez dans `src/workflows/sync-from-erp.ts` :

```typescript
manage_inventory: true, // Mettre à true pour synchroniser l'inventaire
```

Vous devrez ensuite ajouter la logique pour récupérer et synchroniser les quantités depuis Odoo.

## 🧪 Tester la synchronisation

Pour tester manuellement la synchronisation sans attendre le cron :

1. Changez temporairement la fréquence à toutes les minutes dans `src/jobs/sync-products-from-erp.ts` :
   ```typescript
   schedule: "* * * * *", // Toutes les minutes
   ```

2. Redéployez sur Railway

3. Surveillez les logs pour voir la synchronisation en action :
   ```
   🔄 Début de la synchronisation des produits Odoo...
   ✓ Synchronisé 10 produits (Total: 10)
   ✅ Synchronisation terminée : 10 produits synchronisés
   ```

4. Restaurez la fréquence souhaitée après les tests

## 📚 Documentation

- [Documentation officielle Odoo](https://www.odoo.com/documentation/17.0/)
- [API Odoo](https://www.odoo.com/documentation/17.0/developer/reference/external_api.html)
- [Documentation Medusa](https://docs.medusajs.com/)
- [Guide d'intégration ERP](https://docs.medusajs.com/resources/recipes/erp/odoo)

## ⚠️ Notes importantes

- Le module se connecte automatiquement à Odoo lors de la première requête
- Les produits sont identifiés par leur `external_id` dans les métadonnées
- Si un produit existe déjà (même `external_id`), il sera mis à jour au lieu d'être recréé
- Les variants sont également identifiés par leur `external_id`

## 🐛 Dépannage

### Le module ne se charge pas

Vérifiez que toutes les variables d'environnement sont définies dans Railway. Le module ne se charge que si toutes les variables sont présentes.

### Erreurs de connexion à Odoo

- Vérifiez l'URL de votre instance Odoo
- Vérifiez que la clé API est valide
- Assurez-vous que l'utilisateur a les permissions nécessaires dans Odoo

### Les produits ne se synchronisent pas

- Vérifiez les logs Railway pour voir les messages d'erreur
- Vérifiez que le job planifié est bien actif
- Testez avec une fréquence plus courte pour déboguer

