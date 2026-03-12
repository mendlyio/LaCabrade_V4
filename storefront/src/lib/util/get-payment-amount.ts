import { getPaymentAmountCents } from "@lib/util/cart-amounts"

/**
 * Calcule le montant à charger pour le paiement (Stripe).
 * Retourne les centimes (minor units) ; tous les produits et bons cadeaux sont en TVAC.
 * Gère l'exonération TVA intracommunautaire.
 */
export function getPaymentAmountFromCart(cart: {
  total?: number | null
  item_total?: number | null
  subtotal?: number | null
  tax_total?: number | null
  shipping_total?: number | null
  discount_total?: number | null
  gift_card_total?: number | null
  metadata?: Record<string, unknown> | null
  shipping_address?: { country_code?: string | null } | null
}): number {
  return getPaymentAmountCents(cart)
}
