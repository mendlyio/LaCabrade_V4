/**
 * Provider Stripe pour Klarna (BNPL)
 * Étend la logique Stripe avec payment_method_types: ["klarna"]
 */
// @ts-ignore - StripeBase n'est pas exporté publiquement par le package
import StripeBase from "@medusajs/payment-stripe/dist/core/stripe-base"

class StripeKlarnaService extends StripeBase {
  get paymentIntentOptions() {
    return {
      payment_method_types: ["klarna"],
      capture_method: "automatic" as const,
    }
  }
}

;(StripeKlarnaService as any).identifier = "stripe-klarna"
export default StripeKlarnaService
