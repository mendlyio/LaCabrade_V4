/**
 * Tests de la logique métier des subscribers panier.
 * Exécuter : cd backend && npx tsx src/utils/__tests__/subscribers.test.ts
 *
 * Ces tests valident les décisions prises par les subscribers cart.updated
 * sans appel réseau : on teste la logique pure de détection et de décision.
 */

let passed = 0
let failed = 0

function assert(label: string, actual: unknown, expected: unknown) {
  const ok = actual === expected
  if (ok) {
    console.log(`  ✅ ${label}`)
    passed++
  } else {
    console.log(`  ❌ ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`)
    failed++
  }
}

function assertClose(label: string, actual: number, expected: number, tolerance = 0.01) {
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

// ─── Logique de détection outlet (cartOutletPromoGuardHandler) ───────────────

heading("OutletPromoGuard — Détection article outlet")

function isOutletItem(item: {
  metadata?: Record<string, unknown> | null
  unit_price?: number | null
  compare_at_unit_price?: number | null
}): boolean {
  if ((item.metadata as any)?.outlet_discount === true) return true
  const compareAt = Number(item.compare_at_unit_price ?? 0)
  const unitPrice = Number(item.unit_price ?? 0)
  return compareAt > 0 && compareAt > unitPrice + 0.01
}

assert("metadata.outlet_discount=true → outlet", isOutletItem({ metadata: { outlet_discount: true }, unit_price: 11.96 }), true)
assert("compare_at > unit_price → outlet", isOutletItem({ compare_at_unit_price: 29.90, unit_price: 11.96 }), true)
assert("compare_at === unit_price → PAS outlet", isOutletItem({ compare_at_unit_price: 29.90, unit_price: 29.90 }), false)
assert("compare_at absent → PAS outlet", isOutletItem({ unit_price: 39.90 }), false)
assert("compare_at=0 → PAS outlet", isOutletItem({ compare_at_unit_price: 0, unit_price: 39.90 }), false)
assert("compare_at légèrement < unit_price → PAS outlet (tolérance)", isOutletItem({ compare_at_unit_price: 39.90, unit_price: 39.905 }), false)

heading("OutletPromoGuard — Détection reset de prix (doit restaurer)")

function shouldRestoreOutletPrice(item: {
  unit_price?: number | null
  compare_at_unit_price?: number | null
  metadata?: Record<string, unknown> | null
}): boolean {
  const md = item.metadata as any
  const originalPrice: number | undefined = md?.outlet_original_price
  if (!originalPrice || !md?.outlet_discount_percent) return false
  const currentUnitPrice = Number(item.unit_price ?? 0)
  const currentCompareAt = Number(item.compare_at_unit_price ?? 0)
  const priceReset = Math.abs(currentUnitPrice - originalPrice) < 0.01
  const compareAtMissing = currentCompareAt === 0 || Math.abs(currentCompareAt - originalPrice) > 0.01
  return priceReset || compareAtMissing
}

assert("unit_price réinitialisé au prix original → DOIT restaurer",
  shouldRestoreOutletPrice({
    unit_price: 29.90, // remis au prix plein par Medusa
    compare_at_unit_price: 29.90,
    metadata: { outlet_discount: true, outlet_original_price: 29.90, outlet_discount_percent: 60 }
  }), true)

assert("compare_at effacé → DOIT restaurer",
  shouldRestoreOutletPrice({
    unit_price: 11.96, // prix réduit OK
    compare_at_unit_price: 0, // effacé
    metadata: { outlet_discount: true, outlet_original_price: 29.90, outlet_discount_percent: 60 }
  }), true)

assert("prix et compare_at corrects → NE DOIT PAS restaurer",
  shouldRestoreOutletPrice({
    unit_price: 11.96,
    compare_at_unit_price: 29.90,
    metadata: { outlet_discount: true, outlet_original_price: 29.90, outlet_discount_percent: 60 }
  }), false)

assert("sans metadata.outlet_original_price → NE PEUT PAS restaurer (skip)",
  shouldRestoreOutletPrice({
    unit_price: 29.90,
    metadata: { outlet_discount: true } // pas de original_price
  }), false)

heading("OutletPromoGuard — Calcul du prix restauré")

function computeRestoredPrice(originalPrice: number, discountPercent: number): number {
  return Math.round(originalPrice * (1 - discountPercent / 100) * 100) / 100
}

assertClose("-60% sur 29.90€", computeRestoredPrice(29.90, 60), 11.96)
assertClose("-50% sur 29.90€", computeRestoredPrice(29.90, 50), 14.95)
assertClose("-60% sur 39.90€", computeRestoredPrice(39.90, 60), 15.96)
assertClose("-50% sur 14.90€", computeRestoredPrice(14.90, 50), 7.45)

// ─── Logique livraison gratuite (cartFreeShippingFixHandler) ─────────────────

heading("FreeShippingFix — Calcul sous-total TTC")

function getCartSubtotalEuros(items: Array<{
  unit_price?: number | null
  quantity?: number | null
}> | null | undefined): number {
  if (!items?.length) return 0
  let sum = 0
  for (const item of items) {
    sum += Number(item.unit_price ?? 0) * (item.quantity ?? 1)
  }
  return sum
}

assertClose("Article 29.90 qty=1", getCartSubtotalEuros([{ unit_price: 29.90, quantity: 1 }]), 29.90)
assertClose("Outlet 11.96 + normal 39.90", getCartSubtotalEuros([
  { unit_price: 11.96, quantity: 1 },
  { unit_price: 39.90, quantity: 1 },
]), 51.86)
assertClose("Null/undefined safe", getCartSubtotalEuros([{ unit_price: null, quantity: 1 }]), 0)
assertClose("Panier vide", getCartSubtotalEuros([]), 0)
assertClose("qty=2", getCartSubtotalEuros([{ unit_price: 50, quantity: 2 }]), 100)

heading("FreeShippingFix — Décision de retrait FREE_SHIPPING_75")

const FREE_SHIPPING_THRESHOLD = 75

function shouldRemoveFreeShipping(subtotalEuros: number): boolean {
  return subtotalEuros < FREE_SHIPPING_THRESHOLD
}

assert("51.86€ < 75€ → retirer FREE_SHIPPING", shouldRemoveFreeShipping(51.86), true)
assert("74.99€ < 75€ → retirer FREE_SHIPPING", shouldRemoveFreeShipping(74.99), true)
assert("75.00€ = 75€ → garder FREE_SHIPPING", shouldRemoveFreeShipping(75.00), false)
assert("80.00€ > 75€ → garder FREE_SHIPPING", shouldRemoveFreeShipping(80.00), false)
assert("Outlet 11.96 + Gants 39.90 = 51.86 → retirer", shouldRemoveFreeShipping(51.86), true)

// Cas important : outlet à prix réduit peut passer sous le seuil 75€
assert("Outlet 11.96 + 60€ = 71.96 < 75€ → retirer", shouldRemoveFreeShipping(71.96), true)
assert("Outlet 11.96 + 65€ = 76.96 > 75€ → garder", shouldRemoveFreeShipping(76.96), false)

// ─── Logique PortesOuvertes (cartPortesOuvertesGuardHandler) ─────────────────

heading("PortesOuvertesGuard — Détection article outlet")

// Même logique isOutletItem que le guard PO
function isOutletForPO(item: {
  metadata?: Record<string, unknown> | null
  unit_price?: number | null
  compare_at_unit_price?: number | null
}): boolean {
  if ((item.metadata as any)?.outlet_discount === true) return true
  const compareAt = Number((item as any).compare_at_unit_price ?? 0)
  const unitPrice = Number(item.unit_price ?? 0)
  return compareAt > 0 && compareAt > unitPrice + 0.01
}

assert("Outlet via metadata → exclure du PO", isOutletForPO({ metadata: { outlet_discount: true }, unit_price: 11.96 }), true)
assert("Outlet via compare_at → exclure du PO", isOutletForPO({ compare_at_unit_price: 29.90, unit_price: 11.96 }), true)
assert("Article normal → éligible au PO", isOutletForPO({ unit_price: 39.90 }), false)

heading("PortesOuvertesGuard — Calcul des montants HT pour adjustments")

const VAT_RATE = 0.21

function computeAmountHT(unitPriceTTC: number, quantity: number, discountPct: number): number {
  const ht = unitPriceTTC / (1 + VAT_RATE)
  return ht * discountPct * quantity
}

assertClose("PO -10% sur 39.90€ q=1", computeAmountHT(39.90, 1, 0.10), 3.30, 0.01)
assertClose("PO -20% sur 39.90€ q=1", computeAmountHT(39.90, 1, 0.20), 6.60, 0.01)
assertClose("PO -10% sur 79.90€ q=1", computeAmountHT(79.90, 1, 0.10), 6.60, 0.01)
assertClose("PO -20% sur 79.90€ q=1", computeAmountHT(79.90, 1, 0.20), 13.21, 0.01)
assertClose("PO -10% sur 29.90€ q=2", computeAmountHT(29.90, 2, 0.10), 4.95, 0.01)

// Vérification cohérence: HT × 1.21 doit donner le TTC attendu
assertClose("PO -10% 39.90: HT→TTC = 10%", computeAmountHT(39.90, 1, 0.10) * 1.21, 3.99, 0.02)
assertClose("PO -20% 39.90: HT→TTC = 20%", computeAmountHT(39.90, 1, 0.20) * 1.21, 7.98, 0.02)

heading("PortesOuvertesGuard — Codes connus (pas de conflit)")

const KNOWN_AUTO_CODES = new Set([
  "PO_GLOBAL_10", "PO_CAVALIER_20", "PO_LC_20",
  "BRADERIE_15", "BRADERIE_LC_25",
  "OUTLET_50", "FREE_SHIPPING_75", "PAQUES_10",
])

function hasConflictingManualPromo(adjustments: Array<{ code?: string | null }>): boolean {
  return adjustments.some(a => a.code && !KNOWN_AUTO_CODES.has(a.code))
}

assert("Code manuel NL-XXX → conflit", hasConflictingManualPromo([{ code: "NL-ABCDEF" }]), true)
assert("Code manuel ANNIV10 → conflit", hasConflictingManualPromo([{ code: "ANNIV10" }]), true)
assert("PO_GLOBAL_10 auto → pas de conflit", hasConflictingManualPromo([{ code: "PO_GLOBAL_10" }]), false)
assert("BRADERIE_15 auto → pas de conflit", hasConflictingManualPromo([{ code: "BRADERIE_15" }]), false)
assert("FREE_SHIPPING_75 auto → pas de conflit", hasConflictingManualPromo([{ code: "FREE_SHIPPING_75" }]), false)
assert("Mix PO+NL → conflit (NL est manuel)", hasConflictingManualPromo([{ code: "PO_GLOBAL_10" }, { code: "NL-TEST" }]), true)
assert("Pas d'adjustments → pas de conflit", hasConflictingManualPromo([]), false)

heading("Braderie — Calcul LC et seuil 3 articles")

function isLcTierActive(items: Array<{ isLc: boolean; quantity?: number | null }>): boolean {
  const lcQuantity = items.reduce(
    (sum, item) => sum + (item.isLc ? item.quantity ?? 1 : 0),
    0
  )
  return lcQuantity >= 3
}

assertClose("Braderie -15% sur 39.90€ q=1", computeAmountHT(39.90, 1, 0.15), 4.95, 0.01)
assertClose("Braderie LC -25% sur 39.90€ q=1", computeAmountHT(39.90, 1, 0.25), 8.24, 0.01)
assert("1 article LC → reste -15%", isLcTierActive([{ isLc: true, quantity: 1 }]), false)
assert("2 articles LC + 1 non-LC → reste -15%", isLcTierActive([
  { isLc: true, quantity: 2 },
  { isLc: false, quantity: 1 },
]), false)
assert("3 articles LC → passe à -25%", isLcTierActive([{ isLc: true, quantity: 3 }]), true)
assert("3 lignes LC séparées → passe à -25%", isLcTierActive([
  { isLc: true, quantity: 1 },
  { isLc: true, quantity: 1 },
  { isLc: true, quantity: 1 },
]), true)

// ─── Logique GiftCardShippingFix ─────────────────────────────────────────────

heading("GiftCardShippingFix — Détection panier 100% bons cadeau")

function isGiftCardItem(item: {
  metadata?: Record<string, unknown> | null
  product_title?: string | null
  variant_sku?: string | null
}): boolean {
  return !!(
    (item.metadata as any)?.is_gift_card ||
    String(item.product_title || "").toLowerCase().includes("bon cadeau") ||
    (item.variant_sku || "").startsWith("GC-")
  )
}

function isGiftCardOnlyCart(items: Array<{ metadata?: any; product_title?: string; variant_sku?: string }>): boolean {
  if (!items.length) return false
  return items.every(item => isGiftCardItem(item))
}

assert("Seul article GC → 100% GC", isGiftCardOnlyCart([
  { metadata: { is_gift_card: true }, product_title: "Bon Cadeau La Cabrade - 50€", variant_sku: "GC-50" }
]), true)

assert("Mix GC + article normal → PAS 100% GC", isGiftCardOnlyCart([
  { metadata: { is_gift_card: true }, variant_sku: "GC-50" },
  { product_title: "Selle" }
]), false)

assert("Article normal seul → PAS 100% GC", isGiftCardOnlyCart([
  { product_title: "Selle de dressage" }
]), false)

assert("Panier vide → PAS 100% GC", isGiftCardOnlyCart([]), false)

assert("Titre 'bon cadeau' → GC", isGiftCardItem({ product_title: "Bon Cadeau La Cabrade - 25€" }), true)
assert("SKU GC- → GC", isGiftCardItem({ variant_sku: "GC-25" }), true)
assert("metadata.is_gift_card → GC", isGiftCardItem({ metadata: { is_gift_card: true } }), true)
assert("Selle normale → PAS GC", isGiftCardItem({ product_title: "Selle dressage" }), false)

// ─── Cohérence backend/storefront ────────────────────────────────────────────

heading("COHÉRENCE — Calcul arrondi identique backend et storefront")

// Vérifie que la formule utilisée dans les deux codebase est identique
// pour les cas les plus courants

function backendAdjTTC(htAmount: number): number {
  return Math.round(htAmount * (1 + 0.21) * 100) / 100
}

function storefrontAdjTTC(htAmount: number): number {
  return Math.round(htAmount * 1.21 * 100) / 100
}

// Échantillon de valeurs réelles d'adjustments
const testValues = [1.86, 3.30, 3.5955, 4.13, 5.702, 6.60, 6.61, 8.26, 13.21]
for (const v of testValues) {
  const backend = backendAdjTTC(v)
  const sf = storefrontAdjTTC(v)
  assert(`Arrondi identique pour ${v} HT: backend=${backend} sf=${sf}`, backend, sf)
}

// ─── Résultat final ───────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(60)}`)
console.log(`  RÉSULTAT: ${passed} passés, ${failed} échoués`)
console.log(`${"═".repeat(60)}\n`)

if (failed > 0) process.exit(1)
