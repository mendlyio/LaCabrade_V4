/**
 * Portes Ouvertes octobre 2026 — règles pures.
 * Exécuter : cd backend && npx tsx src/utils/__tests__/po-octobre.test.ts
 */

import {
  expandCategoryHandles,
  getOutletDiscountPercent,
  isPoOctobrePeriod,
  outletPriceSync,
  PO_OCTOBRE_CAVALIER_PERCENT,
} from "../portes-ouvertes-octobre"

let passed = 0
let failed = 0

function assert(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) {
    console.log(`  ✅ ${label}`)
    passed++
  } else {
    console.log(`  ❌ ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`)
    failed++
  }
}

const before = new Date("2026-10-15T21:59:59.000Z") // 15 oct 23:59 BEL
const start = new Date("2026-10-15T22:00:00.000Z") // 16 oct 00:00 BEL
const during = new Date("2026-10-20T12:00:00.000Z")
const end = new Date("2026-10-24T21:59:59.000Z") // 24 oct 23:59 BEL
const after = new Date("2026-10-24T22:00:00.000Z") // 25 oct 00:00 BEL

assert("avant la PO : inactive", isPoOctobrePeriod(before), false)
assert("début : active", isPoOctobrePeriod(start), true)
assert("pendant : active", isPoOctobrePeriod(during), true)
assert("fin : active", isPoOctobrePeriod(end), true)
assert("après : inactive", isPoOctobrePeriod(after), false)

assert("outlet avant = 50", getOutletDiscountPercent(before), 50)
assert("outlet pendant = 60", getOutletDiscountPercent(during), 60)
assert("outlet après = 50", getOutletDiscountPercent(after), 50)
assert("cavalier = 20", PO_OCTOBRE_CAVALIER_PERCENT, 20)

const catalog = [
  { id: "root", handle: "cavalier", parent_category_id: null },
  { id: "child", handle: "pantalons", parent_category_id: "root" },
  { id: "leaf", handle: "pantalons-dame", parent_category_id: "child" },
  { id: "horse", handle: "cheval", parent_category_id: null },
  { id: "outlet", handle: "outlet", parent_category_id: null },
  { id: "outlet-child", handle: "outlet-727", parent_category_id: "outlet" },
]

assert(
  "sous-catégorie remonte jusqu'à cavalier",
  expandCategoryHandles([{ id: "leaf", handle: "pantalons-dame" }], catalog).sort(),
  ["cavalier", "pantalons", "pantalons-dame"].sort()
)
assert(
  "cheval ne devient pas cavalier",
  expandCategoryHandles([{ id: "horse", handle: "cheval" }], catalog),
  ["cheval"]
)
assert(
  "un id de sous-catégorie suffit pour remonter à cavalier",
  expandCategoryHandles([{ id: "leaf" }], catalog).sort(),
  ["cavalier", "pantalons", "pantalons-dame"].sort()
)
assert(
  "outlet enfant remonte à outlet",
  expandCategoryHandles([{ id: "outlet-child", handle: "outlet-727" }], catalog).sort(),
  ["outlet", "outlet-727"].sort()
)

const synced = outletPriceSync(
  {
    unit_price: 50,
    compare_at_unit_price: 100,
    metadata: { outlet_discount: true, outlet_original_price: 100, outlet_discount_percent: 50 },
  },
  during
)
assert("pendant la PO, 100€ passe à 40€", synced?.unit_price, 40)
assert("metadata percent 60", synced?.metadata.outlet_discount_percent, 60)

const already = outletPriceSync(
  {
    unit_price: 40,
    compare_at_unit_price: 100,
    metadata: { outlet_discount: true, outlet_original_price: 100, outlet_discount_percent: 60 },
  },
  during
)
assert("déjà à 60 % : rien à changer", already, null)

const reverted = outletPriceSync(
  {
    unit_price: 40,
    compare_at_unit_price: 100,
    metadata: { outlet_discount: true, outlet_original_price: 100, outlet_discount_percent: 60 },
  },
  after
)
assert("après la PO, retour à 50€", reverted?.unit_price, 50)
assert("metadata percent 50", reverted?.metadata.outlet_discount_percent, 50)

const notOutlet = outletPriceSync({ unit_price: 100, metadata: {} }, during)
assert("article normal ignoré", notOutlet, null)

console.log(`\n${passed} passés, ${failed} échoués`)
if (failed > 0) process.exit(1)
