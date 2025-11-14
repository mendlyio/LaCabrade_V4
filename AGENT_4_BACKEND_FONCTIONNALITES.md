# AGENT 4 : FONCTIONNALITÉS BACKEND & AUTOMATISATIONS

## Contexte

Tu travailles sur un projet **Medusa.js v2 (version 2.10.3)** avec backend Node.js.

**OBJECTIF** : Implémenter les fonctionnalités backend pour alertes stock, emails automatiques, et pastilles NEW/PROMO

⚠️ **ATTENTION** : Cet agent nécessite des modifications backend importantes. Procéder par étapes et tester après chaque fonctionnalité.

## Fichiers à modifier/créer

- `/backend/src/modules/stock-alerts/` (CRÉER MODULE)
- `/backend/src/subscribers/stock-alert.ts` (CRÉER)
- `/backend/src/api/store/stock-alerts/` (CRÉER ROUTES)
- `/backend/src/modules/email-notifications/templates/` (AJOUTER TEMPLATES)
- `/backend/src/subscribers/order-placed.ts` (ACTIVER)
- `/backend/medusa-config.js` (SI BESOIN)

---

## PARTIE 1 : MODULE ALERTES RETOUR EN STOCK

### ÉTAPE 1.1 : Créer le module stock-alerts

Créer `/backend/src/modules/stock-alerts/models/stock-alert.ts` :

**Table** : `stock_alerts`

**Colonnes** :
- `id` (uuid, primary key)
- `product_id` (string, référence produit)
- `variant_id` (string nullable, référence variante)
- `customer_email` (string, email de l'utilisateur)
- `customer_id` (string nullable, si compte existe)
- `notified` (boolean, default false)
- `created_at`, `updated_at`

### ÉTAPE 1.2 : Créer le service stock-alerts

Créer `/backend/src/modules/stock-alerts/service.ts` :

**Méthodes** :
- `createAlert(productId, variantId?, email, customerId?)`
- `getAlertsByProduct(productId, variantId?)`
- `markAsNotified(alertId)`
- `deleteAlert(alertId)`

### ÉTAPE 1.3 : Créer les routes API store

Créer `/backend/src/api/store/stock-alerts/route.ts` :

**Route** : `POST /store/stock-alerts`

**Body** : `{ product_id, variant_id?, email }`

→ Crée une alerte de retour en stock

**Validation** :
- Email valide
- Produit existe
- Produit est bien en rupture de stock
- Pas de doublon (même email + même produit)

### ÉTAPE 1.4 : Créer le subscriber

Créer `/backend/src/subscribers/stock-alert.ts` :

**Écoute l'événement** : `"inventory.updated"`

**Logique** :
1. Récupérer les alertes pour ce produit/variante
2. Vérifier si le stock est > 0 maintenant
3. Si oui, envoyer email à tous les utilisateurs en attente
4. Marquer les alertes comme "notified"

### ÉTAPE 1.5 : Template email "retour en stock"

Créer `/backend/src/modules/email-notifications/templates/stock-alert.tsx` :

**Email contenant** :
- "Bonne nouvelle ! Le produit [nom] est de nouveau en stock"
- Image du produit
- Bouton "Voir le produit"
- Lien direct vers la fiche produit

---

## PARTIE 2 : PASTILLES NEW ET PROMO

### ÉTAPE 2.1 : Ajouter metadata aux produits

**Note** : Medusa v2 utilise des metadata JSON flexibles. Pas besoin de migration.

Dans l'admin Medusa, on pourra ajouter :
- `metadata.is_new = true`
- `metadata.new_until = "2025-12-31"`
- `metadata.is_promo = true`

### ÉTAPE 2.2 : Modifier le storefront pour afficher pastilles

Modifier `/storefront/src/modules/products/components/product-preview/index.tsx` :

- Ajouter pastille **"NEW"** si `metadata.is_new && Date.now() < metadata.new_until`
- Ajouter pastille **"PROMO"** si `metadata.is_promo`
- **Style** : position absolute top-left sur l'image
- **Couleurs** : NEW = vert, PROMO = rouge

### ÉTAPE 2.3 : Interface admin (optionnel, peut être fait manuellement)

Créer widget admin custom :

`/backend/src/admin/widgets/product-badges.tsx`

Permet de cocher facilement "Nouveau" et "En promo" avec datepicker

---

## PARTIE 3 : EMAILS AUTOMATIQUES

**Note** : Le module `email-notifications` existe déjà avec Resend.

### ÉTAPE 3.1 : Activer le subscriber order-placed

**Fichier** : `/backend/src/subscribers/order-placed.ts.disabled`

→ Renommer en `order-placed.ts` (enlever .disabled)

Ce subscriber envoie déjà un email de confirmation de commande.
Vérifier qu'il fonctionne.

### ÉTAPE 3.2 : Créer template "Commande expédiée"

Créer `/backend/src/modules/email-notifications/templates/order-shipped.tsx` :

**Contenu** :
- "Votre commande #[numéro] a été expédiée"
- Numéro de tracking
- Lien vers suivi du colis
- Récapitulatif de la commande

Créer subscriber `/backend/src/subscribers/order-fulfilled.ts` :
- Écoute `"order.fulfillment_created"`
- Envoie le template `order-shipped`

### ÉTAPE 3.3 : Template "Facture"

La facture est généralement générée en PDF.
Utiliser un module comme `pdfmake` ou `puppeteer`.

### ÉTAPE 3.4 : Template "Bienvenue nouveau client"

Créer `/backend/src/modules/email-notifications/templates/welcome.tsx` :

Envoyé lors de la première commande d'un client.

Créer subscriber `/backend/src/subscribers/customer-created.ts` :
- Écoute `"customer.created"`
- Envoie email de bienvenue avec :
  - Présentation de La Cabrade
  - Code promo de bienvenue (BIENVENUE10 ?)
  - Lien vers le site

---

## PARTIE 4 : INTÉGRATIONS LIVRAISON

### ÉTAPE 4.1 : Vérifier intégration Bpost

Module déjà existant : `/backend/src/modules/bpost`

**Vérifier configuration** :
- Clés API correctes
- Points relais configurés
- Génération d'étiquettes fonctionne

### ÉTAPE 4.2 : Ajouter nouveaux points de dépôt

La cliente mentionne "rajouter nouveaux points de dépôts (voir trello)".

⏳ **Attendre** que la cliente fournisse la liste via Trello.

Configuration probablement dans :
`/backend/src/modules/bpost/service.ts` ou via admin

### ÉTAPE 4.3 : Intégration DPD (si nécessaire)

Si DPD pas encore intégré, créer module similaire à bpost :
`/backend/src/modules/dpd/`

Avec service, routes API, et configuration

### ÉTAPE 4.4 : Bannière frais de livraison

Côté storefront, ajouter bannière :
**"Livraison gratuite à partir de [XX]€"**

Cette valeur doit être configurable (variable d'environnement ou admin).

Ajouter dans : `/storefront/src/modules/home/components/shipping-banner/index.tsx`

**Afficher sur** :
- Page d'accueil
- Page produit
- Page panier

---

## PARTIE 5 : LIMITATION CODES PROMO

### ÉTAPE 5.1 : Vérifier configuration des promotions Medusa

Medusa v2 a un système de promotions intégré.

**Vérifier dans l'admin** :
- Section "Promotions"
- Créer code "BIENVENUE10"
- Limiter à 1 utilisation par client

### ÉTAPE 5.2 : Forcer authentification pour codes promo

Modifier `/storefront/src/modules/cart/components/discount-code/index.tsx` :

- Si utilisateur pas connecté → afficher message "Connectez-vous pour utiliser un code promo"
- Empêcher application de code sans compte

Côté backend, Medusa gère déjà le tracking des utilisations par `customer_id`.

---

## TESTS & VALIDATION

Après **CHAQUE partie**, tester :

### 1. Build backend

```bash
cd backend && npm run build
```

✅ Vérifier qu'il n'y a pas d'erreur TypeScript

### 2. Tester en local les fonctionnalités

### 3. Vérifier logs backend

```bash
cd backend && npm run dev
```

### 4. Tester les emails

```bash
# Activer mode développement email
npm run email:dev
```

Vérifier rendu des templates à `http://localhost:3002`

### 5. Tester sur Railway (staging) avant production

---

## ⚠️ NE PAS TOUT FAIRE D'UN COUP ⚠️

**Procéder partie par partie, commiter entre chaque, tester.**

## ORDRE RECOMMANDÉ

1. **Partie 2** (Pastilles) → Le plus simple
2. **Partie 3** (Emails) → Module déjà en place
3. **Partie 1** (Alertes stock) → Nécessite nouveau module
4. **Partie 4** (Livraison) → Attendre infos cliente
5. **Partie 5** (Codes promo) → Simple configuration

---

## Checklist finale avant déploiement

### Backend

```bash
cd backend
npm run build  # ✅ Build réussi
npm run lint   # ✅ Pas d'erreur lint
```

### Storefront

```bash
cd storefront
npm run build  # ✅ Build réussi
npm run lint   # ✅ Pas d'erreur lint
```

### Tests E2E (optionnel mais recommandé)

```bash
npx playwright test
```

---

## Variables d'environnement à vérifier sur Railway

- `RESEND_API_KEY` (pour emails)
- `BPOST_PUBLIC_KEY` / `BPOST_PRIVATE_KEY`
- `NEXT_PUBLIC_MEDUSA_BACKEND_URL`
- `DATABASE_URL`
- `REDIS_URL`
- `MINIO_ENDPOINT` / `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY`
- `ODOO_URL` / `ODOO_DB_NAME` / `ODOO_USERNAME` / `ODOO_API_KEY`

---

**Bonne chance ! Procède étape par étape et n'hésite pas à tester régulièrement.** 🚀

