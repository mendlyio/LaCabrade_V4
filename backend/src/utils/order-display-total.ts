/**
 * Calcule le total à afficher pour une commande (identique au checkout).
 * Aligné avec storefront/src/lib/util/cart-amounts.ts (getDisplayTotalTvacEuros).
 *
 * Tous les unit_price (produits Odoo ET bons cadeaux) sont en euros.
 */
const AMOUNTS_IN_EUROS = true
const VAT_RATE = 0.21

function adjustmentHtToTtc(htAmount: number, isGiftCard: boolean): number {
  return isGiftCard ? htAmount : htAmount * (1 + VAT_RATE)
}

function toDisplayEuros(value: number | null | undefined): number {
  const v = value ?? 0
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

function lineItemAmountToEuros(value: number | null | undefined): number {
  const v = value ?? 0
  return AMOUNTS_IN_EUROS ? v : v / 100
}

/**
 * Total articles TTC. Utilise toujours unit_price × quantity (TTC garanti).
 * item.subtotal dans le contexte order peut être HT (Medusa v2 tax-inclusive).
 */
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
      const lineTotal = lineItemAmountToEuros(item.unit_price) * (item.quantity ?? 1)
      sum += lineTotal
    }
    return sum
  }
  const itemTotal = order.item_total ?? (order.subtotal ?? 0) + (order.tax_total ?? 0)
  return toDisplayEuros(itemTotal)
}

/**
 * Calcule le total des réductions item par item (en euros TTC) depuis les adjustments.
 * Retourne null si les adjustments ne sont pas disponibles.
 * N'inclut PAS les réductions livraison (elles sont sur les shipping methods, pas les items).
 *
 * Medusa v2 tax-inclusive : adjustments stockés en HT pour les articles taxables (21 %),
 * et en valeur équivalente TTC pour les bons cadeau (TVA 0 %). On accumule chaque
 * groupe en pleine précision puis on applique UNE SEULE conversion TTC finale —
 * cela garantit que le total affiché coïncide au centime près avec le montant
 * chargé par Stripe (même algorithme d'arrondi côté storefront).
 */
function getItemAdjustmentsEuros(order: OrderForDisplayTotal | null | undefined): number | null {
  const items = order?.items
  if (!items?.length) return null
  if (!items.some(item => Array.isArray(item.adjustments))) return null
  let regularHt = 0
  let giftCardHt = 0
  for (const item of items) {
    const isGiftCard = isGiftCardItem(item)
    for (const adj of item.adjustments || []) {
      const amt = Math.abs(lineItemAmountToEuros(adj.amount))
      if (isGiftCard) giftCardHt += amt
      else regularHt += amt
    }
  }
  const total = adjustmentHtToTtc(regularHt, false) + adjustmentHtToTtc(giftCardHt, true)
  return Math.round(total * 100) / 100
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
 * Retourne la déduction bon cadeau en euros depuis order.metadata.applied_gift_cards.
 * Plafonnée au total avant GC pour ne jamais produire un total négatif.
 */
function getAppliedGiftCardsDeduction(
  order: OrderForDisplayTotal,
  totalBeforeGC: number
): number {
  const applied = (order.metadata as any)?.applied_gift_cards as
    | Array<{ balance: number }>
    | undefined
  if (!applied?.length) return 0
  const gcTotal = applied.reduce((sum, gc) => sum + Number(gc.balance || 0), 0)
  return Math.min(gcTotal, totalBeforeGC)
}

/**
 * Calcule le total à afficher pour une commande (identique au checkout).
 * Gère : exonération TVA intracommunautaire, promo livraison gratuite, bon cadeau.
 *
 * Le bon cadeau est lu depuis order.metadata.applied_gift_cards (déduction TTC pure,
 * appliquée après la TVA — c'est un moyen de paiement, pas une réduction fiscale).
 */
export function getOrderDisplayTotalEuros(order: OrderForDisplayTotal | null | undefined): number {
  if (!order) return 0
  const exempt = isIntraCommunityExempt(order)

  const itemTotalEuros = getItemsTotalEuros(order)
  const shippingEuros = toDisplayEuros(order.shipping_total)
  const discountEuros = getDiscountEuros(order)

  const totalBeforeGC = Math.max(0, itemTotalEuros + shippingEuros - discountEuros)

  if (exempt) {
    const vatAmount = Math.round(totalBeforeGC * (VAT_RATE / (1 + VAT_RATE)) * 100) / 100
    const totalHT = Math.round((totalBeforeGC - vatAmount) * 100) / 100
    const gcDeduction = getAppliedGiftCardsDeduction(order, totalHT)
    return Math.max(0, totalHT - gcDeduction)
  }

  const gcDeduction = getAppliedGiftCardsDeduction(order, totalBeforeGC)
  return Math.max(0, totalBeforeGC - gcDeduction)
}
