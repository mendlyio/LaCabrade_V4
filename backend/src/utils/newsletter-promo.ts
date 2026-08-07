/**
 * Helpers partagés pour les codes promo newsletter (NL-) et anniversaire (ANNIV-).
 *
 * Important Medusa v2 : pour target_type "items", allocation "each" est requis
 * (comme les seeds soldes / PO / outlet). Sans allocation, la promo peut être
 * créée de façon incorrecte ou ne jamais s'appliquer au panier.
 */

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

export function generatePromoCode(prefix: string): string {
  let code = prefix + "-"
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return code
}

/** Payload Medusa pour -10% items, usage unique */
export function buildNewsletterPromotionPayload(code: string) {
  return {
    code,
    type: "standard" as const,
    status: "active" as const,
    is_automatic: false,
    usage_limit: 1,
    application_method: {
      type: "percentage" as const,
      target_type: "items" as const,
      allocation: "each" as const,
      value: 10,
      max_quantity: 100,
      apply_to_quantity: 1,
    },
  }
}
