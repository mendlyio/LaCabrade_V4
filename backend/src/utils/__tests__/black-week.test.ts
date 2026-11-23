/**
 * Black Week 2026 — règles pures.
 * Exécuter : cd backend && npx tsx src/utils/__tests__/black-week.test.ts
 */

import { getOutletDiscountPercent } from "../portes-ouvertes-octobre"
import {
  BW_BLANKET_CODE,
  BW_BLANKET_MULTI_CODE,
  BW_CLOTHING_CODE,
  blackWeekAdjustmentsActive,
  blackWeekBlanketQuantity,
  isBlackWeekPeriod,
  planBlackWeekAdjustments,
  type BlackWeekItem,
} from "../black-week"

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

const before = new Date("2026-11-22T22:59:59.000Z")
const start = new Date("2026-11-22T23:00:00.000Z")
const during = new Date("2026-11-25T12:00:00.000Z")
const end = new Date("2026-11-30T22:59:59.000Z")
const after = new Date("2026-11-30T23:00:00.000Z")

assert("22 nov 23:59 BEL → hors période", isBlackWeekPeriod(before), false)
assert("23 nov 00:00 BEL → en période", isBlackWeekPeriod(start), true)
assert("25 nov midi → en période", isBlackWeekPeriod(during), true)
assert("30 nov 23:59 BEL → en période", isBlackWeekPeriod(end), true)
assert("1er déc 00:00 BEL → hors période", isBlackWeekPeriod(after), false)
assert("ajustements actifs pendant", blackWeekAdjustmentsActive(during), true)
assert("ajustements inactifs après", blackWeekAdjustmentsActive(after), false)

assert("outlet 12 nov = 50", getOutletDiscountPercent(new Date("2026-11-12T12:00:00.000Z")), 50)
assert("outlet pendant Black Week = 60", getOutletDiscountPercent(during), 60)
assert("outlet après Black Week = 50", getOutletDiscountPercent(after), 50)
assert(
  "outlet PO octobre inchangé = 60",
  getOutletDiscountPercent(new Date("2026-10-20T12:00:00.000Z")),
  60
)

function item(partial: Partial<BlackWeekItem> & Pick<BlackWeekItem, "id" | "handles">): BlackWeekItem {
  return {
    unitPrice: 100,
    quantity: 1,
    isOutlet: false,
    isGiftCard: false,
    ...partial,
  }
}

const amountFor = (unitPrice: number, quantity: number, percent: number) =>
  unitPrice * quantity * (percent / 100)

assert(
  "une couverture ne compte pas un outlet",
  blackWeekBlanketQuantity([
    item({ id: "a", handles: ["couvertures"] }),
    item({ id: "b", handles: ["couvertures", "outlet"], isOutlet: true }),
  ]),
  1
)

const oneBlanket = planBlackWeekAdjustments({
  apply: true,
  items: [item({ id: "c1", handles: ["couvertures-d'ecurie", "couvertures"] })],
  existing: [],
  amountFor,
})
assert("1 couverture → −20 %", oneBlanket.creates, [
  {
    item_id: "c1",
    amount: 20,
    code: BW_BLANKET_CODE,
    description: "Black Week −20 % couvertures",
  },
])

const twoBlankets = planBlackWeekAdjustments({
  apply: true,
  items: [
    item({ id: "c1", handles: ["couvertures"] }),
    item({ id: "c2", handles: ["sous-couvertures-et-accessoires", "couvertures"], unitPrice: 80 }),
  ],
  existing: [],
  amountFor,
})
assert(
  "2 couvertures → −30 % chacune",
  twoBlankets.creates.map((line) => ({ item_id: line.item_id, amount: line.amount, code: line.code })),
  [
    { item_id: "c1", amount: 30, code: BW_BLANKET_MULTI_CODE },
    { item_id: "c2", amount: 24, code: BW_BLANKET_MULTI_CODE },
  ]
)

const qtyTwo = planBlackWeekAdjustments({
  apply: true,
  items: [item({ id: "c1", handles: ["couvertures"], quantity: 2, unitPrice: 50 })],
  existing: [],
  amountFor,
})
assert("quantité 2 sur une ligne → −30 %", qtyTwo.creates[0]?.code, BW_BLANKET_MULTI_CODE)
assert("montant 30 % × 2 × 50", qtyTwo.creates[0]?.amount, 30)

const clothing = planBlackWeekAdjustments({
  apply: true,
  items: [item({ id: "v1", handles: ["pantalons-dame", "pantalons", "cavalier"], unitPrice: 120 })],
  existing: [],
  amountFor,
})
assert("pantalon → −20 % vêtements", clothing.creates[0]?.code, BW_CLOTHING_CODE)
assert("montant vêtement", clothing.creates[0]?.amount, 24)

const notClothing = planBlackWeekAdjustments({
  apply: true,
  items: [
    item({ id: "bottes", handles: ["bottes", "cavalier"] }),
    item({ id: "bonnet-selle", handles: ["bonnets", "cheval"] }),
    item({ id: "casque", handles: ["casques"] }),
  ],
  existing: [{ id: "old", item_id: "bottes", code: BW_CLOTHING_CODE, amount: 10 }],
  amountFor,
})
assert("bottes, bonnet de selle, casque : pas de remise", notClothing.creates, [])
assert("adjustment vêtement retiré des bottes", notClothing.removeIds, ["old"])

const mixed = planBlackWeekAdjustments({
  apply: true,
  items: [
    item({ id: "v1", handles: ["vestes"] }),
    item({ id: "c1", handles: ["couvertures"] }),
    item({ id: "c2", handles: ["couvertures"], quantity: 1 }),
  ],
  existing: [],
  amountFor,
})
assert(
  "vêtement reste à −20 % à côté de 2 couvertures",
  mixed.creates.find((line) => line.item_id === "v1")?.code,
  BW_CLOTHING_CODE
)
assert(
  "couvertures du même panier à −30 %",
  mixed.creates.filter((line) => line.item_id !== "v1").every((line) => line.code === BW_BLANKET_MULTI_CODE),
  true
)

const outletClothing = planBlackWeekAdjustments({
  apply: true,
  items: [
    item({
      id: "o1",
      handles: ["vestes", "outlet"],
      isOutlet: true,
      unitPrice: 40,
    }),
  ],
  existing: [{ id: "stack", item_id: "o1", code: BW_CLOTHING_CODE, amount: 8 }],
  amountFor,
})
assert("outlet + vêtement : pas de −20 % en plus", outletClothing.creates, [])
assert("adjustment vêtement outlet supprimé", outletClothing.removeIds, ["stack"])

const bothCategories = planBlackWeekAdjustments({
  apply: true,
  items: [item({ id: "x", handles: ["couvertures", "vestes"] })],
  existing: [
    { id: "a", item_id: "x", code: BW_CLOTHING_CODE, amount: 20 },
    { id: "b", item_id: "x", code: BW_BLANKET_CODE, amount: 20 },
  ],
  amountFor,
})
assert("couverture aussi vêtement : un seul code couverture", bothCategories.updates[0]?.code, BW_BLANKET_CODE)
assert("le second adjustment est retiré", bothCategories.removeIds, ["b"])
assert("pas de création en double", bothCategories.creates, [])

const downgrade = planBlackWeekAdjustments({
  apply: true,
  items: [item({ id: "c1", handles: ["couvertures"], quantity: 1 })],
  existing: [{ id: "a", item_id: "c1", code: BW_BLANKET_MULTI_CODE, amount: 30 }],
  amountFor,
})
assert("revenir à 1 couverture repasse à −20 %", downgrade.updates[0]?.code, BW_BLANKET_CODE)
assert("montant repassé à 20", downgrade.updates[0]?.amount, 20)

const already = planBlackWeekAdjustments({
  apply: true,
  items: [item({ id: "v1", handles: ["gants"] })],
  existing: [{ id: "a", item_id: "v1", code: BW_CLOTHING_CODE, amount: 20 }],
  amountFor,
})
assert("montant déjà juste : rien à écrire", already, { removeIds: [], updates: [], creates: [] })

const stopped = planBlackWeekAdjustments({
  apply: false,
  items: [item({ id: "v1", handles: ["vestes"] })],
  existing: [{ id: "a", item_id: "v1", code: BW_CLOTHING_CODE, amount: 20 }],
  amountFor,
})
assert("hors période : adjustment retiré", stopped.removeIds, ["a"])
assert("hors période : rien créé", stopped.creates, [])

const gift = planBlackWeekAdjustments({
  apply: true,
  items: [item({ id: "gc", handles: ["vestes"], isGiftCard: true })],
  existing: [],
  amountFor,
})
assert("bon cadeau exclu", gift.creates, [])

console.log(`\n${passed} passés, ${failed} échoués`)
if (failed > 0) process.exit(1)
