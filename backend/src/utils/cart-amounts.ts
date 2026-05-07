/**
 * Calcul autoritaire du montant à charger pour un panier (paiement Stripe).
 *
 * Aligné avec `storefront/src/lib/util/cart-amounts.ts` ; tout changement ici
 * doit être répliqué côté storefront et vice-versa.
 *
 * Règles:
 *   - `unit_price` (articles Odoo & bons cadeau) est en euros TTC.
 *   - Les ajustements item sont stockés en HT (21 %) pour les articles taxables
 *     et en TTC pour les bons cadeau (TVA 0 %).
 *   - Les ajustements shipping sont stockés en valeur absolue positive (HT ou TTC
 *     selon le pays) — la promo FREE_SHIPPING_75 réduit toujours la livraison à 0.
 *   - L'exonération intracommunautaire déduit 21 % du total TTC.
 *   - Les bons cadeau (metadata.applied_gift_cards) sont un moyen de paiement
 *     déduit APRÈS la TVA (TTC pur).
 */

const VAT_RATE = 0.21

export type CartForAmount = {
  id?: string
  metadata?: Record<string, unknown> | null
  shipping_address?: { country_code?: string | null } | null
  items?: Array<{
    unit_price?: number | string | null
    compare_at_unit_price?: number | string | null
    quantity?: number | null
    metadata?: Record<string, unknown> | null
    product_title?: string | null
    title?: string | null
    variant_sku?: string | null
    adjustments?: Array<{ amount?: number | string | null }> | null
  }> | null
  shipping_methods?: Array<{
    amount?: number | string | null
    adjustments?: Array<{ amount?: number | string | null }> | null
  }> | null
}

function num(value: number | string | null | undefined): number {
  const v = typeof value === "string" ? Number(value) : (value ?? 0)
  return Number.isFinite(v) ? v : 0
}

function isGiftCardItem(item: NonNullable<CartForAmount["items"]>[number]): boolean {
  const md = item.metadata as any
  return !!(
    md?.is_gift_card ||
    String(item.product_title || item.title || "").toLowerCase().includes("bon cadeau") ||
    String(item.variant_sku || "").startsWith("GC-")
  )
}

/**
 * Détecte un article outlet : prix barré supérieur au prix actuel,
 * ou metadata.outlet_discount explicite.
 * Ces articles ont déjà leur remise dans unit_price → leurs adjustments
 * ne doivent PAS être déduits une seconde fois.
 */
function isOutletItem(item: NonNullable<CartForAmount["items"]>[number]): boolean {
  const md = item.metadata as any
  if (md?.outlet_discount === true) return true
  const compareAt = num(item.compare_at_unit_price)
  const unitPrice = num(item.unit_price)
  return compareAt > 0 && compareAt > unitPrice + 0.01
}

function adjustmentHtToTtc(htAmount: number, isGiftCard: boolean): number {
  return isGiftCard ? htAmount : htAmount * (1 + VAT_RATE)
}

function isIntraCommunityExempt(cart: CartForAmount | null | undefined): boolean {
  if (!cart) return false
  const vatNumber = (cart.metadata as any)?.vat_number || null
  const country = cart.shipping_address?.country_code?.toLowerCase()
  return !!(vatNumber && country && country !== "be")
}

/**
 * Somme unit_price × quantity (TTC garanti, puisque unit_price est TTC dans notre
 * modèle). N'utilise pas item.subtotal, qui est HT en mode tax-inclusive Medusa v2.
 */
function getItemsTotalEuros(cart: CartForAmount): number {
  const items = cart.items ?? []
  let sum = 0
  for (const item of items) {
    const unit = num(item.unit_price)
    const qty = item.quantity ?? 1
    sum += unit * qty
  }
  return sum
}

/**
 * Total des réductions item, en euros TTC. Stratégie : accumuler HT par groupe
 * fiscal (items taxables vs bons cadeau), convertir en TTC, arrondir à la fin.
 * Identique à `getItemAdjustmentsEuros` côté storefront pour garantir le même
 * arrondi au centime près.
 *
 * Les articles outlet sont exclus : leur remise est déjà dans unit_price.
 * Inclure leurs adjustments causerait une double déduction avec le prix
 * réduit, créant un écart entre l'affichage client et le montant Stripe.
 */
function getItemAdjustmentsEuros(cart: CartForAmount): number {
  const items = cart.items ?? []
  if (!items.length) return 0
  let regularHt = 0
  let giftCardHt = 0
  for (const item of items) {
    if (isOutletItem(item)) continue // remise déjà dans unit_price
    const isGC = isGiftCardItem(item)
    for (const adj of item.adjustments ?? []) {
      const amt = Math.abs(num(adj.amount))
      if (isGC) giftCardHt += amt
      else regularHt += amt
    }
  }
  const total = adjustmentHtToTtc(regularHt, false) + adjustmentHtToTtc(giftCardHt, true)
  return Math.round(total * 100) / 100
}

/**
 * Coût net de livraison, en euros TTC, à partir des shipping_methods.
 * Les ajustements sont stockés en valeur absolue positive ; selon le pays
 * ils peuvent être en HT (BE 21 %) ou TTC (Europe hors BE). On détecte
 * automatiquement en choisissant la conversion la plus proche du brut TTC.
 */
function getShippingTotalEuros(cart: CartForAmount): number {
  const methods = cart.shipping_methods ?? []
  let total = 0
  for (const m of methods) {
    const rawTtc = num(m.amount)
    const adjSum = (m.adjustments ?? []).reduce(
      (s, a) => s + Math.abs(num(a.amount)),
      0
    )
    if (adjSum === 0) {
      total += rawTtc
      continue
    }
    const adjTtc = adjSum * (1 + VAT_RATE)
    const resolved =
      Math.abs(adjTtc - rawTtc) <= Math.abs(adjSum - rawTtc) ? adjTtc : adjSum
    total += Math.max(0, rawTtc - resolved)
  }
  return Math.round(total * 100) / 100
}

function getAppliedGiftCardsEuros(cart: CartForAmount): number {
  const applied = (cart.metadata as any)?.applied_gift_cards as
    | Array<{ code?: string; balance?: number | string }>
    | undefined
  if (!applied?.length) return 0
  return applied.reduce((sum, gc) => sum + num(gc.balance), 0)
}

/**
 * Total TTC à payer (en euros), identique à `getDisplayTotalTvacEuros` côté
 * storefront. Source unique de vérité pour l'affichage et le paiement.
 */
export function getCartDisplayTotalEuros(cart: CartForAmount | null | undefined): number {
  if (!cart) return 0
  const exempt = isIntraCommunityExempt(cart)

  const itemsTtc = getItemsTotalEuros(cart)
  const shippingTtc = getShippingTotalEuros(cart)
  const discountTtc = getItemAdjustmentsEuros(cart)

  const totalBeforeGC = Math.max(0, itemsTtc + shippingTtc - discountTtc)

  let totalBeforeGCFinal = totalBeforeGC
  if (exempt) {
    const vatAmount = Math.round(totalBeforeGC * (VAT_RATE / (1 + VAT_RATE)) * 100) / 100
    totalBeforeGCFinal = Math.round((totalBeforeGC - vatAmount) * 100) / 100
  }

  const gcApplied = getAppliedGiftCardsEuros(cart)
  const gcDeduction = Math.min(gcApplied, totalBeforeGCFinal)

  return Math.max(0, totalBeforeGCFinal - gcDeduction)
}

/**
 * Montant Stripe en centimes (minor units). Strictement dérivé du total
 * affiché, pour qu'il n'y ait JAMAIS d'écart entre l'UI et la carte bancaire.
 */
export function getCartPaymentAmountCents(cart: CartForAmount | null | undefined): number {
  const euros = getCartDisplayTotalEuros(cart)
  return Math.max(0, Math.round(euros * 100))
}
