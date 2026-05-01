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
    { amount: 6.9, adjustments: [{ amount: 5.702479338842975 }] }, // adj HT ≈ 6,90 TTC
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

// Bon cadeau appliqué via metadata (30€ sur total 60€)
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
// TTC avant exonération : 106,90 ; TVA = 106.9 × 21/121 = 18.55 ; HT = 88.35
assert("Total HT", getCartDisplayTotalEuros(cartICT), 88.35, 0.02)

// Livraison avec adj > brut (cas limite : promo à 0)
heading("Livraison brut 6,90€ + adj 7,00€ (cas limite)")
const cartWeird: CartForAmount = {
  items: [{ unit_price: 50, quantity: 1, adjustments: [] }],
  shipping_methods: [{ amount: 6.9, adjustments: [{ amount: 7.0 }] }],
  shipping_address: { country_code: "be" },
}
// adj=7.0 HT→TTC=8.47 vs 7.0 ; 7.0 est plus proche de 6.9 ; resolved=7.0
// → 6.9 - 7.0 = -0.1 → max(0,-0.1) = 0. Pas de livraison en trop facturée.
assert("Livraison clamp à 0", getCartDisplayTotalEuros(cartWeird), 50)

console.log(`\n${"═".repeat(60)}\n  RÉSULTAT : ${passed} passés, ${failed} échoués\n${"═".repeat(60)}\n`)
if (failed > 0) process.exit(1)
