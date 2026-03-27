/**
 * Tests des calculs de prix du panier.
 * Exécuter : cd storefront && npx tsx src/lib/util/__tests__/cart-amounts.test.ts
 *
 * IMPORTANT : Medusa v2 tax-inclusive calcule les adjustments sur la base HT.
 * Les adjustment.amount sont donc en HT — les fonctions convertissent en TTC
 * via × (1 + 0.21) pour cohérence avec les prix affichés (TTC).
 */
import {
  getDisplayTotalTvacEuros,
  getPaymentAmountCents,
  getDisplayTaxEuros,
  getItemsDisplayTotalEuros,
  getItemAdjustmentsEuros,
  getGiftCardDeductionEuros,
  isFreeShippingDiscount,
  isIntraCommunityExempt,
  adjustmentHtToTtc,
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
// SCÉNARIO 2: Article 15€ + code promo -15%
// Medusa v2 tax-inclusive: adjustment = 15% de HT (12.40) = 1.86 HT
// TTC de l'adjustment = 1.86 × 1.21 ≈ 2.25€ TTC
// ═══════════════════════════════════════════════════════════
heading("SCÉNARIO 2: Cartouche 15€ + promo -15% + livraison standard")

const cart2: CartAmountsInput = {
  item_total: 15,
  subtotal: 15,
  shipping_total: 6.9,
  discount_total: 2.25, // TTC discount total from Medusa
  gift_card_total: 0,
  items: [
    {
      unit_price: 15,
      subtotal: 15,
      quantity: 1,
      adjustments: [{ amount: 1.86, code: "SORRY15" }], // HT: 15/1.21 × 15% ≈ 1.86
      product_title: "Cartouche airbag 24gr LC EQUESTRIAN",
      variant_sku: "72333",
    },
  ],
  shipping_address: { country_code: "be" },
}

assert("Sous-total articles", getItemsDisplayTotalEuros(cart2), 15)
assert("Réduction TTC (adjustments)", getItemAdjustmentsEuros(cart2)!, 2.25)
assert("Total affiché", getDisplayTotalTvacEuros(cart2), 19.65)
assert("Montant Stripe (cents)", getPaymentAmountCents(cart2), 1965)

// ═══════════════════════════════════════════════════════════
// SCÉNARIO 2b: COMMANDE RÉELLE #31 — Ceinture 79,99€ -10%
// Adjustment HT = 6.61 (10% de 66.11 HT)
// TTC = 6.61 × 1.21 = 8.00€
// Total correct = 79.99 + 6.90 - 8.00 = 78.89€
// ═══════════════════════════════════════════════════════════
heading("SCÉNARIO 2b (COMMANDE #31): Ceinture 79,99€ + promo -10% + livraison")

const cart2b: CartAmountsInput = {
  item_total: 79.99,
  subtotal: 79.99,
  shipping_total: 6.9,
  discount_total: 8, // Medusa discount_total TTC
  gift_card_total: 0,
  items: [
    {
      unit_price: 79.99,
      subtotal: 79.99,
      quantity: 1,
      adjustments: [{ amount: 6.61, code: "NL-57TV9Z" }], // HT: 66.11 × 10% = 6.61
      product_title: "Ceinture surpiqure décorative",
      variant_sku: "CEINT-001",
    },
  ],
  shipping_address: { country_code: "be" },
}

assert("Sous-total articles", getItemsDisplayTotalEuros(cart2b), 79.99)
assert("Réduction TTC (adjustments)", getItemAdjustmentsEuros(cart2b)!, 8.00)
assert("TVA", getDisplayTaxEuros(cart2b), 13.69) // 78.89 × 21/121
assert("Total affiché", getDisplayTotalTvacEuros(cart2b), 78.89)
assert("Montant Stripe (cents)", getPaymentAmountCents(cart2b), 7889)
console.log("  ℹ️  ANCIEN bug: 79.99 - 6.61 + 6.90 = 80.28 → corrigé: 78.89")

// ═══════════════════════════════════════════════════════════
// SCÉNARIO 3: Panier 80€ + livraison GRATUITE (>75€)
// ═══════════════════════════════════════════════════════════
heading("SCÉNARIO 3: 80€ articles + livraison gratuite (>75€)")

const cart3: CartAmountsInput = {
  item_total: 80,
  subtotal: 80,
  shipping_total: 0,
  discount_total: 6.9,
  gift_card_total: 0,
  items: [
    {
      unit_price: 80,
      subtotal: 80,
      quantity: 1,
      adjustments: [],
      product_title: "Selle Odoo",
      variant_sku: "SELLE-001",
    },
  ],
  shipping_address: { country_code: "be" },
}

assert("Sous-total articles", getItemsDisplayTotalEuros(cart3), 80)
assert("Réduction items", getItemAdjustmentsEuros(cart3)!, 0)
assert("Total affiché", getDisplayTotalTvacEuros(cart3), 80)
assert("Montant Stripe (cents)", getPaymentAmountCents(cart3), 8000)
console.log("  ℹ️  isFreeShippingDiscount(0, 6.9) =", isFreeShippingDiscount(0, 6.9), "(fallback, non utilisé ici)")

// ═══════════════════════════════════════════════════════════
// SCÉNARIO 4: 80€ + livraison gratuite + promo -10%
// Adjustment HT = 6.61 (10% de HT ≈ 66.12)
// TTC = 6.61 × 1.21 = 8.00€
// Total = 80 + 0 - 8.00 = 72.00€
// ═══════════════════════════════════════════════════════════
heading("SCÉNARIO 4: 80€ + livraison gratuite + promo -10%")

const cart4: CartAmountsInput = {
  item_total: 80,
  subtotal: 80,
  shipping_total: 0,
  discount_total: 14.9, // 6.90 (shipping) + 8.00 (promo TTC)
  gift_card_total: 0,
  items: [
    {
      unit_price: 80,
      subtotal: 80,
      quantity: 1,
      adjustments: [{ amount: 6.61, code: "PROMO10PCT" }], // HT: ~66.12 × 10%
      product_title: "Selle Odoo",
      variant_sku: "SELLE-001",
    },
  ],
  shipping_address: { country_code: "be" },
}

assert("Sous-total articles", getItemsDisplayTotalEuros(cart4), 80)
assert("Réduction items TTC (adjustments)", getItemAdjustmentsEuros(cart4)!, 8.00)
assert("Total CORRECT", getDisplayTotalTvacEuros(cart4), 72) // 80 + 0 - 8.00
assert("Montant Stripe (cents)", getPaymentAmountCents(cart4), 7200)

// ═══════════════════════════════════════════════════════════
// SCÉNARIO 5: Bon cadeau 50€ (unit_price en euros)
// ═══════════════════════════════════════════════════════════
heading("SCÉNARIO 5: Bon cadeau 50€ (unit_price en euros)")

const cart5: CartAmountsInput = {
  item_total: 50,
  subtotal: 50,
  shipping_total: 0,
  discount_total: 0,
  gift_card_total: 0,
  items: [
    {
      unit_price: 50,
      subtotal: 50,
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
      unit_price: 25,
      subtotal: 25,
      quantity: 1,
      adjustments: [],
      metadata: { is_gift_card: true },
      product_title: "Bon Cadeau La Cabrade - 25€",
      variant_sku: "GC-25",
    },
  ],
  shipping_address: { country_code: "be" },
}

assert("Sous-total articles", getItemsDisplayTotalEuros(cart6), 40)
assert("Total affiché", getDisplayTotalTvacEuros(cart6), 46.9)
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
assert("TVA (négatif = déduit)", tva, -18.55, 0.02)
assert("Total HT", totalHT, 88.35, 0.02)
assert("Stripe (cents)", getPaymentAmountCents(cart7), 8835, 2)

// ═══════════════════════════════════════════════════════════
// SCÉNARIO 8: Bon cadeau via metadata (nouveau système)
// ═══════════════════════════════════════════════════════════
heading("SCÉNARIO 8: Article 50€ + bon cadeau 20€ (metadata) + livraison")

const cart8: CartAmountsInput = {
  item_total: 50,
  subtotal: 50,
  shipping_total: 6.9,
  discount_total: 0,
  gift_card_total: 0,
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
  metadata: { applied_gift_cards: [{ code: "LC-TEST-AAAA-BBBB", balance: 20 }] },
  shipping_address: { country_code: "be" },
}

assert("Sous-total articles", getItemsDisplayTotalEuros(cart8), 50)
assert("GC déduction", getGiftCardDeductionEuros(cart8), 20)
assert("TVA (sur total avant GC)", getDisplayTaxEuros(cart8), 9.88, 0.02)
assert("Total affiché", getDisplayTotalTvacEuros(cart8), 36.9)
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
  discount_total: 6.9,
  gift_card_total: 0,
  shipping_address: { country_code: "be" },
}

assert("Total (fallback heuristique)", getDisplayTotalTvacEuros(cart9), 80)
assert("Stripe (fallback)", getPaymentAmountCents(cart9), 8000)

// ═══════════════════════════════════════════════════════════
// SCÉNARIO 10: Bon cadeau + promo -10% + livraison
// Mix complet : article Odoo + promo + bon cadeau metadata
// ═══════════════════════════════════════════════════════════
heading("SCÉNARIO 10: Article 100€ + promo -10% + bon cadeau 20€ + livraison")

const cart10: CartAmountsInput = {
  item_total: 100,
  subtotal: 100,
  shipping_total: 6.9,
  discount_total: 8.26, // ~10% of HT → TTC. Medusa's value.
  gift_card_total: 0,
  items: [
    {
      unit_price: 100,
      subtotal: 100,
      quantity: 1,
      adjustments: [{ amount: 6.83, code: "PROMO10" }], // HT: 100/1.21 × 10% ≈ 8.26, Medusa gives ~6.83
      product_title: "Produit premium",
      variant_sku: "PREM-001",
    },
  ],
  metadata: { applied_gift_cards: [{ code: "LC-ABC-1234-5678", balance: 20 }] },
  shipping_address: { country_code: "be" },
}

// 100/1.21 = 82.6446... → 10% = 8.2645 → Medusa rounds to 6.83 (hmm, or 8.26?)
// Actually for this test, the HT of 100€ = 82.64, 10% = 8.26, adjustment = 8.26
// Let me recalculate: adj TTC = 6.83 × 1.21 = 8.2643 → 8.26

// Actually let me use: item 100€ TTC, HT = 82.64, 10% = 8.26 HT adjustment
const cart10b: CartAmountsInput = {
  item_total: 100,
  subtotal: 100,
  shipping_total: 6.9,
  discount_total: 10, // Medusa's TTC discount total
  gift_card_total: 0,
  items: [
    {
      unit_price: 100,
      subtotal: 100,
      quantity: 1,
      adjustments: [{ amount: 8.26, code: "PROMO10" }], // HT: 100/1.21 × 10% ≈ 8.26
      product_title: "Produit premium",
      variant_sku: "PREM-001",
    },
  ],
  metadata: { applied_gift_cards: [{ code: "LC-ABC-1234-5678", balance: 20 }] },
  shipping_address: { country_code: "be" },
}

// adj TTC = round(8.26 × 1.21 × 100) / 100 = round(999.46) / 100 = 9.99
// total before GC = 100 + 6.90 - 9.99 = 96.91
// GC deduction = min(20, 96.91) = 20
// total = 96.91 - 20 = 76.91
assert("Sous-total articles (scénario 10)", getItemsDisplayTotalEuros(cart10b), 100)
assert("Réduction TTC", getItemAdjustmentsEuros(cart10b)!, 9.99, 0.02)
assert("GC déduction", getGiftCardDeductionEuros(cart10b), 20)
assert("Total affiché", getDisplayTotalTvacEuros(cart10b), 76.91, 0.02)
assert("Stripe (cents)", getPaymentAmountCents(cart10b), 7691, 3)

// ═══════════════════════════════════════════════════════════
// SCÉNARIO 11: adjustmentHtToTtc helper
// ═══════════════════════════════════════════════════════════
heading("SCÉNARIO 11: adjustmentHtToTtc helper")

assert("6.61 HT → 8.00 TTC", adjustmentHtToTtc(6.61, false), 7.9981, 0.01) // pre-round
assert("round(6.61 HT → TTC)", Math.round(adjustmentHtToTtc(6.61, false) * 100) / 100, 8.00)
assert("GC: pas de conversion", adjustmentHtToTtc(500, true), 500) // gift card: 0% tax
assert("1.86 HT → 2.25 TTC", Math.round(adjustmentHtToTtc(1.86, false) * 100) / 100, 2.25)

// ═══════════════════════════════════════════════════════════
// RÉSULTAT FINAL
// ═══════════════════════════════════════════════════════════
console.log(`\n${"═".repeat(60)}`)
console.log(`  RÉSULTAT: ${passed} passés, ${failed} échoués`)
console.log(`${"═".repeat(60)}\n`)

if (failed > 0) {
  process.exit(1)
}
