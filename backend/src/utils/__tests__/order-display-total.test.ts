/**
 * Tests du calcul de total commande (backend).
 * Exécuter : cd backend && npx tsx src/utils/__tests__/order-display-total.test.ts
 *
 * IMPORTANT : Medusa v2 tax-inclusive → les adjustments item sont en HT.
 * getOrderDisplayTotalEuros convertit en TTC via × (1 + 0.21).
 */
import { getOrderDisplayTotalEuros, OrderForDisplayTotal } from "../order-display-total"

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

// ═══════════════════════════════════════════════════════
// 1. Commande simple : 15€ + livraison 6,90€
// ═══════════════════════════════════════════════════════
heading("1. Commande 15€ + livraison 6,90€")

const order1: OrderForDisplayTotal = {
  item_total: 15,
  shipping_total: 6.9,
  discount_total: 0,
  gift_card_total: 0,
  items: [
    { unit_price: 15, subtotal: 15, quantity: 1, adjustments: [], product_title: "Cartouche", variant_sku: "72333" },
  ],
  shipping_address: { country_code: "be" },
}

assert("Total", getOrderDisplayTotalEuros(order1), 21.9)

// ═══════════════════════════════════════════════════════
// 2. Commande #31 réelle : 79,99€ -10% + livraison
// adjustment HT = 6.61, TTC = 8.00
// ═══════════════════════════════════════════════════════
heading("2. COMMANDE #31: 79,99€ + promo -10% + livraison 6,90€")

const order2: OrderForDisplayTotal = {
  item_total: 79.99,
  shipping_total: 6.9,
  discount_total: 8,
  gift_card_total: 0,
  items: [
    {
      unit_price: 79.99, subtotal: 79.99, quantity: 1,
      adjustments: [{ amount: 6.61 }], // HT: 66.11 × 10%
      product_title: "Ceinture surpiqure décorative", variant_sku: "CEINT-001",
    },
  ],
  shipping_address: { country_code: "be" },
}

assert("Total correct (78.89)", getOrderDisplayTotalEuros(order2), 78.89)

// ═══════════════════════════════════════════════════════
// 3. Livraison gratuite + promo -10% combinées
// adjustment HT = 6.61, TTC = 8.00
// ═══════════════════════════════════════════════════════
heading("3. 80€ + free shipping + promo -10%")

const order3: OrderForDisplayTotal = {
  item_total: 80,
  shipping_total: 0,
  discount_total: 14.9,
  gift_card_total: 0,
  items: [
    {
      unit_price: 80, subtotal: 80, quantity: 1,
      adjustments: [{ amount: 6.61 }], // HT: ~66.12 × 10%
      product_title: "Selle", variant_sku: "SELLE-001",
    },
  ],
  shipping_address: { country_code: "be" },
}

assert("Total (80 - 8.00 = 72)", getOrderDisplayTotalEuros(order3), 72)

// ═══════════════════════════════════════════════════════
// 4. Bon cadeau seul (50€ en centimes)
// ═══════════════════════════════════════════════════════
heading("4. Bon cadeau 50€ (unit_price centimes)")

const order4: OrderForDisplayTotal = {
  shipping_total: 0,
  discount_total: 0,
  gift_card_total: 0,
  items: [
    {
      unit_price: 5000, subtotal: 5000, quantity: 1,
      adjustments: [],
      metadata: { is_gift_card: true },
      product_title: "Bon Cadeau La Cabrade - 50€", variant_sku: "GC-50",
    },
  ],
  shipping_address: { country_code: "be" },
}

assert("Total bon cadeau", getOrderDisplayTotalEuros(order4), 50)

// ═══════════════════════════════════════════════════════
// 5. Mix : article Odoo 15€ + bon cadeau 25€ + livraison
// ═══════════════════════════════════════════════════════
heading("5. Mix : article 15€ + bon cadeau 25€ + livraison 6,90€")

const order5: OrderForDisplayTotal = {
  shipping_total: 6.9,
  discount_total: 0,
  gift_card_total: 0,
  items: [
    { unit_price: 15, subtotal: 15, quantity: 1, adjustments: [], product_title: "Cartouche", variant_sku: "72333" },
    {
      unit_price: 2500, subtotal: 2500, quantity: 1,
      adjustments: [],
      metadata: { is_gift_card: true },
      product_title: "Bon Cadeau La Cabrade - 25€", variant_sku: "GC-25",
    },
  ],
  shipping_address: { country_code: "be" },
}

assert("Total mix", getOrderDisplayTotalEuros(order5), 46.9)

// ═══════════════════════════════════════════════════════
// 6. Bon cadeau appliqué via metadata
// ═══════════════════════════════════════════════════════
heading("6. Article 50€ + bon cadeau appliqué 20€ (metadata) + livraison")

const order6: OrderForDisplayTotal = {
  item_total: 50,
  shipping_total: 6.9,
  discount_total: 0,
  gift_card_total: 0,
  items: [
    { unit_price: 50, subtotal: 50, quantity: 1, adjustments: [], product_title: "Selle", variant_sku: "SELLE-002" },
  ],
  metadata: { applied_gift_cards: [{ balance: 20 }] },
  shipping_address: { country_code: "be" },
}

assert("Total avec bon cadeau", getOrderDisplayTotalEuros(order6), 36.9)

// ═══════════════════════════════════════════════════════
// 7. Livraison gratuite SEULE (heuristique fallback)
// ═══════════════════════════════════════════════════════
heading("7. Fallback heuristique livraison gratuite")

const order7: OrderForDisplayTotal = {
  item_total: 80,
  shipping_total: 0,
  discount_total: 6.9,
  gift_card_total: 0,
  shipping_address: { country_code: "be" },
}

assert("Total fallback", getOrderDisplayTotalEuros(order7), 80)

// ═══════════════════════════════════════════════════════
// RÉSULTAT
// ═══════════════════════════════════════════════════════
console.log(`\n${"═".repeat(60)}`)
console.log(`  RÉSULTAT: ${passed} passés, ${failed} échoués`)
console.log(`${"═".repeat(60)}\n`)

if (failed > 0) process.exit(1)
