/**
 * Provider Stripe pour Alma (BNPL - paiement en 2, 3 ou 4 fois)
 * Étend la logique Stripe avec payment_method_types: ["alma"]
 */
// @ts-ignore - StripeBase n'est pas exporté publiquement par le package
import StripeBase from "@medusajs/payment-stripe/dist/core/stripe-base"

class StripeAlmaService extends StripeBase {
  get paymentIntentOptions() {
    return {
      payment_method_types: ["alma"],
      capture_method: "automatic" as const,
    }
  }
}

;(StripeAlmaService as any).identifier = "stripe-alma"
export default StripeAlmaService
