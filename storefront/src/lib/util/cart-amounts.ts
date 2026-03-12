/**
 * Utilitaire centralisé pour les montants du panier.
 * Tous les produits sont en TVAC (TTC).
 *
 * IMPORTANT: Les produits Odoo sont stockés en EUROS (sync-from-erp).
 * Seul gift_card_total est en centimes. item_total, shipping_total, etc. = euros.
 */
const AMOUNTS_IN_EUROS = true

export function centsToEuros(cents: number | null | undefined): number {
  return (cents ?? 0) / 100
}

/** Convertit un montant API en euros pour affichage. */
function toDisplayEuros(value: number | null | undefined, isGiftCard = false): number {
  const v = value ?? 0
  if (isGiftCard) return v / 100
  return AMOUNTS_IN_EUROS ? v : v / 100
}

/** Pour les line items : unit_price en euros (Odoo) ou centimes (bon cadeau). */
export function lineItemAmountToEuros(value: number | null | undefined, isGiftCard: boolean): number {
  const v = value ?? 0
  return isGiftCard ? v / 100 : (AMOUNTS_IN_EUROS ? v : v / 100)
}

/** Convertit un montant API en centimes pour Stripe. */
function toPaymentCents(value: number | null | undefined, isGiftCard = false): number {
  const v = value ?? 0
  if (isGiftCard) return Math.round(v)
  return AMOUNTS_IN_EUROS ? Math.round(v * 100) : Math.round(v)
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
  items?: Array<unknown>
  metadata?: Record<string, unknown> | null
  shipping_address?: { country_code?: string | null } | null
}

/**
 * Vérifie si le client bénéficie de l'exonération TVA intracommunautaire.
 */
export function isIntraCommunityExempt(cart: CartAmountsInput | null | undefined): boolean {
  if (!cart) return false
  const vatNumber = (cart.metadata as any)?.vat_number || null
  const country = cart.shipping_address?.country_code?.toLowerCase()
  return !!(vatNumber && country && country !== "be")
}

/**
 * Calcule le sous-total TVAC des articles (en euros pour affichage).
 */
export function getItemsTotalTvacEuros(
  itemTotal: number | null | undefined,
  subtotal: number | null | undefined,
  taxTotal: number | null | undefined
): number {
  return toDisplayEuros(itemTotal ?? (subtotal ?? 0) + (taxTotal ?? 0))
}

/**
 * Sous-total articles pour affichage (dropdown, etc.).
 * TVAC normal, HT si exonération intracommunautaire.
 */
export function getItemsDisplayTotalEuros(cart: CartAmountsInput | null | undefined): number {
  if (!cart) return 0
  const itemTotal = cart.item_total ?? (cart.subtotal ?? 0) + (cart.tax_total ?? 0)
  const itemEuros = toDisplayEuros(itemTotal)
  if (isIntraCommunityExempt(cart)) {
    const itemTax = cart.item_tax_total ?? cart.tax_total ?? 0
    return Math.max(0, itemEuros - toDisplayEuros(itemTax))
  }
  return itemEuros
}

/**
 * Calcule le total TVAC à afficher (en euros).
 * Cas intracommunautaire : total HT (sans TVA belge).
 */
export function getDisplayTotalTvacEuros(cart: CartAmountsInput | null | undefined): number {
  if (!cart) return 0
  const exempt = isIntraCommunityExempt(cart)
  const giftCardDeduction = toDisplayEuros(cart.gift_card_total, true)

  const itemTotal = cart.item_total ?? (cart.subtotal ?? 0) + (cart.tax_total ?? 0)
  const itemTotalEuros = toDisplayEuros(itemTotal)
  const shippingEuros = toDisplayEuros(cart.shipping_total)
  const discountEuros = toDisplayEuros(cart.discount_total)

  const totalTvac = itemTotalEuros + shippingEuros - discountEuros - giftCardDeduction

  if (exempt && cart.tax_total != null) {
    return Math.max(0, totalTvac - toDisplayEuros(cart.tax_total))
  }
  return Math.max(0, totalTvac)
}

/**
 * Calcule le montant à charger (Stripe) en centimes.
 * Stripe attend les minor units.
 */
export function getPaymentAmountCents(cart: CartAmountsInput | null | undefined): number {
  if (!cart) return 0
  const exempt = isIntraCommunityExempt(cart)

  const itemTotal = cart.item_total ?? (cart.subtotal ?? 0) + (cart.tax_total ?? 0)
  const itemCents = toPaymentCents(itemTotal)
  const shippingCents = toPaymentCents(cart.shipping_total)
  const discountCents = toPaymentCents(cart.discount_total)
  const giftCardCents = toPaymentCents(cart.gift_card_total, true)

  let totalCents = itemCents + shippingCents - discountCents - giftCardCents

  if (exempt && cart.tax_total != null) {
    totalCents = Math.max(0, totalCents - toPaymentCents(cart.tax_total))
  }

  return Math.max(0, totalCents)
}
