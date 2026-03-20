/**
 * Calcule le total à afficher pour une commande (identique au checkout).
 * Aligné avec storefront/src/lib/util/cart-amounts.ts (getDisplayTotalTvacEuros).
 *
 * Les produits Odoo sont en euros. Seul gift_card_total est en centimes.
 */
const AMOUNTS_IN_EUROS = true
const VAT_RATE = 0.21

function toDisplayEuros(value: number | null | undefined, isGiftCard = false): number {
  const v = value ?? 0
  if (isGiftCard) return v / 100
  return AMOUNTS_IN_EUROS ? v : v / 100
}

function isGiftCardItem(item: {
  metadata?: Record<string, unknown> | null
  product_title?: string | null
  title?: string | null
  variant_sku?: string | null
}): boolean {
  return !!(
    (item.metadata as any)?.is_gift_card ||
    String(item.product_title || item.title || "").toLowerCase().includes("bon cadeau") ||
    (item.variant_sku || "").startsWith("GC-")
  )
}

function lineItemAmountToEuros(value: number | null | undefined, isGiftCard: boolean): number {
  const v = value ?? 0
  return isGiftCard ? v / 100 : (AMOUNTS_IN_EUROS ? v : v / 100)
}

function getItemsTotalEuros(order: {
  items?: Array<{
    unit_price?: number | null
    subtotal?: number | null
    quantity?: number | null
    adjustments?: Array<{ amount?: number | null }> | null
    metadata?: Record<string, unknown> | null
    product_title?: string | null
    title?: string | null
    variant_sku?: string | null
  }> | null
  item_total?: number | null
  subtotal?: number | null
  tax_total?: number | null
}): number {
  const items = order.items
  if (items?.length) {
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
  const itemTotal = order.item_total ?? (order.subtotal ?? 0) + (order.tax_total ?? 0)
  return toDisplayEuros(itemTotal)
}

/**
 * Calcule le total des réductions item par item (en euros) depuis les adjustments.
 * Retourne null si les adjustments ne sont pas disponibles.
 * N'inclut PAS les réductions livraison (elles sont sur les shipping methods, pas les items).
 */
function getItemAdjustmentsEuros(order: OrderForDisplayTotal | null | undefined): number | null {
  const items = order?.items
  if (!items?.length) return null
  if (!items.some(item => Array.isArray(item.adjustments))) return null
  let sum = 0
  for (const item of items) {
    const isGiftCard = isGiftCardItem(item)
    for (const adj of item.adjustments || []) {
      sum += Math.abs(lineItemAmountToEuros(adj.amount, isGiftCard))
    }
  }
  return sum
}

function isIntraCommunityExempt(order: {
  metadata?: Record<string, unknown> | null
  shipping_address?: { country_code?: string | null } | null
}): boolean {
  const vatNumber = (order.metadata as any)?.vat_number || null
  const country = order.shipping_address?.country_code?.toLowerCase()
  return !!(vatNumber && country && country !== "be")
}

function isFreeShippingDiscount(
  shippingTotal: number | null | undefined,
  discountTotal: number | null | undefined
): boolean {
  const ship = shippingTotal ?? 0
  const disc = discountTotal ?? 0
  if (ship > 0 || disc <= 0) return false
  const matchStandard = disc >= 6 && disc <= 7.5
  const matchExpress = disc >= 12 && disc <= 13.5
  return matchStandard || matchExpress
}

/**
 * Calcule la réduction en euros à soustraire du total.
 * Préfère les adjustments item (précis) ; fallback sur discount_total + heuristique.
 */
function getDiscountEuros(order: OrderForDisplayTotal | null | undefined): number {
  const itemAdj = getItemAdjustmentsEuros(order)
  if (itemAdj !== null) return itemAdj
  return isFreeShippingDiscount(order?.shipping_total, order?.discount_total)
    ? 0
    : toDisplayEuros(order?.discount_total)
}

export type OrderForDisplayTotal = {
  items?: Array<{
    unit_price?: number | null
    subtotal?: number | null
    quantity?: number | null
    adjustments?: Array<{ amount?: number | null }> | null
    metadata?: Record<string, unknown> | null
    product_title?: string | null
    title?: string | null
    variant_sku?: string | null
  }> | null
  item_total?: number | null
  subtotal?: number | null
  tax_total?: number | null
  shipping_total?: number | null
  discount_total?: number | null
  gift_card_total?: number | null
  metadata?: Record<string, unknown> | null
  shipping_address?: { country_code?: string | null } | null
}

/**
 * Calcule le total à afficher pour une commande (identique au checkout).
 * Gère : exonération TVA intracommunautaire, promo livraison gratuite, carte cadeau.
 *
 * Utilise les adjustments item par item quand disponibles pour éviter la double
 * déduction lorsque livraison gratuite + code promo sont combinés.
 */
export function getOrderDisplayTotalEuros(order: OrderForDisplayTotal | null | undefined): number {
  if (!order) return 0
  const exempt = isIntraCommunityExempt(order)
  const giftCardDeduction = toDisplayEuros(order.gift_card_total, true)

  const itemTotalEuros = getItemsTotalEuros(order)
  const shippingEuros = toDisplayEuros(order.shipping_total)
  const discountEuros = getDiscountEuros(order)

  const totalTTC = itemTotalEuros + shippingEuros - discountEuros - giftCardDeduction

  if (exempt) {
    const vatAmount = Math.round(totalTTC * (VAT_RATE / (1 + VAT_RATE)) * 100) / 100
    return Math.round((totalTTC - vatAmount) * 100) / 100
  }
  return Math.max(0, totalTTC)
}
