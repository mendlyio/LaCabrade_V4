# Configurer Stripe comme moyen de paiement

## 1. Backend — variables d'environnement

Dans `backend/.env` (et sur Railway pour la prod) :

```env
STRIPE_API_KEY=sk_test_xxxxx          # Clé secrète (sk_test_ en dev, sk_live_ en prod)
STRIPE_WEBHOOK_SECRET=whsec_xxxxx     # Secret du webhook (obligatoire en prod)
```

- **Test** : [Stripe Dashboard → Developers → API keys](https://dashboard.stripe.com/test/apikeys)
- **Prod** : [Stripe Dashboard → Developers → API keys](https://dashboard.stripe.com/apikeys)

## 2. Storefront — clé publique Stripe

Dans `storefront/.env.local` (et sur Railway pour la prod) :

```env
NEXT_PUBLIC_STRIPE_KEY=pk_test_xxxxx   # Clé publique (pk_test_ en dev, pk_live_ en prod)
```

## 3. Activer Stripe dans la région (Admin Medusa)

1. Ouvre le **Dashboard Medusa** : `https://ton-backend.app/app` (ou `http://localhost:9000/app`)
2. Va dans **Settings** → **Regions**
3. Clique sur ta région (ex. Europe)
4. Dans **Payment providers**, ajoute **Stripe** (`pp_stripe_stripe` pour carte bancaire)
5. Enregistre

## 4. Webhook Stripe (production)

En production, Stripe doit pouvoir notifier ton backend :

1. [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. **Add endpoint**
3. **URL** : `https://ton-backend-url.com/hooks/payment/stripe_stripe`
4. **Événements** à sélectionner :
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.amount_capturable_updated`
   - `payment_intent.partially_funded`
5. Copie le **Signing secret** (`whsec_...`) et mets-le dans `STRIPE_WEBHOOK_SECRET`

## 5. Redémarrer les services

- **Backend** : redémarre pour charger le module Stripe
- **Storefront** : redémarre pour prendre en compte `NEXT_PUBLIC_STRIPE_KEY`

## Résumé des variables

| Variable | Où | Description |
|----------|-----|-------------|
| `STRIPE_API_KEY` | Backend | Clé secrète Stripe |
| `STRIPE_WEBHOOK_SECRET` | Backend | Secret du webhook (prod) |
| `NEXT_PUBLIC_STRIPE_KEY` | Storefront | Clé publique Stripe |

Le code Stripe est déjà en place : il suffit de configurer ces variables et d’activer Stripe dans la région.
