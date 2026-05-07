/**
 * Tests du calcul autoritaire du montant panier côté backend.
 * Exécuter : cd backend && npx tsx src/utils/__tests__/cart-amounts.test.ts
 *
 * Reproduit les scénarios réels observés en base pour garantir que le montant
 * Stripe autoritatif reste aligné sur l'affichage client au centime près.
 */
import {
  getCartDisplayTotalEuros,
  getCartPaymentAmountCents,
  CartForAmount,
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
  console.log(`\n${"═".repeat(60)}\n  ${text}\n${"═".repeat(60)}`)
}

// ─── Scénarios de base ────────────────────────────────────────

// Commande #78 : FLY CONTROL + Recharge + promo NL-ERG9JX + livraison 9,90€
heading("#78 — items 58,94€ + promo NL-ERG9JX + livraison 9,90€ (NL)")
const cart78: CartForAmount = {
  items: [
    {
      unit_price: 39.95,
      quantity: 1,
      adjustments: [{ amount: 3.5955 }],
      product_title: "Diffuseur anti-insectes",
    },
    {
      unit_price: 18.99,
      quantity: 1,
      adjustments: [{ amount: 1.7091 }],
      product_title: "Recharge diffuseur",
    },
  ],
  shipping_methods: [{ amount: 9.9, adjustments: [] }],
  shipping_address: { country_code: "nl" },
  metadata: {},
}
assert("Total affiché", getCartDisplayTotalEuros(cart78), 62.42)
assert("Stripe cents", getCartPaymentAmountCents(cart78), 6242)

// Commande #70 : 85,60€ + promo 10 % + livraison Bpost BE avec FREE_SHIPPING_75
heading("#70 — 85,60€ + promo -10% + FREE_SHIPPING_75 (BE 21%)")
const cart70: CartForAmount = {
  items: [
    { unit_price: 20, quantity: 1, adjustments: [{ amount: 1.6487603305785126 }] },
    { unit_price: 34, quantity: 1, adjustments: [{ amount: 2.809917355371901 }] },
    { unit_price: 24.9, quantity: 1, adjustments: [{ amount: 2.0578512396694215 }] },
    { unit_price: 6.7, quantity: 1, adjustments: [{ amount: 0.5578512396694215 }] },
  ],
  shipping_methods: [
    { amount: 6.9, adjustments: [{ amount: 5.702479338842975 }] },
  ],
  shipping_address: { country_code: "be" },
  metadata: {},
}
assert("Total affiché", getCartDisplayTotalEuros(cart70), 77.04)
assert("Stripe cents", getCartPaymentAmountCents(cart70), 7704)

// FREE_SHIPPING_75 sur livraison Europe (0 % TVA) → adj = valeur TTC directe
heading("Europe — livraison 9,90€ + FREE_SHIPPING_75 (adj stocké TTC)")
const cartEU: CartForAmount = {
  items: [{ unit_price: 80, quantity: 1, adjustments: [] }],
  shipping_methods: [{ amount: 9.9, adjustments: [{ amount: 9.9 }] }],
  shipping_address: { country_code: "fr" },
  metadata: {},
}
assert("Total affiché", getCartDisplayTotalEuros(cartEU), 80)

// Bon cadeau appliqué via metadata (30€ sur total 66,90€)
heading("Bon cadeau metadata 30€ sur total 66,90€")
const cartGC: CartForAmount = {
  items: [{ unit_price: 60, quantity: 1, adjustments: [] }],
  shipping_methods: [{ amount: 6.9, adjustments: [] }],
  shipping_address: { country_code: "be" },
  metadata: {
    applied_gift_cards: [{ code: "LC-TEST-1234-5678", balance: 30 }],
  },
}
assert("Total après GC", getCartDisplayTotalEuros(cartGC), 36.9)
assert("Stripe cents", getCartPaymentAmountCents(cartGC), 3690)

// Exonération TVA intracommunautaire (France + VAT number)
heading("TVA intra-com — 100€ FR + livraison 6,90€")
const cartICT: CartForAmount = {
  items: [{ unit_price: 100, quantity: 1, adjustments: [] }],
  shipping_methods: [{ amount: 6.9, adjustments: [] }],
  shipping_address: { country_code: "fr" },
  metadata: { vat_number: "FR12345678901" },
}
assert("Total HT", getCartDisplayTotalEuros(cartICT), 88.35, 0.02)

// Livraison avec adj > brut (cas limite : promo à 0)
heading("Livraison brut 6,90€ + adj 7,00€ (cas limite)")
const cartWeird: CartForAmount = {
  items: [{ unit_price: 50, quantity: 1, adjustments: [] }],
  shipping_methods: [{ amount: 6.9, adjustments: [{ amount: 7.0 }] }],
  shipping_address: { country_code: "be" },
}
assert("Livraison clamp à 0", getCartDisplayTotalEuros(cartWeird), 50)

// ─── Scénarios outlet ─────────────────────────────────────────

heading("OUTLET — Singlet -60% (unit_price déjà réduit) + livraison")
// unit_price = 29.90 × 0.40 = 11.96€
const cartOutlet1: CartForAmount = {
  items: [
    {
      unit_price: 11.96,
      compare_at_unit_price: 29.90,
      quantity: 1,
      adjustments: [],
      metadata: { outlet_discount: true, outlet_original_price: 29.90, outlet_discount_percent: 60 },
      product_title: "Singlet Classic HV POLO",
    },
  ],
  shipping_methods: [{ amount: 6.9, adjustments: [] }],
  shipping_address: { country_code: "be" },
  metadata: {},
}
assert("Outlet seul: total TTC", getCartDisplayTotalEuros(cartOutlet1), 18.86)
assert("Outlet seul: Stripe cents", getCartPaymentAmountCents(cartOutlet1), 1886)

heading("OUTLET + article normal avec PO -20% (LC Equestrian)")
// Scénario exact rapporté par les clients :
// Singlet outlet: unit_price=11.96€, compare_at=29.90€
// Gants LC: unit_price=39.90€, adjustment PO_LC_20 HT=6.60 (20% de 39.90/1.21)
const cartOutletPO: CartForAmount = {
  items: [
    {
      unit_price: 11.96,
      compare_at_unit_price: 29.90,
      quantity: 1,
      adjustments: [], // adjustments outlet déjà supprimés par subscriber
      metadata: { outlet_discount: true, outlet_original_price: 29.90, outlet_discount_percent: 60 },
      product_title: "Singlet Classic HV POLO",
    },
    {
      unit_price: 39.90,
      quantity: 1,
      adjustments: [{ amount: 6.60 }], // HT: 39.90/1.21 × 20% ≈ 6.60
      product_title: "Gants grip Widow LC EQUESTRIAN",
    },
  ],
  shipping_methods: [{ amount: 6.9, adjustments: [] }],
  shipping_address: { country_code: "be" },
  metadata: {},
}
// 11.96 + 39.90 + 6.90 - 6.60×1.21 = 58.76 - 7.99 = 50.77
assert("Outlet+PO: total TTC", getCartDisplayTotalEuros(cartOutletPO), 50.77, 0.02)
assert("Outlet+PO: Stripe cents", getCartPaymentAmountCents(cartOutletPO), 5077, 2)

heading("OUTLET — race condition: adjustment résiduel sur article outlet (doit être ignoré)")
// Scénario défensif : un adjustment existe encore sur l'outlet item (avant que le
// subscriber ait eu le temps de le supprimer). Le montant Stripe NE DOIT PAS
// inclure cet adjustment (sinon le client est sous-facturé).
const cartOutletWithResidualAdj: CartForAmount = {
  items: [
    {
      unit_price: 11.96,
      compare_at_unit_price: 29.90,
      quantity: 1,
      adjustments: [{ amount: 0.99 }], // adjustment résiduel PO_GLOBAL_10 sur outlet
      metadata: { outlet_discount: true },
      product_title: "Singlet outlet avec adj résiduel",
    },
  ],
  shipping_methods: [{ amount: 6.9, adjustments: [] }],
  shipping_address: { country_code: "be" },
  metadata: {},
}
// Doit être identique au cas sans adjustment (11.96 + 6.90 = 18.86)
assert("Race condition outlet adj ignoré: total", getCartDisplayTotalEuros(cartOutletWithResidualAdj), 18.86)
assert("Race condition outlet adj ignoré: cents", getCartPaymentAmountCents(cartOutletWithResidualAdj), 1886)

heading("OUTLET -60% + bon cadeau metadata 10€")
const cartOutletGC: CartForAmount = {
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
  shipping_methods: [{ amount: 6.9, adjustments: [] }],
  shipping_address: { country_code: "be" },
  metadata: {
    applied_gift_cards: [{ code: "LC-TEST-GC01-AAAA", balance: 10 }],
  },
}
// 11.96 + 6.90 - 10 = 8.86
assert("Outlet+GC: total", getCartDisplayTotalEuros(cartOutletGC), 8.86)
assert("Outlet+GC: cents", getCartPaymentAmountCents(cartOutletGC), 886)

heading("OUTLET via metadata seulement (sans compare_at)")
// Cas où compare_at_unit_price a été effacé mais metadata.outlet_discount reste
const cartOutletMetaOnly: CartForAmount = {
  items: [
    {
      unit_price: 11.96,
      compare_at_unit_price: undefined, // effacé par Medusa
      quantity: 1,
      adjustments: [{ amount: 1.20 }], // adjustment résiduel
      metadata: { outlet_discount: true },
      product_title: "Singlet sans compare_at",
    },
  ],
  shipping_methods: [{ amount: 6.9, adjustments: [] }],
  shipping_address: { country_code: "be" },
  metadata: {},
}
// Doit ignorer l'adjustment grâce à metadata.outlet_discount
assert("Outlet metadata seul: adj ignoré", getCartDisplayTotalEuros(cartOutletMetaOnly), 18.86)

heading("OUTLET intra-communautaire (FR + TVA)")
const cartOutletICT: CartForAmount = {
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
  shipping_methods: [{ amount: 6.9, adjustments: [] }],
  shipping_address: { country_code: "fr" },
  metadata: { vat_number: "FR12345678901" },
}
// TTC = 18.86 ; TVA = 18.86 × 21/121 ≈ 3.27 ; HT = 15.59
assert("Outlet ICT: total HT", getCartDisplayTotalEuros(cartOutletICT), 15.59, 0.02)
assert("Outlet ICT: cents", getCartPaymentAmountCents(cartOutletICT), 1559, 2)

heading("OUTLET x2 + promo -10% sur article normal")
const cartOutlet2x: CartForAmount = {
  items: [
    {
      unit_price: 11.96,
      compare_at_unit_price: 29.90,
      quantity: 2,
      adjustments: [],
      metadata: { outlet_discount: true },
      product_title: "Singlet outlet",
    },
    {
      unit_price: 50,
      quantity: 1,
      adjustments: [{ amount: 4.13 }], // HT: 50/1.21 × 10% = 4.13
      product_title: "Selle",
    },
  ],
  shipping_methods: [{ amount: 6.9, adjustments: [] }],
  shipping_address: { country_code: "be" },
  metadata: {},
}
// 11.96×2 + 50 + 6.90 - 4.13×1.21 = 80.82 - 5.00 = 75.82
assert("Outlet x2 + promo normal", getCartDisplayTotalEuros(cartOutlet2x), 75.82, 0.02)

// ─── Scénarios Portes Ouvertes ────────────────────────────────

heading("Portes Ouvertes — PO_GLOBAL_10 (-10%) sur article standard")
// Adjustment HT = unit_price / 1.21 × 10% = 39.90/1.21 × 10% ≈ 3.30
const cartPO10: CartForAmount = {
  items: [
    {
      unit_price: 39.90,
      quantity: 1,
      adjustments: [{ amount: 3.30 }], // HT: 33.06 × 10% = 3.30
      product_title: "Selle de dressage",
    },
  ],
  shipping_methods: [{ amount: 6.9, adjustments: [] }],
  shipping_address: { country_code: "be" },
  metadata: {},
}
// 39.90 + 6.90 - 3.30×1.21 = 46.80 - 3.99 = 42.81
assert("PO_10: total", getCartDisplayTotalEuros(cartPO10), 42.81, 0.02)

heading("Portes Ouvertes — PO_CAVALIER_20 (-20%) cavalier")
// Adjustment HT = unit_price / 1.21 × 20%
const cartPO20: CartForAmount = {
  items: [
    {
      unit_price: 79.90,
      quantity: 1,
      adjustments: [{ amount: 13.21 }], // HT: 66.03 × 20% = 13.21
      product_title: "Selle cavalier premium",
    },
  ],
  shipping_methods: [{ amount: 6.9, adjustments: [] }],
  shipping_address: { country_code: "be" },
  metadata: {},
}
// 79.90 + 6.90 - 13.21×1.21 = 86.80 - 15.98 = 70.82
assert("PO_20 cavalier: total", getCartDisplayTotalEuros(cartPO20), 70.82, 0.02)

console.log(`\n${"═".repeat(60)}\n  RÉSULTAT : ${passed} passés, ${failed} échoués\n${"═".repeat(60)}\n`)
if (failed > 0) process.exit(1)
