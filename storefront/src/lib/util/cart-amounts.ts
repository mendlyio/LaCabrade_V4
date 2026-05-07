/**
 * Utilitaire centralisé pour les montants du panier.
 * Tous les produits sont en TVAC (TTC).
 *
 * Tous les unit_price (produits Odoo ET bons cadeaux) sont en EUROS.
 * Les variant calculated_amount du pricing module restent en centimes
 * (gérés séparément dans get-product-price.ts et gift-card-form).
 */
const AMOUNTS_IN_EUROS = true

export function centsToEuros(cents: number | null | undefined): number {
  return (cents ?? 0) / 100
}

/** Convertit un montant API en euros pour affichage. */
function toDisplayEuros(value: number | null | undefined): number {
  const v = value ?? 0
  return AMOUNTS_IN_EUROS ? v : v / 100
}

/** Pour les line items : tous les unit_price sont en euros. */
export function lineItemAmountToEuros(value: number | null | undefined, _isGiftCard?: boolean): number {
  const v = value ?? 0
  return AMOUNTS_IN_EUROS ? v : v / 100
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
    compare_at_unit_price?: number | null
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

/**
 * Calcule le total articles en euros à partir des line items.
 * Utilise toujours unit_price × quantity (TTC garanti). item.subtotal peut être HT
 * dans le contexte order (Medusa v2 tax-inclusive décompose en HT).
 */
function getItemsTotalEurosFromItems(cart: CartAmountsInput | null | undefined): number | null {
  const items = cart?.items
  if (!items?.length) return null
  let sum = 0
  for (const item of items) {
    const lineTotal = lineItemAmountToEuros(item.unit_price) * (item.quantity ?? 1)
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
 * Utilise les line items quand disponibles (tous en euros).
 */
export function getItemsDisplayTotalEuros(cart: CartAmountsInput | null | undefined): number {
  if (!cart) return 0
  return getItemsTotalEuros(cart)
}

/**
 * Calcule le total des réductions item par item (en euros TTC) depuis les adjustments.
 * Retourne null si les adjustments ne sont pas disponibles (fallback nécessaire).
 * N'inclut PAS les réductions livraison (elles sont sur les shipping methods, pas les items).
 *
 * IMPORTANT: Medusa v2 tax-inclusive calcule les adjustments sur la base HT.
 * On convertit en TTC via × (1 + TVA) pour cohérence avec les prix affichés.
 *
 * Stratégie: on somme d'abord les montants HT en pleine précision (items classiques
 * d'un côté, bons cadeau de l'autre car TVA 0 %), puis on convertit une seule fois
 * en TTC avec un arrondi final. Évite la dérive d'arrondi par ligne.
 */
/**
 * Détecte un article outlet : remise déjà dans unit_price → ses adjustments
 * ne doivent pas être déduits une seconde fois dans le calcul du total payé.
 */
function isOutletItem(item: NonNullable<CartAmountsInput["items"]>[number]): boolean {
  if ((item.metadata as any)?.outlet_discount === true) return true
  const compareAt = item.compare_at_unit_price ?? 0
  const unitPrice = item.unit_price ?? 0
  return compareAt > 0 && compareAt > unitPrice + 0.01
}

export function getItemAdjustmentsEuros(cart: CartAmountsInput | null | undefined): number | null {
  const items = cart?.items
  if (!items?.length) return null
  if (!items.some(item => Array.isArray(item.adjustments))) return null
  let regularHt = 0
  let giftCardHt = 0
  for (const item of items) {
    if (isOutletItem(item)) continue // remise déjà dans unit_price, ne pas doubler
    const isGC = isGiftCardItem(item)
    for (const adj of item.adjustments || []) {
      const amtEuros = Math.abs(lineItemAmountToEuros(adj.amount))
      if (isGC) giftCardHt += amtEuros
      else regularHt += amtEuros
    }
  }
  const total = adjustmentHtToTtc(regularHt, false) + adjustmentHtToTtc(giftCardHt, true)
  return Math.round(total * 100) / 100
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

/** TVA belge standard 21 %. TVA = TTC × 0.21 / 1.21 */
const VAT_RATE = 0.21

/**
 * Convertit un montant d'adjustment HT en TTC.
 * Medusa v2 tax-inclusive : les adjustments sont calculés sur la base HT.
 * Les bons cadeau ont 0 % de TVA, donc pas de conversion nécessaire.
 */
export function adjustmentHtToTtc(htAmount: number, isGiftCard: boolean): number {
  return isGiftCard ? htAmount : htAmount * (1 + VAT_RATE)
}

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
 * Retourne la somme des soldes des bons cadeau appliqués (en euros TTC)
 * depuis cart.metadata.applied_gift_cards.
 */
export function getAppliedGiftCardsEuros(cart: CartAmountsInput | null | undefined): number {
  const applied = (cart?.metadata as any)?.applied_gift_cards as
    | Array<{ code: string; balance: number }>
    | undefined
  if (!applied?.length) return 0
  return applied.reduce((sum, gc) => sum + Number(gc.balance || 0), 0)
}

/**
 * Calcule le total avant déduction bon cadeau (en euros TTC).
 * = articles + livraison − réductions classiques
 */
function getTotalBeforeGiftCardEuros(cart: CartAmountsInput | null | undefined): number {
  if (!cart) return 0
  const itemTotalEuros = getItemsTotalEuros(cart)
  const shippingEuros = toDisplayEuros(cart.shipping_total)
  const discountEuros = getDiscountEuros(cart)
  return Math.max(0, itemTotalEuros + shippingEuros - discountEuros)
}

/**
 * Déduction effective du bon cadeau (en euros).
 * = MIN(somme des soldes GC, total avant GC)
 */
export function getGiftCardDeductionEuros(cart: CartAmountsInput | null | undefined): number {
  const gcTotal = getAppliedGiftCardsEuros(cart)
  if (gcTotal <= 0) return 0
  const totalBeforeGC = getTotalBeforeGiftCardEuros(cart)
  return Math.min(gcTotal, totalBeforeGC)
}

/**
 * Calcule la TVA à afficher (en euros).
 * La TVA est calculée sur le total AVANT déduction bon cadeau, car le bon cadeau
 * est un moyen de paiement (TTC), pas une réduction fiscale.
 * Cas intracommunautaire : retourne la TVA en NÉGATIF (montant déduit).
 */
export function getDisplayTaxEuros(cart: CartAmountsInput | null | undefined): number {
  if (!cart) return 0

  const totalTTCBeforeGC = getTotalBeforeGiftCardEuros(cart)
  const vatAmount = Math.round(totalTTCBeforeGC * (VAT_RATE / (1 + VAT_RATE)) * 100) / 100

  if (isIntraCommunityExempt(cart)) {
    return -vatAmount
  }
  return vatAmount
}

/**
 * Calcule le total à afficher (en euros) = montant à payer.
 * = (articles + livraison − réductions) − bon cadeau
 * Cas intracommunautaire : total HT = TTC − TVA, puis − bon cadeau.
 */
export function getDisplayTotalTvacEuros(cart: CartAmountsInput | null | undefined): number {
  if (!cart) return 0
  const exempt = isIntraCommunityExempt(cart)
  const totalTTCBeforeGC = getTotalBeforeGiftCardEuros(cart)
  const gcDeduction = getGiftCardDeductionEuros(cart)

  if (exempt) {
    const vatAmount = Math.round(totalTTCBeforeGC * (VAT_RATE / (1 + VAT_RATE)) * 100) / 100
    const totalHT = Math.round((totalTTCBeforeGC - vatAmount) * 100) / 100
    return Math.max(0, totalHT - gcDeduction)
  }
  return Math.max(0, totalTTCBeforeGC - gcDeduction)
}

/**
 * Calcule le montant à charger (Stripe) en centimes.
 * Stripe attend les minor units.
 *
 * IMPORTANT : le montant Stripe est strictement dérivé du total affiché au client
 * (`getDisplayTotalTvacEuros`). Cela garantit qu'il n'y a JAMAIS d'écart entre ce
 * que le client voit dans le checkout, dans le mail de confirmation et ce qui est
 * effectivement prélevé. Tout nouvel arrondi ou règle fiscale doit donc passer
 * par `getDisplayTotalTvacEuros` uniquement.
 */
export function getPaymentAmountCents(cart: CartAmountsInput | null | undefined): number {
  const euros = getDisplayTotalTvacEuros(cart)
  return Math.max(0, Math.round(euros * 100))
}
