/**
 * Tests du calcul de total commande (backend).
 * Exécuter : cd backend && npx tsx src/utils/__tests__/order-display-total.test.ts
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
// 2. Livraison gratuite + promo combinées (BUG principal)
// ═══════════════════════════════════════════════════════
heading("2. BUG PRINCIPAL: 80€ + free shipping + promo -10€")

const order2: OrderForDisplayTotal = {
  item_total: 80,
  shipping_total: 0,
  discount_total: 16.9,
  gift_card_total: 0,
  items: [
    {
      unit_price: 80, subtotal: 80, quantity: 1,
      adjustments: [{ amount: 10 }],
      product_title: "Selle", variant_sku: "SELLE-001",
    },
  ],
  shipping_address: { country_code: "be" },
}

assert("Total CORRECT (80 - 10 = 70)", getOrderDisplayTotalEuros(order2), 70)

// ═══════════════════════════════════════════════════════
// 3. Bon cadeau seul (50€ en centimes)
// ═══════════════════════════════════════════════════════
heading("3. Bon cadeau 50€ (unit_price centimes)")

const order3: OrderForDisplayTotal = {
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

assert("Total bon cadeau", getOrderDisplayTotalEuros(order3), 50)

// ═══════════════════════════════════════════════════════
// 4. Mix : article Odoo 15€ + bon cadeau 25€ + livraison
// ═══════════════════════════════════════════════════════
heading("4. Mix : article 15€ + bon cadeau 25€ + livraison 6,90€")

const order4: OrderForDisplayTotal = {
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

assert("Total mix", getOrderDisplayTotalEuros(order4), 46.9)

// ═══════════════════════════════════════════════════════
// 5. Carte cadeau Medusa utilisée
// ═══════════════════════════════════════════════════════
heading("5. Article 50€ + carte cadeau Medusa 20€")

const order5: OrderForDisplayTotal = {
  item_total: 50,
  shipping_total: 6.9,
  discount_total: 0,
  gift_card_total: 2000,
  items: [
    { unit_price: 50, subtotal: 50, quantity: 1, adjustments: [], product_title: "Selle", variant_sku: "SELLE-002" },
  ],
  shipping_address: { country_code: "be" },
}

assert("Total avec carte cadeau", getOrderDisplayTotalEuros(order5), 36.9)

// ═══════════════════════════════════════════════════════
// 6. Livraison gratuite SEULE (heuristique fallback)
// ═══════════════════════════════════════════════════════
heading("6. Fallback heuristique livraison gratuite")

const order6: OrderForDisplayTotal = {
  item_total: 80,
  shipping_total: 0,
  discount_total: 6.9,
  gift_card_total: 0,
  shipping_address: { country_code: "be" },
}

assert("Total fallback", getOrderDisplayTotalEuros(order6), 80)

// ═══════════════════════════════════════════════════════
// RÉSULTAT
// ═══════════════════════════════════════════════════════
console.log(`\n${"═".repeat(60)}`)
console.log(`  RÉSULTAT: ${passed} passés, ${failed} échoués`)
console.log(`${"═".repeat(60)}\n`)

if (failed > 0) process.exit(1)
