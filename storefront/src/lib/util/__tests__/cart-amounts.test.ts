/**
 * Tests des calculs de prix du panier.
 * Exécuter : cd storefront && npx tsx src/lib/util/__tests__/cart-amounts.test.ts
 */
import {
  getDisplayTotalTvacEuros,
  getPaymentAmountCents,
  getDisplayTaxEuros,
  getItemsDisplayTotalEuros,
  getItemAdjustmentsEuros,
  isFreeShippingDiscount,
  isIntraCommunityExempt,
  CartAmountsInput,
} from "../cart-amounts"

let passed = 0
let failed = 0

function assert(label: string, actual: number, expected: number, tolerance = 0.01) {
  const ok = Math.abs(actual - expected) <= tolerance
  if (ok) {
    console.log(`  ✅ ${label}: ${actual}`)
    passed++
  } else {
    console.log(`  ❌ ${label}: got ${actual}, expected ${expected}`)
    failed++
  }
}

function heading(text: string) {
  console.log(`\n${"═".repeat(60)}`)
  console.log(`  ${text}`)
  console.log(`${"═".repeat(60)}`)
}

// ═══════════════════════════════════════════════════════════
// SCÉNARIO 1: Article Odoo simple, pas de promo
// Cartouche airbag 15€ + livraison standard 6,90€
// ═══════════════════════════════════════════════════════════
heading("SCÉNARIO 1: Cartouche 15€ + livraison standard")

const cart1: CartAmountsInput = {
  item_total: 15,
  subtotal: 15,
  tax_total: 0,
  shipping_total: 6.9,
  discount_total: 0,
  gift_card_total: 0,
  items: [
    {
      unit_price: 15,
      subtotal: 15,
      quantity: 1,
      adjustments: [],
      product_title: "Cartouche airbag 24gr LC EQUESTRIAN",
      variant_sku: "72333",
    },
  ],
  shipping_address: { country_code: "be" },
}

assert("Sous-total articles", getItemsDisplayTotalEuros(cart1), 15)
assert("Total affiché", getDisplayTotalTvacEuros(cart1), 21.9)
assert("Montant Stripe (cents)", getPaymentAmountCents(cart1), 2190)
assert("TVA", getDisplayTaxEuros(cart1), 3.8)

// ═══════════════════════════════════════════════════════════
// SCÉNARIO 2: Article 15€ + code promo -15% (SORRY15)
// ═══════════════════════════════════════════════════════════
heading("SCÉNARIO 2: Cartouche 15€ + promo -15% + livraison standard")

const cart2: CartAmountsInput = {
  item_total: 15,
  subtotal: 15,
  shipping_total: 6.9,
  discount_total: 2.25, // 15 × 15%
  gift_card_total: 0,
  items: [
    {
      unit_price: 15,
      subtotal: 15,
      quantity: 1,
      adjustments: [{ amount: 2.25, code: "SORRY15" }],
      product_title: "Cartouche airbag 24gr LC EQUESTRIAN",
      variant_sku: "72333",
    },
  ],
  shipping_address: { country_code: "be" },
}

assert("Sous-total articles", getItemsDisplayTotalEuros(cart2), 15)
assert("Réduction (adjustments)", getItemAdjustmentsEuros(cart2)!, 2.25)
assert("Total affiché", getDisplayTotalTvacEuros(cart2), 19.65)
assert("Montant Stripe (cents)", getPaymentAmountCents(cart2), 1965)

// ═══════════════════════════════════════════════════════════
// SCÉNARIO 3: Panier 80€ + livraison GRATUITE (>75€)
// ═══════════════════════════════════════════════════════════
heading("SCÉNARIO 3: 80€ articles + livraison gratuite (>75€)")

const cart3: CartAmountsInput = {
  item_total: 80,
  subtotal: 80,
  shipping_total: 0, // Medusa met à 0 quand free shipping
  discount_total: 6.9, // Medusa ajoute le montant livraison dans discount_total
  gift_card_total: 0,
  items: [
    {
      unit_price: 80,
      subtotal: 80,
      quantity: 1,
      adjustments: [], // PAS d'adjustment item : la réduction est sur le shipping method
      product_title: "Selle Odoo",
      variant_sku: "SELLE-001",
    },
  ],
  shipping_address: { country_code: "be" },
}

assert("Sous-total articles", getItemsDisplayTotalEuros(cart3), 80)
assert("Réduction items", getItemAdjustmentsEuros(cart3)!, 0)
assert("Total affiché", getDisplayTotalTvacEuros(cart3), 80) // 80 + 0 shipping - 0 item discount
assert("Montant Stripe (cents)", getPaymentAmountCents(cart3), 8000)
console.log("  ℹ️  isFreeShippingDiscount(0, 6.9) =", isFreeShippingDiscount(0, 6.9), "(fallback, non utilisé ici)")

// ═══════════════════════════════════════════════════════════
// SCÉNARIO 4: BUG PRINCIPAL — 80€ + livraison gratuite + promo -10€
// Avant fix: total = 80 + 0 - 16.90 = 63.10 (FAUX!)
// Après fix: total = 80 + 0 - 10 = 70 (CORRECT)
// ═══════════════════════════════════════════════════════════
heading("SCÉNARIO 4 (BUG PRINCIPAL): 80€ + livraison gratuite + promo -10€")

const cart4: CartAmountsInput = {
  item_total: 80,
  subtotal: 80,
  shipping_total: 0,
  discount_total: 16.9, // 6.90 (shipping) + 10 (promo) — Medusa combine les deux
  gift_card_total: 0,
  items: [
    {
      unit_price: 80,
      subtotal: 80,
      quantity: 1,
      adjustments: [{ amount: 10, code: "PROMO10" }], // Seule la promo article est ici
      product_title: "Selle Odoo",
      variant_sku: "SELLE-001",
    },
  ],
  shipping_address: { country_code: "be" },
}

assert("Sous-total articles", getItemsDisplayTotalEuros(cart4), 80)
assert("Réduction items (adjustments)", getItemAdjustmentsEuros(cart4)!, 10)
assert("Total CORRECT", getDisplayTotalTvacEuros(cart4), 70) // 80 + 0 - 10 = 70
assert("Montant Stripe (cents)", getPaymentAmountCents(cart4), 7000)
console.log("  ℹ️  ANCIEN bug: 80 + 0 - 16.90 = 63.10 → maintenant corrigé: 70.00")

// ═══════════════════════════════════════════════════════════
// SCÉNARIO 5: Bon cadeau 50€ (prix en CENTIMES)
// ═══════════════════════════════════════════════════════════
heading("SCÉNARIO 5: Bon cadeau 50€ (unit_price en centimes)")

const cart5: CartAmountsInput = {
  item_total: 5000, // Centimes !
  subtotal: 5000,
  shipping_total: 0, // Livraison numérique
  discount_total: 0,
  gift_card_total: 0,
  items: [
    {
      unit_price: 5000, // 50€ en centimes
      subtotal: 5000,
      quantity: 1,
      adjustments: [],
      metadata: { is_gift_card: true },
      product_title: "Bon Cadeau La Cabrade - 50€",
      variant_sku: "GC-50",
    },
  ],
  shipping_address: { country_code: "be" },
}

assert("Sous-total articles", getItemsDisplayTotalEuros(cart5), 50)
assert("Total affiché", getDisplayTotalTvacEuros(cart5), 50)
assert("Montant Stripe (cents)", getPaymentAmountCents(cart5), 5000)

// ═══════════════════════════════════════════════════════════
// SCÉNARIO 6: Mix — Article Odoo 15€ + Bon cadeau 25€
// ═══════════════════════════════════════════════════════════
heading("SCÉNARIO 6: Cartouche 15€ + Bon cadeau 25€ + livraison standard")

const cart6: CartAmountsInput = {
  shipping_total: 6.9,
  discount_total: 0,
  gift_card_total: 0,
  items: [
    {
      unit_price: 15,
      subtotal: 15,
      quantity: 1,
      adjustments: [],
      product_title: "Cartouche airbag 24gr LC EQUESTRIAN",
      variant_sku: "72333",
    },
    {
      unit_price: 2500, // 25€ en centimes
      subtotal: 2500,
      quantity: 1,
      adjustments: [],
      metadata: { is_gift_card: true },
      product_title: "Bon Cadeau La Cabrade - 25€",
      variant_sku: "GC-25",
    },
  ],
  shipping_address: { country_code: "be" },
}

assert("Sous-total articles", getItemsDisplayTotalEuros(cart6), 40) // 15 + 25
assert("Total affiché", getDisplayTotalTvacEuros(cart6), 46.9) // 15 + 25 + 6.90
assert("Montant Stripe (cents)", getPaymentAmountCents(cart6), 4690)

// ═══════════════════════════════════════════════════════════
// SCÉNARIO 7: TVA intracommunautaire (France)
// ═══════════════════════════════════════════════════════════
heading("SCÉNARIO 7: Article 100€ + TVA intracommunautaire (France)")

const cart7: CartAmountsInput = {
  item_total: 100,
  subtotal: 100,
  shipping_total: 6.9,
  discount_total: 0,
  gift_card_total: 0,
  items: [
    {
      unit_price: 100,
      subtotal: 100,
      quantity: 1,
      adjustments: [],
      product_title: "Produit test",
      variant_sku: "TEST-001",
    },
  ],
  metadata: { vat_number: "FR12345678901" },
  shipping_address: { country_code: "fr" },
}

const totalHT = getDisplayTotalTvacEuros(cart7)
const tva = getDisplayTaxEuros(cart7)
assert("Exonéré TVA", isIntraCommunityExempt(cart7) ? 1 : 0, 1)
assert("TVA (négatif = déduit)", tva, -18.55, 0.02) // -(106.9 × 0.21/1.21) = 18.55
assert("Total HT", totalHT, 88.35, 0.02) // 106.9 - 18.55
assert("Stripe (cents)", getPaymentAmountCents(cart7), 8835, 2)

// ═══════════════════════════════════════════════════════════
// SCÉNARIO 8: Utilisation d'une carte cadeau Medusa
// ═══════════════════════════════════════════════════════════
heading("SCÉNARIO 8: Article 50€ + carte cadeau 20€ + livraison")

const cart8: CartAmountsInput = {
  item_total: 50,
  subtotal: 50,
  shipping_total: 6.9,
  discount_total: 0,
  gift_card_total: 2000, // 20€ en centimes (carte cadeau Medusa)
  items: [
    {
      unit_price: 50,
      subtotal: 50,
      quantity: 1,
      adjustments: [],
      product_title: "Selle test",
      variant_sku: "SELLE-002",
    },
  ],
  shipping_address: { country_code: "be" },
}

assert("Sous-total articles", getItemsDisplayTotalEuros(cart8), 50)
assert("Total affiché", getDisplayTotalTvacEuros(cart8), 36.9) // 50 + 6.90 - 20
assert("Stripe (cents)", getPaymentAmountCents(cart8), 3690)

// ═══════════════════════════════════════════════════════════
// SCÉNARIO 9: Fallback — pas d'adjustments (ancien format)
// Seulement livraison gratuite (heuristique isFreeShippingDiscount)
// ═══════════════════════════════════════════════════════════
heading("SCÉNARIO 9: Fallback sans adjustments + livraison gratuite")

const cart9: CartAmountsInput = {
  item_total: 80,
  subtotal: 80,
  shipping_total: 0,
  discount_total: 6.9, // Seulement la livraison gratuite
  gift_card_total: 0,
  // PAS d'items → fallback sur discount_total + heuristique
  shipping_address: { country_code: "be" },
}

assert("Total (fallback heuristique)", getDisplayTotalTvacEuros(cart9), 80) // 80 + 0 - 0 (heuristique détecte free shipping)
assert("Stripe (fallback)", getPaymentAmountCents(cart9), 8000)

// ═══════════════════════════════════════════════════════════
// RÉSULTAT FINAL
// ═══════════════════════════════════════════════════════════
console.log(`\n${"═".repeat(60)}`)
console.log(`  RÉSULTAT: ${passed} passés, ${failed} échoués`)
console.log(`${"═".repeat(60)}\n`)

if (failed > 0) {
  process.exit(1)
}
