/**
 * Tests des calculs de prix du panier (storefront).
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
// ═══════════════════════════════════════════════════════════
heading("SCÉNARIO 2: Cartouche 15€ + promo -15% + livraison standard")

const cart2: CartAmountsInput = {
  item_total: 15,
  subtotal: 15,
  shipping_total: 6.9,
  discount_total: 2.25,
  gift_card_total: 0,
  items: [
    {
      unit_price: 15,
      subtotal: 15,
      quantity: 1,
      adjustments: [{ amount: 1.86, code: "SORRY15" }],
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
// ═══════════════════════════════════════════════════════════
heading("SCÉNARIO 2b (COMMANDE #31): Ceinture 79,99€ + promo -10% + livraison")

const cart2b: CartAmountsInput = {
  item_total: 79.99,
  subtotal: 79.99,
  shipping_total: 6.9,
  discount_total: 8,
  gift_card_total: 0,
  items: [
    {
      unit_price: 79.99,
      subtotal: 79.99,
      quantity: 1,
      adjustments: [{ amount: 6.61, code: "NL-57TV9Z" }],
      product_title: "Ceinture surpiqure décorative",
      variant_sku: "CEINT-001",
    },
  ],
  shipping_address: { country_code: "be" },
}

assert("Sous-total articles", getItemsDisplayTotalEuros(cart2b), 79.99)
assert("Réduction TTC (adjustments)", getItemAdjustmentsEuros(cart2b)!, 8.00)
assert("TVA", getDisplayTaxEuros(cart2b), 13.69)
assert("Total affiché", getDisplayTotalTvacEuros(cart2b), 78.89)
assert("Montant Stripe (cents)", getPaymentAmountCents(cart2b), 7889)

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

assert("Total affiché", getDisplayTotalTvacEuros(cart3), 80)
assert("Montant Stripe (cents)", getPaymentAmountCents(cart3), 8000)

// ═══════════════════════════════════════════════════════════
// SCÉNARIO 4: 80€ + livraison gratuite + promo -10%
// ═══════════════════════════════════════════════════════════
heading("SCÉNARIO 4: 80€ + livraison gratuite + promo -10%")

const cart4: CartAmountsInput = {
  item_total: 80,
  subtotal: 80,
  shipping_total: 0,
  discount_total: 14.9,
  gift_card_total: 0,
  items: [
    {
      unit_price: 80,
      subtotal: 80,
      quantity: 1,
      adjustments: [{ amount: 6.61, code: "PROMO10PCT" }],
      product_title: "Selle Odoo",
      variant_sku: "SELLE-001",
    },
  ],
  shipping_address: { country_code: "be" },
}

assert("Réduction items TTC", getItemAdjustmentsEuros(cart4)!, 8.00)
assert("Total CORRECT", getDisplayTotalTvacEuros(cart4), 72)
assert("Montant Stripe (cents)", getPaymentAmountCents(cart4), 7200)

// ═══════════════════════════════════════════════════════════
// SCÉNARIO 5: Bon cadeau 50€
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
      product_title: "Cartouche airbag",
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

assert("Exonéré TVA", isIntraCommunityExempt(cart7) ? 1 : 0, 1)
assert("TVA (négatif = déduit)", getDisplayTaxEuros(cart7), -18.55, 0.02)
assert("Total HT", getDisplayTotalTvacEuros(cart7), 88.35, 0.02)
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

assert("GC déduction", getGiftCardDeductionEuros(cart8), 20)
assert("Total affiché", getDisplayTotalTvacEuros(cart8), 36.9)
assert("Stripe (cents)", getPaymentAmountCents(cart8), 3690)

// ═══════════════════════════════════════════════════════════
// SCÉNARIO 9: Fallback sans adjustments + livraison gratuite
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
// SCÉNARIO 10: Article 100€ + promo -10% + bon cadeau 20€
// ═══════════════════════════════════════════════════════════
heading("SCÉNARIO 10: Article 100€ + promo -10% + bon cadeau 20€ + livraison")

const cart10b: CartAmountsInput = {
  item_total: 100,
  subtotal: 100,
  shipping_total: 6.9,
  discount_total: 10,
  gift_card_total: 0,
  items: [
    {
      unit_price: 100,
      subtotal: 100,
      quantity: 1,
      adjustments: [{ amount: 8.26, code: "PROMO10" }],
      product_title: "Produit premium",
      variant_sku: "PREM-001",
    },
  ],
  metadata: { applied_gift_cards: [{ code: "LC-ABC-1234-5678", balance: 20 }] },
  shipping_address: { country_code: "be" },
}

assert("Réduction TTC", getItemAdjustmentsEuros(cart10b)!, 9.99, 0.02)
assert("GC déduction", getGiftCardDeductionEuros(cart10b), 20)
assert("Total affiché", getDisplayTotalTvacEuros(cart10b), 76.91, 0.02)
assert("Stripe (cents)", getPaymentAmountCents(cart10b), 7691, 3)

// ═══════════════════════════════════════════════════════════
// SCÉNARIO 11: adjustmentHtToTtc helper
// ═══════════════════════════════════════════════════════════
heading("SCÉNARIO 11: adjustmentHtToTtc helper")

assert("6.61 HT → TTC", adjustmentHtToTtc(6.61, false), 7.9981, 0.01)
assert("round(6.61 HT → TTC)", Math.round(adjustmentHtToTtc(6.61, false) * 100) / 100, 8.00)
assert("GC: pas de conversion", adjustmentHtToTtc(500, true), 500)
assert("1.86 HT → 2.25 TTC", Math.round(adjustmentHtToTtc(1.86, false) * 100) / 100, 2.25)

// ═══════════════════════════════════════════════════════════
// SCÉNARIOS OUTLET
// ═══════════════════════════════════════════════════════════
heading("SCÉNARIO 12: OUTLET Singlet -60% + livraison (prix réduit dans unit_price)")

const cartOutlet: CartAmountsInput = {
  shipping_total: 6.9,
  items: [
    {
      unit_price: 11.96,
      compare_at_unit_price: 29.90,
      quantity: 1,
      adjustments: [],
      metadata: { outlet_discount: true },
      product_title: "Singlet Classic HV POLO",
    },
  ],
  shipping_address: { country_code: "be" },
}

assert("Outlet: sous-total (unit_price)", getItemsDisplayTotalEuros(cartOutlet), 11.96)
assert("Outlet: total TTC", getDisplayTotalTvacEuros(cartOutlet), 18.86)
assert("Outlet: Stripe cents", getPaymentAmountCents(cartOutlet), 1886)

heading("SCÉNARIO 13: OUTLET + article normal avec PO -20% (scénario client)")
// Singlet outlet -60% + Gants LC EQUESTRIAN -20% (Portes Ouvertes)

const cartOutletPO: CartAmountsInput = {
  shipping_total: 6.9,
  items: [
    {
      unit_price: 11.96,
      compare_at_unit_price: 29.90,
      quantity: 1,
      adjustments: [], // adjustments supprimés par cartOutletPromoGuardHandler
      metadata: { outlet_discount: true },
      product_title: "Singlet Classic HV POLO",
    },
    {
      unit_price: 39.90,
      quantity: 1,
      adjustments: [{ amount: 6.60, code: "PO_LC_20" }], // HT: 39.90/1.21 × 20%
      product_title: "Gants grip Widow LC EQUESTRIAN",
    },
  ],
  shipping_address: { country_code: "be" },
}

// 11.96 + 39.90 + 6.90 - 6.60×1.21 = 58.76 - 7.99 = 50.77
assert("Outlet+PO: sous-total brut items", getItemsDisplayTotalEuros(cartOutletPO), 51.86)
assert("Outlet+PO: adj (outlet exclu)", getItemAdjustmentsEuros(cartOutletPO)!, 7.99, 0.02)
assert("Outlet+PO: total TTC", getDisplayTotalTvacEuros(cartOutletPO), 50.77, 0.02)
assert("Outlet+PO: Stripe cents", getPaymentAmountCents(cartOutletPO), 5077, 2)

heading("SCÉNARIO 14: OUTLET — race condition — adjustment résiduel doit être IGNORÉ")
// Défensif: si un adjustment existe encore sur l'outlet (avant que le subscriber tourne),
// il ne doit PAS être déduit du montant Stripe.

const cartOutletResidual: CartAmountsInput = {
  shipping_total: 6.9,
  items: [
    {
      unit_price: 11.96,
      compare_at_unit_price: 29.90,
      quantity: 1,
      adjustments: [{ amount: 0.99, code: "PO_GLOBAL_10" }], // résiduel non supprimé
      metadata: { outlet_discount: true },
      product_title: "Singlet outlet",
    },
  ],
  shipping_address: { country_code: "be" },
}

// DOIT être identique au scénario sans adjustment (adj ignoré)
assert("Race cond: adj outlet ignoré (adj=null)", getItemAdjustmentsEuros(cartOutletResidual)!, 0)
assert("Race cond: total identique sans adj", getDisplayTotalTvacEuros(cartOutletResidual), 18.86)
assert("Race cond: cents identiques", getPaymentAmountCents(cartOutletResidual), 1886)

heading("SCÉNARIO 15: OUTLET + bon cadeau metadata")

const cartOutletGC: CartAmountsInput = {
  shipping_total: 6.9,
  items: [
    {
      unit_price: 11.96,
      compare_at_unit_price: 29.90,
      quantity: 1,
      adjustments: [],
      metadata: { outlet_discount: true },
      product_title: "Singlet outlet",
    },
  ],
  metadata: { applied_gift_cards: [{ code: "LC-GC01-AAAA-BBBB", balance: 10 }] },
  shipping_address: { country_code: "be" },
}

// 11.96 + 6.90 - 10 = 8.86
assert("Outlet+GC: total", getDisplayTotalTvacEuros(cartOutletGC), 8.86)
assert("Outlet+GC: cents", getPaymentAmountCents(cartOutletGC), 886)

heading("SCÉNARIO 16: OUTLET via metadata.outlet_discount seul (compare_at absent)")

const cartOutletMetaOnly: CartAmountsInput = {
  shipping_total: 6.9,
  items: [
    {
      unit_price: 11.96,
      // compare_at_unit_price absent (effacé par Medusa)
      quantity: 1,
      adjustments: [{ amount: 1.20 }], // résiduel
      metadata: { outlet_discount: true },
      product_title: "Singlet sans compare_at",
    },
  ],
  shipping_address: { country_code: "be" },
}

assert("Outlet metadata seul: adj ignoré", getItemAdjustmentsEuros(cartOutletMetaOnly)!, 0)
assert("Outlet metadata seul: total", getDisplayTotalTvacEuros(cartOutletMetaOnly), 18.86)

heading("SCÉNARIO 17: OUTLET x2 + article normal + promo -10%")

const cartOutlet2x: CartAmountsInput = {
  shipping_total: 6.9,
  items: [
    {
      unit_price: 11.96,
      compare_at_unit_price: 29.90,
      quantity: 2,
      adjustments: [],
      metadata: { outlet_discount: true },
      product_title: "Singlet outlet (x2)",
    },
    {
      unit_price: 50,
      quantity: 1,
      adjustments: [{ amount: 4.13 }], // HT: 50/1.21 × 10%
      product_title: "Selle",
    },
  ],
  shipping_address: { country_code: "be" },
}

// 11.96×2 + 50 + 6.90 - 4.13×1.21 = 80.82 - 5.00 = 75.82
assert("Outlet x2 + promo: adj hors outlet", getItemAdjustmentsEuros(cartOutlet2x)!, 5.00, 0.02)
assert("Outlet x2 + promo: total", getDisplayTotalTvacEuros(cartOutlet2x), 75.82, 0.02)

heading("SCÉNARIO 18: OUTLET intra-communautaire (FR + TVA)")

const cartOutletICT: CartAmountsInput = {
  shipping_total: 6.9,
  items: [
    {
      unit_price: 11.96,
      compare_at_unit_price: 29.90,
      quantity: 1,
      adjustments: [],
      metadata: { outlet_discount: true },
      product_title: "Singlet outlet",
    },
  ],
  metadata: { vat_number: "FR12345678901" },
  shipping_address: { country_code: "fr" },
}
// TTC = 18.86; TVA = 18.86 × 21/121 ≈ 3.27; HT = 15.59
assert("Outlet ICT: exonéré", isIntraCommunityExempt(cartOutletICT) ? 1 : 0, 1)
assert("Outlet ICT: total HT", getDisplayTotalTvacEuros(cartOutletICT), 15.59, 0.02)
assert("Outlet ICT: cents", getPaymentAmountCents(cartOutletICT), 1559, 2)

// ═══════════════════════════════════════════════════════════
// RÉSULTAT FINAL
// ═══════════════════════════════════════════════════════════
console.log(`\n${"═".repeat(60)}`)
console.log(`  RÉSULTAT: ${passed} passés, ${failed} échoués`)
console.log(`${"═".repeat(60)}\n`)

if (failed > 0) {
  process.exit(1)
}
