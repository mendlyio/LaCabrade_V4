/**
 * Calcule le montant TTC à charger pour le paiement.
 * Priorité : item_total + shipping_total - discount_total (tous TTC) pour garantir la TVA.
 * Fallback : cart.total de l'API Store.
 */
export function getPaymentAmountFromCart(cart: {
  total?: number | null
  item_total?: number | null
  subtotal?: number | null
  tax_total?: number | null
  shipping_total?: number | null
  discount_total?: number | null
  gift_card_total?: number | null
  items?: Array<{ subtotal?: number; unit_price?: number; quantity?: number; metadata?: Record<string, unknown> }>
  metadata?: Record<string, unknown> | null
  shipping_address?: { country_code?: string | null } | null
}): number {
  const toEuros = (v: number | null | undefined) => (v ?? 0) / 100
  const hasGiftCard = cart.items?.some(
    (i: any) =>
      i?.metadata?.is_gift_card ||
      String(i?.product_title || i?.title || "").toLowerCase().includes("bon cadeau") ||
      (i?.variant?.product as any)?.handle === "bon-cadeau"
  )

  const giftCardDeduction = cart.gift_card_total != null ? toEuros(cart.gift_card_total) : 0

  // Calcul explicite TTC (identique à CartTotals)
  const itemTotal = cart.item_total ?? (cart.subtotal ?? 0) + (cart.tax_total ?? 0)
  const shippingTotal = hasGiftCard ? toEuros(cart.shipping_total) : (cart.shipping_total ?? 0)
  const discountTotal = hasGiftCard ? toEuros(cart.discount_total) : (cart.discount_total ?? 0)
  const computedTotal = itemTotal + shippingTotal - discountTotal - giftCardDeduction

  const vatNumber = (cart.metadata as any)?.vat_number || null
  const customerCountry = cart.shipping_address?.country_code?.toLowerCase()
  const isIntraCommunityExempt = !!(vatNumber && customerCountry && customerCountry !== "be")

  if (isIntraCommunityExempt && cart.total != null) {
    const taxFromApi = hasGiftCard ? toEuros(cart.tax_total) : (cart.tax_total ?? 0)
    return Math.max(0, (hasGiftCard ? toEuros(cart.total) : cart.total) - taxFromApi - giftCardDeduction)
  }

  return Math.max(0, computedTotal) || (cart.total ?? 0)
}
