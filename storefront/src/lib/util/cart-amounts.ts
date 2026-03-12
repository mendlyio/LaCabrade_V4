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
  items?: Array<{
    unit_price?: number | null
    subtotal?: number | null
    quantity?: number | null
    metadata?: Record<string, unknown> | null
    product_title?: string | null
    title?: string | null
    variant_sku?: string | null
    variant?: { product?: { handle?: string } }
  }>
  metadata?: Record<string, unknown> | null
  shipping_address?: { country_code?: string | null } | null
}

/** Calcule le total articles en euros à partir des line items (Odoo=euros, bon cadeau=centimes). */
function getItemsTotalEurosFromItems(cart: CartAmountsInput | null | undefined): number | null {
  const items = cart?.items
  if (!items?.length) return null
  let sum = 0
  for (const item of items) {
    const isGiftCard = isGiftCardItem(item)
    const lineTotal =
      item.subtotal != null
        ? lineItemAmountToEuros(item.subtotal, isGiftCard)
        : lineItemAmountToEuros(item.unit_price, isGiftCard) * (item.quantity ?? 1)
    sum += lineTotal
  }
  return sum
}

/** Total articles en euros (display). Utilise items si dispo, sinon item_total. */
function getItemsTotalEuros(cart: CartAmountsInput | null | undefined): number {
  if (!cart) return 0
  const fromItems = getItemsTotalEurosFromItems(cart)
  if (fromItems != null) return fromItems
  const itemTotal = cart.item_total ?? (cart.subtotal ?? 0) + (cart.tax_total ?? 0)
  return toDisplayEuros(itemTotal)
}

/** Total articles en centimes (paiement). Utilise items si dispo, sinon item_total. */
function getItemsTotalCents(cart: CartAmountsInput | null | undefined): number {
  if (!cart) return 0
  const items = cart.items
  if (items?.length) {
    let sum = 0
    for (const item of items) {
      const isGiftCard = isGiftCardItem(item)
      const lineCents =
        item.subtotal != null
          ? toPaymentCents(item.subtotal, isGiftCard)
          : toPaymentCents(item.unit_price, isGiftCard) * (item.quantity ?? 1)
      sum += lineCents
    }
    return sum
  }
  const itemTotal = cart.item_total ?? (cart.subtotal ?? 0) + (cart.tax_total ?? 0)
  return toPaymentCents(itemTotal)
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
 * Utilise les line items quand disponibles (Odoo=euros, bon cadeau=centimes).
 */
export function getItemsDisplayTotalEuros(cart: CartAmountsInput | null | undefined): number {
  if (!cart) return 0
  let itemEuros = getItemsTotalEuros(cart)
  if (isIntraCommunityExempt(cart)) {
    const itemTax = cart.item_tax_total ?? cart.tax_total ?? 0
    return Math.max(0, itemEuros - toDisplayEuros(itemTax))
  }
  return itemEuros
}

/** TVA belge standard 21 %. TVA = TTC × 0.21 / 1.21 */
const VAT_RATE = 0.21

/**
 * Calcule la TVA à afficher (en euros).
 * Si tax_total fourni par l'API > 0 : on l'utilise.
 * Sinon : calcul à partir du total TTC (TVA = TTC × 21% / 1.21).
 */
export function getDisplayTaxEuros(cart: CartAmountsInput | null | undefined): number {
  if (!cart) return 0
  if (isIntraCommunityExempt(cart)) return 0

  const apiTax = cart.tax_total ?? cart.item_tax_total ?? 0
  if (apiTax > 0) return toDisplayEuros(apiTax)

  const itemTotalEuros = getItemsTotalEuros(cart)
  const shippingEuros = toDisplayEuros(cart.shipping_total)
  const discountEuros = toDisplayEuros(cart.discount_total)
  const giftCardDeduction = toDisplayEuros(cart.gift_card_total, true)
  const totalTTC = itemTotalEuros + shippingEuros - discountEuros - giftCardDeduction

  return Math.round(totalTTC * (VAT_RATE / (1 + VAT_RATE)) * 100) / 100
}

/**
 * Calcule le total TVAC à afficher (en euros).
 * Cas intracommunautaire : total HT (sans TVA belge).
 */
export function getDisplayTotalTvacEuros(cart: CartAmountsInput | null | undefined): number {
  if (!cart) return 0
  const exempt = isIntraCommunityExempt(cart)
  const giftCardDeduction = toDisplayEuros(cart.gift_card_total, true)

  const itemTotalEuros = getItemsTotalEuros(cart)
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

  const itemCents = getItemsTotalCents(cart)
  const shippingCents = toPaymentCents(cart.shipping_total)
  const discountCents = toPaymentCents(cart.discount_total)
  const giftCardCents = toPaymentCents(cart.gift_card_total, true)

  let totalCents = itemCents + shippingCents - discountCents - giftCardCents

  if (exempt && cart.tax_total != null) {
    totalCents = Math.max(0, totalCents - toPaymentCents(cart.tax_total))
  }

  return Math.max(0, totalCents)
}
