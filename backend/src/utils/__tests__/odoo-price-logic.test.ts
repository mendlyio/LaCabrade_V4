/**
 * Tests de la logique de prix envoyée vers Odoo.
 * Vérifie la conversion prix article et bon cadeau.
 * Exécuter : cd backend && npx tsx src/utils/__tests__/odoo-price-logic.test.ts
 */

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

/**
 * Reproduit la logique exacte de odoo/service.ts createOrder (ligne ~673)
 */
function odooPriceUnit(rawPrice: number, isGiftCard: boolean): number {
  return isGiftCard ? rawPrice / 100 : rawPrice
}

/**
 * Simule le calcul Odoo : total = somme(price_unit × qty) + shipping - discount
 */
function simulateOdooTotal(
  items: Array<{ price: number; quantity: number; isGiftCard: boolean }>,
  shippingCost: number,
  discountTotal: number,
): { orderLines: Array<{ name: string; price_unit: number; qty: number }>; total: number } {
  const orderLines: Array<{ name: string; price_unit: number; qty: number }> = []
  let total = 0

  for (const item of items) {
    const priceUnit = odooPriceUnit(item.price, item.isGiftCard)
    orderLines.push({ name: item.isGiftCard ? "Bon Cadeau" : "Produit", price_unit: priceUnit, qty: item.quantity })
    total += priceUnit * item.quantity
  }

  if (shippingCost > 0) {
    orderLines.push({ name: "Livraison", price_unit: shippingCost, qty: 1 })
    total += shippingCost
  }

  if (discountTotal > 0) {
    orderLines.push({ name: "Réduction", price_unit: -discountTotal, qty: 1 })
    total -= discountTotal
  }

  return { orderLines, total }
}

// ═══════════════════════════════════════════════════════
// 1. Article Odoo standard 15€ + livraison
// ═══════════════════════════════════════════════════════
heading("ODOO 1: Cartouche 15€ + livraison 6,90€")

const r1 = simulateOdooTotal(
  [{ price: 15, quantity: 1, isGiftCard: false }],
  6.9,
  0,
)
assert("price_unit article", r1.orderLines[0].price_unit, 15)
assert("price_unit livraison", r1.orderLines[1].price_unit, 6.9)
assert("Total Odoo", r1.total, 21.9)

// ═══════════════════════════════════════════════════════
// 2. Article 80€ + livraison gratuite + promo -10€
// ═══════════════════════════════════════════════════════
heading("ODOO 2: 80€ + free shipping + promo -10€")

const r2 = simulateOdooTotal(
  [{ price: 80, quantity: 1, isGiftCard: false }],
  0,
  10,
)
assert("price_unit article", r2.orderLines[0].price_unit, 80)
assert("Ligne réduction", r2.orderLines[1].price_unit, -10)
assert("Total Odoo", r2.total, 70)

// ═══════════════════════════════════════════════════════
// 3. Bon cadeau 50€ (unit_price = 5000 centimes)
// ═══════════════════════════════════════════════════════
heading("ODOO 3: Bon cadeau 50€ (price=5000 centimes)")

const r3 = simulateOdooTotal(
  [{ price: 5000, quantity: 1, isGiftCard: true }],
  0,
  0,
)
assert("price_unit bon cadeau", r3.orderLines[0].price_unit, 50)
assert("Total Odoo", r3.total, 50)

// ═══════════════════════════════════════════════════════
// 4. Mix : article 15€ + bon cadeau 25€ + livraison
// ═══════════════════════════════════════════════════════
heading("ODOO 4: Mix article 15€ + bon cadeau 25€ + livraison 6,90€")

const r4 = simulateOdooTotal(
  [
    { price: 15, quantity: 1, isGiftCard: false },
    { price: 2500, quantity: 1, isGiftCard: true },
  ],
  6.9,
  0,
)
assert("price_unit article", r4.orderLines[0].price_unit, 15)
assert("price_unit bon cadeau", r4.orderLines[1].price_unit, 25)
assert("price_unit livraison", r4.orderLines[2].price_unit, 6.9)
assert("Total Odoo", r4.total, 46.9)

// ═══════════════════════════════════════════════════════
// 5. VÉRIFICATION : article Odoo ne doit PAS être /100
// ═══════════════════════════════════════════════════════
heading("ODOO 5: Selle à 74€ — PAS de /100 !")

const r5 = simulateOdooTotal(
  [{ price: 74, quantity: 1, isGiftCard: false }],
  6.9,
  0,
)
assert("price_unit (DOIT être 74, pas 0.74)", r5.orderLines[0].price_unit, 74)
assert("Total Odoo", r5.total, 80.9)

// ═══════════════════════════════════════════════════════
// 6. Bon cadeau 100€ — DOIT être /100
// ═══════════════════════════════════════════════════════
heading("ODOO 6: Bon cadeau 100€ (price=10000 centimes)")

const r6 = simulateOdooTotal(
  [{ price: 10000, quantity: 1, isGiftCard: true }],
  0,
  0,
)
assert("price_unit (10000/100 = 100)", r6.orderLines[0].price_unit, 100)
assert("Total Odoo", r6.total, 100)

// ═══════════════════════════════════════════════════════
// 7. Cohérence panier ↔ Stripe ↔ Odoo pour cas complet
// Article 15€ + promo 15% + livraison 6,90€
// ═══════════════════════════════════════════════════════
heading("ODOO 7: Cohérence end-to-end — 15€ + promo 15% + livraison")

const itemPrice = 15
const promoPercent = 0.15
const promoAmount = itemPrice * promoPercent  // 2.25
const shipping = 6.9

const expectedCartTotal = itemPrice + shipping - promoAmount  // 15 + 6.90 - 2.25 = 19.65
const expectedStripeCents = Math.round(expectedCartTotal * 100)  // 1965

const r7 = simulateOdooTotal(
  [{ price: itemPrice, quantity: 1, isGiftCard: false }],
  shipping,
  promoAmount,
)

assert("Cart total (euros)", expectedCartTotal, 19.65)
assert("Stripe (cents)", expectedStripeCents, 1965)
assert("Odoo total", r7.total, 19.65)
assert("Cart = Odoo", expectedCartTotal, r7.total)

console.log(`\n  🔗 Cohérence: Panier=${expectedCartTotal}€ → Stripe=${expectedStripeCents}¢ → Odoo=${r7.total}€`)

// ═══════════════════════════════════════════════════════
// RÉSULTAT
// ═══════════════════════════════════════════════════════
console.log(`\n${"═".repeat(60)}`)
console.log(`  RÉSULTAT: ${passed} passés, ${failed} échoués`)
console.log(`${"═".repeat(60)}\n`)

if (failed > 0) process.exit(1)
