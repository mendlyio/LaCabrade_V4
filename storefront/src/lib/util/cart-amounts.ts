/**
 * Utilitaire centralisé pour les montants du panier.
 * Tous les produits (y compris bons cadeaux) sont en TVAC (TTC).
 * L'API Medusa renvoie les montants en centimes (minor units).
 */

export function centsToEuros(cents: number | null | undefined): number {
  return (cents ?? 0) / 100
}

export function isGiftCardItem(item: {
  metadata?: Record<string, unknown> | null
  product_title?: string | null
  title?: string | null
  variant_sku?: string | null
  variant?: { product?: { handle?: string } }
}): boolean {
  return !!(
    (item.metadata as any)?.is_gift_card ||
    String(item.product_title || item.title || "").toLowerCase().includes("bon cadeau") ||
    (item.variant_sku || "").startsWith("GC-") ||
    (item.variant?.product as any)?.handle === "bon-cadeau"
  )
}

export type CartAmountsInput = {
  item_total?: number | null
  item_tax_total?: number | null
  subtotal?: number | null
  tax_total?: number | null
  shipping_total?: number | null
  discount_total?: number | null
  gift_card_total?: number | null
  total?: number | null
  metadata?: Record<string, unknown> | null
  shipping_address?: { country_code?: string | null } | null
}

/**
 * Vérifie si le client bénéficie de l'exonération TVA intracommunautaire.
 */
export function isIntraCommunityExempt(cart: CartAmountsInput): boolean {
  const vatNumber = (cart.metadata as any)?.vat_number || null
  const country = cart.shipping_address?.country_code?.toLowerCase()
  return !!(vatNumber && country && country !== "be")
}

/**
 * Calcule le sous-total TVAC des articles (en euros pour affichage).
 * Tous les montants API sont en centimes → /100.
 */
export function getItemsTotalTvacEuros(
  itemTotal: number | null | undefined,
  subtotal: number | null | undefined,
  taxTotal: number | null | undefined
): number {
  return centsToEuros(itemTotal ?? (subtotal ?? 0) + (taxTotal ?? 0))
}

/**
 * Sous-total articles pour affichage (dropdown, etc.).
 * TVAC normal, HT si exonération intracommunautaire.
 */
export function getItemsDisplayTotalEuros(cart: CartAmountsInput): number {
  const itemTotal = cart.item_total ?? (cart.subtotal ?? 0) + (cart.tax_total ?? 0)
  const itemEuros = centsToEuros(itemTotal)
  if (isIntraCommunityExempt(cart)) {
    const itemTax = cart.item_tax_total ?? cart.tax_total ?? 0
    return Math.max(0, itemEuros - centsToEuros(itemTax))
  }
  return itemEuros
}

/**
 * Calcule le total TVAC à afficher (en euros).
 * Cas intracommunautaire : total HT (sans TVA belge).
 */
export function getDisplayTotalTvacEuros(cart: CartAmountsInput): number {
  const toEuros = centsToEuros
  const exempt = isIntraCommunityExempt(cart)
  const giftCardDeduction = cart.gift_card_total != null ? toEuros(cart.gift_card_total) : 0

  const itemTotal = cart.item_total ?? (cart.subtotal ?? 0) + (cart.tax_total ?? 0)
  const itemTotalEuros = toEuros(itemTotal)
  const shippingEuros = toEuros(cart.shipping_total)
  const discountEuros = toEuros(cart.discount_total)

  const totalTvac = itemTotalEuros + shippingEuros - discountEuros - giftCardDeduction

  if (exempt && cart.tax_total != null) {
    return Math.max(0, totalTvac - toEuros(cart.tax_total))
  }
  return Math.max(0, totalTvac)
}

/**
 * Calcule le montant à charger (Stripe) en centimes.
 * Stripe attend les minor units. Tous les champs API sont en centimes.
 */
export function getPaymentAmountCents(cart: CartAmountsInput): number {
  const exempt = isIntraCommunityExempt(cart)

  const itemTotalCents = cart.item_total ?? (cart.subtotal ?? 0) + (cart.tax_total ?? 0)
  const shippingCents = cart.shipping_total ?? 0
  const discountCents = cart.discount_total ?? 0
  const giftCardCents = cart.gift_card_total ?? 0

  let totalCents = itemTotalCents + shippingCents - discountCents - giftCardCents

  if (exempt && cart.tax_total != null) {
    totalCents = Math.max(0, totalCents - (cart.tax_total ?? 0))
  }

  return Math.max(0, Math.round(totalCents))
}
