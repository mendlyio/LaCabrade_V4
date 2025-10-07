# 🔌 Intégration Odoo pour Medusa Backend

Ce backend inclut maintenant une intégration complète avec Odoo ERP pour synchroniser automatiquement vos produits.

## 📦 Ce qui a été ajouté

### 1. Module Odoo (`src/modules/odoo/`)
- **`service.ts`** : Service de connexion et d'interaction avec l'API Odoo
- **`index.ts`** : Configuration du module Medusa
- **`README.md`** : Documentation détaillée du module

### 2. Workflow de synchronisation (`src/workflows/sync-from-erp.ts`)
- Récupère les produits depuis Odoo
- Compare avec les produits existants dans Medusa
- Crée les nouveaux produits
- Met à jour les produits existants
- Gère les variantes et options de produits

### 3. Job planifié (`src/jobs/sync-products-from-erp.ts`)
- Exécute automatiquement la synchronisation tous les jours à minuit
- Peut être configuré avec n'importe quelle fréquence via cron expression

### 4. Configuration
- **`package.json`** : Ajout de la dépendance `json-rpc-2.0`
- **`medusa-config.js`** : Configuration du module Odoo
- **`src/lib/constants.ts`** : Constantes pour les variables d'environnement

## 🚀 Déploiement sur Railway

### Étape 1 : Installer les dépendances

Sur Railway, l'installation se fera automatiquement. Le `package.json` inclut maintenant :
```json
"json-rpc-2.0": "^1.7.0"
```

### Étape 2 : Configurer les variables d'environnement

Dans Railway, ajoutez ces 4 variables pour activer l'intégration :

```env
ODOO_URL=https://votre-instance.odoo.com
ODOO_DB_NAME=votre_base_de_donnees
ODOO_USERNAME=votre_email@exemple.com
ODOO_API_KEY=votre_cle_api_odoo
```

> **Note** : Si ces variables ne sont pas définies, le module ne se chargera pas et le backend fonctionnera normalement sans intégration Odoo.

### Étape 3 : Déployer

Railway détectera automatiquement les changements et redéploiera le backend avec l'intégration Odoo activée.

## 📋 Comment obtenir vos identifiants Odoo

### Génération de la clé API Odoo

1. Connectez-vous à votre instance Odoo
2. **Paramètres** → **Utilisateurs & Sociétés** → **Utilisateurs**
3. Sélectionnez votre utilisateur
4. Onglet **"API Keys"**
5. **"Nouvelle clé API"**
6. Donnez un nom : "Medusa Integration"
7. **Copiez la clé** (elle ne sera affichée qu'une seule fois !)

### Informations nécessaires

| Variable | Description | Exemple |
|----------|-------------|---------|
| `ODOO_URL` | URL de votre instance Odoo | `https://mycompany.odoo.com` |
| `ODOO_DB_NAME` | Nom de votre base Odoo | `mycompany_prod` |
| `ODOO_USERNAME` | Email de connexion Odoo | `admin@mycompany.com` |
| `ODOO_API_KEY` | Clé API générée | `abc123...` |

## ⚙️ Configuration de la synchronisation

### Fréquence de synchronisation

Par défaut : **Tous les jours à minuit**

Pour modifier, éditez `src/jobs/sync-products-from-erp.ts` :

```typescript
export const config = {
  name: "daily-product-sync",
  schedule: "0 0 * * *", // Expression cron
}
```

#### Exemples de fréquences :

```typescript
"0 0 * * *"      // Tous les jours à minuit
"0 */6 * * *"    // Toutes les 6 heures
"0 12 * * *"     // Tous les jours à midi
"*/30 * * * *"   // Toutes les 30 minutes (pour tests)
"0 0 * * 0"      // Tous les dimanches à minuit
```

🔗 Générateur de cron : [crontab.guru](https://crontab.guru/)

## 🔍 Surveillance et logs

### Logs de synchronisation

Une fois déployé, vous verrez ces logs dans Railway :

```
🔄 Début de la synchronisation des produits Odoo...
  ✓ Synchronisé 10 produits (Total: 10)
  ✓ Synchronisé 10 produits (Total: 20)
✅ Synchronisation terminée : 20 produits synchronisés
```

### En cas d'erreur

```
❌ Erreur lors de la synchronisation des produits: [détails de l'erreur]
```

Vérifiez :
- Les variables d'environnement sont correctement définies
- La clé API Odoo est valide
- L'utilisateur Odoo a les permissions nécessaires
- Votre instance Odoo est accessible

## 📊 Fonctionnalités supportées

### ✅ Actuellement supporté

- ✅ Synchronisation des produits simples
- ✅ Synchronisation des produits avec variantes
- ✅ Options de produits (couleur, taille, etc.)
- ✅ Prix par variante
- ✅ Devises multiples
- ✅ Identification unique via `external_id` (évite les doublons)
- ✅ Création de nouveaux produits
- ✅ Mise à jour des produits existants

### 🔄 Peut être ajouté

- 🔄 Synchronisation de l'inventaire
- 🔄 Synchronisation des images produits
- 🔄 Synchronisation des catégories
- 🔄 Synchronisation bidirectionnelle (Medusa → Odoo)
- 🔄 Synchronisation des commandes
- 🔄 Synchronisation des clients

## 🛠️ Structure du code

```
backend/
├── src/
│   ├── modules/
│   │   └── odoo/
│   │       ├── index.ts              # Point d'entrée du module
│   │       ├── service.ts            # Service Odoo avec méthodes API
│   │       └── README.md             # Documentation du module
│   │
│   ├── workflows/
│   │   └── sync-from-erp.ts          # Workflow de synchronisation
│   │
│   ├── jobs/
│   │   └── sync-products-from-erp.ts # Job planifié quotidien
│   │
│   └── lib/
│       └── constants.ts              # Variables d'environnement
│
├── medusa-config.js                  # Configuration Medusa (module ajouté)
├── package.json                      # Dépendance json-rpc-2.0 ajoutée
├── ODOO_SETUP.md                     # Guide de configuration détaillé
└── README_ODOO.md                    # Ce fichier
```

## 🧪 Tester l'intégration

### 1. Tester localement (optionnel)

Si vous voulez tester en local avant Railway :

```bash
# Installer les dépendances
npm install

# Configurer les variables dans .env
ODOO_URL=https://votre-instance.odoo.com
ODOO_DB_NAME=votre_base
ODOO_USERNAME=votre@email.com
ODOO_API_KEY=votre_cle

# Lancer le backend
npm run dev
```

### 2. Tester la synchronisation rapidement

Pour tester sans attendre minuit, changez temporairement le cron :

```typescript
// src/jobs/sync-products-from-erp.ts
export const config = {
  name: "daily-product-sync",
  schedule: "* * * * *", // Toutes les minutes
}
```

> ⚠️ N'oubliez pas de remettre la fréquence normale après les tests !

### 3. Vérifier les produits

1. Ouvrez l'admin Medusa : `https://votre-backend-railway.app/app`
2. Allez dans **Products**
3. Vérifiez que les produits Odoo sont synchronisés

## 🔐 Sécurité

### Bonnes pratiques

- ✅ **Utilisez une clé API dédiée** pour Medusa (pas votre compte admin personnel)
- ✅ **Stockez les clés dans Railway Variables** (jamais dans le code)
- ✅ **Créez un utilisateur Odoo spécifique** pour l'intégration avec permissions minimales
- ✅ **Régénérez les clés API régulièrement**
- ✅ **Surveillez les logs** pour détecter des activités suspectes

### Permissions Odoo minimales requises

L'utilisateur Odoo doit avoir accès à :
- ✅ Lecture des produits (`product.template`)
- ✅ Lecture des variantes (`product.product`)
- ✅ Lecture des attributs de produits

## 🐛 Résolution de problèmes

### Le module ne se charge pas

**Cause** : Variables d'environnement manquantes

**Solution** :
1. Vérifiez que les 4 variables Odoo sont définies dans Railway
2. Redéployez le service
3. Vérifiez les logs Railway

### Erreur "Authentication failed"

**Cause** : Identifiants Odoo incorrects

**Solution** :
1. Vérifiez `ODOO_URL` (doit inclure `https://`)
2. Vérifiez `ODOO_DB_NAME`
3. Vérifiez `ODOO_USERNAME` (email complet)
4. Régénérez une nouvelle `ODOO_API_KEY`

### Produits non synchronisés

**Cause** : Plusieurs possibilités

**Solution** :
1. Vérifiez que des produits existent dans Odoo
2. Vérifiez les permissions de l'utilisateur Odoo
3. Consultez les logs Railway pour les erreurs
4. Testez avec une fréquence courte (toutes les minutes)

### Produits dupliqués

**Cause** : `external_id` non défini correctement

**Solution** :
1. Supprimez les doublons manuellement dans l'admin
2. Vérifiez que le workflow définit bien `metadata.external_id`
3. Relancez une synchronisation

## 📚 Documentation complète

- 📖 [Guide de configuration détaillé](./ODOO_SETUP.md)
- 📖 [Documentation du module Odoo](./src/modules/odoo/README.md)
- 📖 [Documentation officielle Medusa](https://docs.medusajs.com/)
- 📖 [Documentation API Odoo](https://www.odoo.com/documentation/17.0/developer/reference/external_api.html)
- 📖 [Guide d'intégration ERP officiel](https://docs.medusajs.com/resources/recipes/erp/odoo)

## ✉️ Support

Pour toute question ou problème :

1. Consultez d'abord les fichiers de documentation
2. Vérifiez les logs Railway
3. Consultez la documentation officielle Medusa
4. Consultez le Discord Medusa

## 🎉 Prêt pour la production !

Votre backend est maintenant prêt à être déployé sur Railway avec l'intégration Odoo complète. Il suffit de :

1. ✅ Configurer les 4 variables d'environnement Odoo
2. ✅ Déployer sur Railway
3. ✅ Surveiller les logs de synchronisation
4. ✅ Profiter de la synchronisation automatique !

---

**Note importante** : Cette intégration est conçue pour fonctionner sur Railway sans nécessiter de configuration locale. Tout est prêt pour le déploiement en production ! 🚀

