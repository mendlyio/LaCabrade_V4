# Configuration de l'intégration Odoo

## 📋 Variables d'environnement à configurer sur Railway

Pour activer l'intégration Odoo, ajoutez les variables d'environnement suivantes dans votre projet Railway :

```env
# Odoo ERP Configuration
ODOO_URL=https://votre-instance.odoo.com
ODOO_DB_NAME=votre_base_de_donnees
ODOO_USERNAME=votre_email@exemple.com
ODOO_API_KEY=votre_cle_api_odoo
```

## 🔑 Comment obtenir vos identifiants Odoo

### 1. ODOO_URL
L'URL complète de votre instance Odoo.

**Exemple** : `https://mycompany.odoo.com`

### 2. ODOO_DB_NAME
Le nom de votre base de données Odoo. Vous pouvez le trouver dans l'URL de connexion ou demander à votre administrateur Odoo.

**Exemple** : `mycompany_prod`

### 3. ODOO_USERNAME
L'email que vous utilisez pour vous connecter à Odoo.

**Exemple** : `admin@mycompany.com`

### 4. ODOO_API_KEY
Pour générer une clé API Odoo :

1. Connectez-vous à votre instance Odoo
2. Allez dans **Paramètres** → **Utilisateurs & Sociétés** → **Utilisateurs**
3. Sélectionnez votre utilisateur
4. Cliquez sur l'onglet **"API Keys"**
5. Cliquez sur **"Nouvelle clé API"**
6. Donnez un nom à la clé (ex: "Medusa Integration")
7. Copiez la clé générée (elle ne sera affichée qu'une seule fois !)

## 🚀 Configuration sur Railway

1. Allez dans votre projet Railway
2. Sélectionnez le service **backend**
3. Allez dans l'onglet **Variables**
4. Ajoutez les 4 variables d'environnement listées ci-dessus
5. Cliquez sur **Deploy** pour redéployer avec la nouvelle configuration

## ✅ Vérification

Une fois les variables configurées et le service redéployé :

1. Vérifiez les logs Railway
2. Le module Odoo devrait se charger automatiquement
3. La première synchronisation se fera à minuit (ou selon le cron configuré)
4. Vous verrez des logs comme :
   ```
   🔄 Début de la synchronisation des produits Odoo...
   ✓ Synchronisé 10 produits (Total: 10)
   ✅ Synchronisation terminée : 10 produits synchronisés
   ```

## 📝 Configuration du cron de synchronisation

Par défaut, les produits sont synchronisés **tous les jours à minuit**.

Pour modifier la fréquence, éditez `src/jobs/sync-products-from-erp.ts` :

```typescript
export const config = {
  name: "daily-product-sync",
  schedule: "0 0 * * *", // Expression cron
}
```

### Exemples de cron expressions :

| Expression | Fréquence |
|------------|-----------|
| `"0 0 * * *"` | Tous les jours à minuit |
| `"0 */6 * * *"` | Toutes les 6 heures |
| `"0 12 * * *"` | Tous les jours à midi |
| `"*/30 * * * *"` | Toutes les 30 minutes |
| `"0 0 * * 0"` | Tous les dimanches à minuit |

## 🔧 Personnalisation avancée

### Synchroniser l'inventaire

Par défaut, l'inventaire n'est pas synchronisé. Pour l'activer, modifiez `src/workflows/sync-from-erp.ts` :

```typescript
manage_inventory: true, // Changer de false à true
```

Puis ajoutez la logique pour récupérer les quantités depuis Odoo.

### Filtrer les produits à synchroniser

Dans `src/modules/odoo/service.ts`, méthode `fetchProducts`, vous pouvez ajouter des filtres :

```typescript
const productIds: number[] = await this.client.request("call", {
  service: "object",
  method: "execute_kw",
  args: [
    this.options.dbName,
    this.uid,
    this.options.apiKey,
    "product.template",
    "search",
    [[["sale_ok", "=", true]]], // Exemple: seulement les produits vendables
    {
      offset,
      limit,
    },
  ],
})
```

## 🐛 Dépannage

### Le module ne se charge pas

**Symptôme** : Pas de logs mentionnant Odoo

**Solution** :
- Vérifiez que les 4 variables d'environnement sont bien définies dans Railway
- Le module ne se charge que si **toutes** les variables sont présentes
- Redéployez après avoir ajouté les variables

### Erreur de connexion à Odoo

**Symptôme** : Erreur "Authentication failed" dans les logs

**Solutions** :
- Vérifiez que l'URL Odoo est correcte (avec https://)
- Vérifiez que la clé API est valide et n'a pas expiré
- Vérifiez que l'utilisateur a les permissions d'accès aux produits dans Odoo
- Régénérez une nouvelle clé API si nécessaire

### Les produits ne se synchronisent pas

**Symptôme** : Pas de nouveaux produits dans Medusa

**Solutions** :
1. Vérifiez les logs Railway pour des erreurs
2. Vérifiez que vous avez des produits dans Odoo
3. Testez avec une fréquence plus courte (ex: toutes les minutes) pour déboguer
4. Vérifiez les permissions de l'utilisateur Odoo

### Produits dupliqués

**Symptôme** : Les produits sont créés en double à chaque synchronisation

**Solution** :
- Les produits sont identifiés par `metadata.external_id`
- Vérifiez que ce champ est bien défini dans le workflow
- Si vous avez déjà des doublons, supprimez-les manuellement dans l'admin Medusa

## 📚 Ressources

- [Documentation Odoo API](https://www.odoo.com/documentation/17.0/developer/reference/external_api.html)
- [Documentation Medusa](https://docs.medusajs.com/)
- [Guide d'intégration ERP Medusa](https://docs.medusajs.com/resources/recipes/erp/odoo)
- [Cron Expression Generator](https://crontab.guru/)

## 💡 Conseils

1. **Testez d'abord avec peu de produits** : Limitez la synchronisation pour tester
2. **Surveillez les logs** : Les logs Railway sont votre meilleur ami pour déboguer
3. **Sauvegardez votre clé API** : Stockez-la dans un gestionnaire de mots de passe sécurisé
4. **Planifiez les synchronisations hors heures de pointe** : Pour ne pas impacter les performances

