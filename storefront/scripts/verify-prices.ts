/**
 * Vérifie la logique des prix (Odoo 59,95€) à travers tout le flux.
 * Usage: npx tsx scripts/verify-prices.ts
 * @see cart-amounts.ts
 * trigger deploy
 */

// Simule cart-amounts — tous les unit_price sont en euros
const AMOUNTS_IN_EUROS = true

function lineItemAmountToEuros(value: number | null | undefined): number {
  const v = value ?? 0
  return AMOUNTS_IN_EUROS ? v : v / 100
}

function toDisplayEuros(value: number | null | undefined): number {
  const v = value ?? 0
  return AMOUNTS_IN_EUROS ? v : v / 100
}

function toPaymentCents(value: number | null | undefined): number {
  const v = value ?? 0
  return AMOUNTS_IN_EUROS ? Math.round(v * 100) : Math.round(v)
}

function getItemsDisplayTotalEuros(cart: { item_total?: number; subtotal?: number; tax_total?: number }): number {
  const itemTotal = cart.item_total ?? (cart.subtotal ?? 0) + (cart.tax_total ?? 0)
  return toDisplayEuros(itemTotal)
}

function getDisplayTaxEuros(cart: { item_total?: number; subtotal?: number; tax_total?: number; shipping_total?: number; discount_total?: number; gift_card_total?: number }): number {
  const apiTax = cart.tax_total ?? 0
  if (apiTax > 0) return apiTax
  const itemTotal = cart.item_total ?? (cart.subtotal ?? 0) + (cart.tax_total ?? 0)
  const itemTotalEuros = toDisplayEuros(itemTotal)
  const shippingEuros = toDisplayEuros(cart.shipping_total)
  const discountEuros = toDisplayEuros(cart.discount_total)
  const giftCardDeduction = toDisplayEuros(cart.gift_card_total)
  const totalTTC = itemTotalEuros + shippingEuros - discountEuros - giftCardDeduction
  return Math.round(totalTTC * (0.21 / 1.21) * 100) / 100
}

function getDisplayTotalTvacEuros(cart: {
  item_total?: number
  subtotal?: number
  tax_total?: number
  shipping_total?: number
  discount_total?: number
  gift_card_total?: number
}): number {
  const itemTotal = cart.item_total ?? (cart.subtotal ?? 0) + (cart.tax_total ?? 0)
  const itemTotalEuros = toDisplayEuros(itemTotal)
  const shippingEuros = toDisplayEuros(cart.shipping_total)
  const discountEuros = toDisplayEuros(cart.discount_total)
  const giftCardDeduction = toDisplayEuros(cart.gift_card_total)
  return Math.max(0, itemTotalEuros + shippingEuros - discountEuros - giftCardDeduction)
}

function getPaymentAmountCents(cart: {
  item_total?: number
  subtotal?: number
  tax_total?: number
  shipping_total?: number
  discount_total?: number
  gift_card_total?: number
}): number {
  const itemTotal = cart.item_total ?? (cart.subtotal ?? 0) + (cart.tax_total ?? 0)
  const itemCents = toPaymentCents(itemTotal)
  const shippingCents = toPaymentCents(cart.shipping_total)
  const discountCents = toPaymentCents(cart.discount_total)
  const giftCardCents = toPaymentCents(cart.gift_card_total)
  return Math.max(0, itemCents + shippingCents - discountCents - giftCardCents)
}

function getItemsTotalEurosFromItems(cart: any): number {
  if (!cart?.items?.length) return 0
  let sum = 0
  for (const item of cart.items) {
    const lineTotal = item.subtotal != null
      ? item.subtotal
      : item.unit_price * (item.quantity ?? 1)
    sum += lineTotal
  }
  return sum
}

console.log('🔍 Vérification des prix — L-COMFORT BLEU ROY 59,95€ TTC\n')
console.log('─'.repeat(60))

// 1. Produit Odoo (API retourne 59.95 en euros)
const unitPriceOdoo = 59.95
const displayOdoo = lineItemAmountToEuros(unitPriceOdoo)
console.log('1. Page produit (line item Odoo):')
console.log(`   unit_price API: ${unitPriceOdoo} → affichage: ${displayOdoo}€`)
console.log(`   ${displayOdoo === 59.95 ? '✅' : '❌'} Attendu: 59,95€\n`)

// 2. Menu panier (dropdown)
const cartOdoo = { item_total: 59.95, subtotal: 49.55, tax_total: 10.40 }
const menuTotal = getItemsDisplayTotalEuros(cartOdoo)
console.log('2. Menu panier (dropdown):')
console.log(`   item_total: ${cartOdoo.item_total} → sous-total: ${menuTotal}€`)
console.log(`   ${menuTotal === 59.95 ? '✅' : '❌'} Attendu: 59,95€\n`)

// 3. Cart / Checkout
const cartWithShipping = { ...cartOdoo, shipping_total: 5.99 }
const checkoutTotal = getDisplayTotalTvacEuros(cartWithShipping)
const checkoutTax = getDisplayTaxEuros(cartWithShipping)
console.log('3. Checkout (articles + livraison):')
console.log(`   item_total: 59.95 + shipping: 5.99 → total: ${checkoutTotal}€`)
console.log(`   TVA calculée: ${checkoutTax}€ (21% du TTC)`)
console.log(`   ${checkoutTotal === 65.94 ? '✅' : '❌'} Attendu total: 65,94€`)
console.log(`   ${Math.abs(checkoutTax - 11.45) < 0.02 ? '✅' : '❌'} Attendu TVA: ~11,45€ (65,94 × 0.21/1.21)\n`)

// 4. Stripe
const stripeCents = getPaymentAmountCents(cartWithShipping)
console.log('4. Stripe (montant à charger):')
console.log(`   total: ${checkoutTotal}€ → centimes: ${stripeCents}`)
console.log(`   ${stripeCents === 6594 ? '✅' : '❌'} Attendu: 6594 centimes (65,94€)\n`)

// 5. Bon cadeau (euros — même convention que produits Odoo)
const giftCardUnit = 50 // 50€ en euros
const displayGiftCard = lineItemAmountToEuros(giftCardUnit)
console.log('5. Bon cadeau (euros):')
console.log(`   unit_price API: ${giftCardUnit} → affichage: ${displayGiftCard}€`)
console.log(`   ${displayGiftCard === 50 ? '✅' : '❌'} Attendu: 50,00€\n`)

// 6. Panier avec SEULEMENT bon cadeau 50€ (unit_price en euros)
const cartGiftCardOnly = {
  item_total: 50,
  items: [{ unit_price: 50, quantity: 1, subtotal: 50, metadata: { is_gift_card: true } }],
  shipping_total: 0,
  gift_card_total: 0
}
const totalGiftCardOnly = getItemsTotalEurosFromItems(cartGiftCardOnly)
console.log('6. Panier bon cadeau seul (50€):')
console.log(`   item_total API: 50 (euros) → affichage: ${totalGiftCardOnly}€`)
console.log(`   ${totalGiftCardOnly === 50 ? '✅' : '❌'} Attendu: 50€ (pas 5000€!)\n`)

// 7. Panier mixte (Odoo + bon cadeau) — calcul depuis items
const cartMixteItems = {
  item_total: 109.95,
  items: [
    { unit_price: 59.95, quantity: 1, subtotal: 59.95, variant: { product: { handle: "l-comfort" } } },
    { unit_price: 50, quantity: 1, subtotal: 50, metadata: { is_gift_card: true } }
  ],
  shipping_total: 0,
  discount_total: 0,
  gift_card_total: 0
}
const totalMixteFromItems = getItemsTotalEurosFromItems(cartMixteItems)
console.log('7. Panier mixte (59,95€ + 50€) — calcul depuis items:')
console.log(`   items: Odoo 59.95 + bon 50 euros → total: ${totalMixteFromItems}€`)
console.log(`   ${totalMixteFromItems === 109.95 ? '✅' : '❌'} Attendu: 109,95€\n`)

console.log('─'.repeat(60))
console.log('✅ Vérification terminée')
