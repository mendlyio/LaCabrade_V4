import StripeProviderService from "@medusajs/payment-stripe/dist/services/stripe-provider"
import { PaymentProviderKeys } from "@medusajs/payment-stripe/dist/types"

/**
 * Provider Stripe personnalisé qui transmet l'adresse de livraison et active
 * les méthodes par redirection (Bancontact, Alma, etc.) pour afficher tous
 * les moyens de paiement dans le PaymentElement.
 */
class StripePaymentProvider extends StripeProviderService {
  // Override pour ajouter shipping et allow_redirects au PaymentIntent
  normalizePaymentIntentParameters(extra: Record<string, unknown> = {}) {
    const res = super.normalizePaymentIntentParameters(extra) as Record<
      string,
      unknown
    >

    // allow_redirects pour Bancontact, Alma, iDEAL, etc.
    res.automatic_payment_methods =
      (extra?.automatic_payment_methods as Record<string, unknown>) ?? {
        enabled: true,
        allow_redirects: "always",
      }

    // shipping pour que Stripe détermine les moyens de paiement par pays
    if (extra?.shipping) {
      res.shipping = extra.shipping
    }

    return res
  }
}

;(StripePaymentProvider as any).identifier = PaymentProviderKeys.STRIPE

export default StripePaymentProvider
