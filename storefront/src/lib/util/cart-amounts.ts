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

/** Panier contenant uniquement des bons cadeau (Bon Cadeau La Cabrade) */
export function isGiftCardOnlyCart(cart: {
  items?: Array<{
    metadata?: Record<string, unknown> | null
    product_title?: string | null
    title?: string | null
    variant_sku?: string | null
    variant?: { product?: { handle?: string } }
  }> | null
}): boolean {
  const items = cart?.items ?? []
  if (items.length === 0) return false
  return items.every(item => isGiftCardItem(item))
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
    adjustments?: Array<{ amount?: number | null; code?: string | null }> | null
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
 * Sous-total articles pour affichage (toujours TVAC).
 * Utilise les line items quand disponibles (Odoo=euros, bon cadeau=centimes).
 */
export function getItemsDisplayTotalEuros(cart: CartAmountsInput | null | undefined): number {
  if (!cart) return 0
  return getItemsTotalEuros(cart)
}

/**
 * Calcule le total des réductions item par item (en euros) depuis les adjustments.
 * Retourne null si les adjustments ne sont pas disponibles (fallback nécessaire).
 * N'inclut PAS les réductions livraison (elles sont sur les shipping methods, pas les items).
 */
export function getItemAdjustmentsEuros(cart: CartAmountsInput | null | undefined): number | null {
  const items = cart?.items
  if (!items?.length) return null
  if (!items.some(item => Array.isArray(item.adjustments))) return null
  let sum = 0
  for (const item of items) {
    const isGC = isGiftCardItem(item)
    for (const adj of item.adjustments || []) {
      sum += Math.abs(lineItemAmountToEuros(adj.amount, isGC))
    }
  }
  return sum
}

/**
 * Calcule le total des réductions item par item (en centimes) depuis les adjustments.
 * Retourne null si les adjustments ne sont pas disponibles.
 */
function getItemAdjustmentsCents(cart: CartAmountsInput | null | undefined): number | null {
  const items = cart?.items
  if (!items?.length) return null
  if (!items.some(item => Array.isArray(item.adjustments))) return null
  let sum = 0
  for (const item of items) {
    const isGC = isGiftCardItem(item)
    for (const adj of item.adjustments || []) {
      sum += Math.abs(toPaymentCents(adj.amount ?? 0, isGC))
    }
  }
  return sum
}

/**
 * Calcule la réduction en euros à soustraire du total.
 * Préfère les adjustments item (précis) ; fallback sur discount_total + heuristique.
 */
function getDiscountEuros(cart: CartAmountsInput | null | undefined): number {
  const itemAdj = getItemAdjustmentsEuros(cart)
  if (itemAdj !== null) return itemAdj
  return isFreeShippingDiscount(cart?.shipping_total, cart?.discount_total)
    ? 0
    : toDisplayEuros(cart?.discount_total)
}

/**
 * Calcule la réduction en centimes à soustraire du total (pour Stripe).
 * Préfère les adjustments item (précis) ; fallback sur discount_total + heuristique.
 */
function getDiscountCents(cart: CartAmountsInput | null | undefined): number {
  const itemAdj = getItemAdjustmentsCents(cart)
  if (itemAdj !== null) return itemAdj
  return isFreeShippingDiscount(cart?.shipping_total, cart?.discount_total)
    ? 0
    : toPaymentCents(cart?.discount_total)
}

/** TVA belge standard 21 %. TVA = TTC × 0.21 / 1.21 */
const VAT_RATE = 0.21

/**
 * Détecte si discount_total provient de la promo livraison gratuite (FREE_SHIPPING_75).
 * Medusa renvoie shipping_total=0 ET discount_total=6,90, ce qui crée une double déduction.
 * Dans ce cas, on ne doit PAS soustraire discount_total (déjà reflété dans shipping=0).
 */
export function isFreeShippingDiscount(
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
 * Calcule la TVA à afficher (en euros).
 * Toujours calculée côté frontend pour éviter les bugs d'unité (API peut renvoyer centimes).
 * Cas intracommunautaire : retourne la TVA en NÉGATIF (montant déduit).
 */
export function getDisplayTaxEuros(cart: CartAmountsInput | null | undefined): number {
  if (!cart) return 0

  const itemTotalEuros = getItemsTotalEuros(cart)
  const shippingEuros = toDisplayEuros(cart.shipping_total)
  const discountEuros = getDiscountEuros(cart)
  const giftCardDeduction = toDisplayEuros(cart.gift_card_total, true)
  const totalTTC = itemTotalEuros + shippingEuros - discountEuros - giftCardDeduction

  const vatAmount = Math.round(totalTTC * (VAT_RATE / (1 + VAT_RATE)) * 100) / 100

  if (isIntraCommunityExempt(cart)) {
    return -vatAmount
  }
  return vatAmount
}

/**
 * Calcule le total à afficher (en euros).
 * Cas intracommunautaire : total HT = TTC - TVA (TVA déduite).
 *
 * Utilise les adjustments item par item quand disponibles pour éviter la double
 * déduction lorsque livraison gratuite + code promo sont combinés.
 */
export function getDisplayTotalTvacEuros(cart: CartAmountsInput | null | undefined): number {
  if (!cart) return 0
  const exempt = isIntraCommunityExempt(cart)
  const giftCardDeduction = toDisplayEuros(cart.gift_card_total, true)

  const itemTotalEuros = getItemsTotalEuros(cart)
  const shippingEuros = toDisplayEuros(cart.shipping_total)
  const discountEuros = getDiscountEuros(cart)

  const totalTTC = itemTotalEuros + shippingEuros - discountEuros - giftCardDeduction

  if (exempt) {
    const vatAmount = Math.round(totalTTC * (VAT_RATE / (1 + VAT_RATE)) * 100) / 100
    return Math.round((totalTTC - vatAmount) * 100) / 100
  }
  return Math.max(0, totalTTC)
}

/**
 * Calcule le montant à charger (Stripe) en centimes.
 * Stripe attend les minor units.
 * Cas intracommunautaire : déduit la TVA (total HT).
 *
 * Utilise les adjustments item par item quand disponibles pour éviter la double
 * déduction lorsque livraison gratuite + code promo sont combinés.
 */
export function getPaymentAmountCents(cart: CartAmountsInput | null | undefined): number {
  if (!cart) return 0
  const exempt = isIntraCommunityExempt(cart)

  const itemCents = getItemsTotalCents(cart)
  const shippingCents = toPaymentCents(cart.shipping_total)
  const discountCents = getDiscountCents(cart)
  const giftCardCents = toPaymentCents(cart.gift_card_total, true)

  let totalCents = itemCents + shippingCents - discountCents - giftCardCents

  if (exempt) {
    const totalTTC = totalCents / 100
    const vatAmount = totalTTC * (VAT_RATE / (1 + VAT_RATE))
    totalCents = Math.round((totalTTC - vatAmount) * 100)
  }

  return Math.max(0, totalCents)
}
