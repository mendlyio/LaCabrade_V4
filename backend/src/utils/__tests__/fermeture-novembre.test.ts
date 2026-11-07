/**
 * Fermeture magasin novembre 2026 — règles pures.
 * Exécuter : cd backend && npx tsx src/utils/__tests__/fermeture-novembre.test.ts
 */

import { expandCategoryHandles } from "../portes-ouvertes-octobre"
import {
  isFermetureNovEligible,
  isFermetureNovPeriod,
} from "../fermeture-novembre"

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

// Période (heure belge CET = UTC+1)
assert("8 nov 23:59 BEL → hors période", isFermetureNovPeriod(new Date("2026-11-08T22:59:59Z")), false)
assert("9 nov 00:00 BEL → en période", isFermetureNovPeriod(new Date("2026-11-08T23:00:00Z")), true)
assert("10 nov midi → en période", isFermetureNovPeriod(new Date("2026-11-10T11:00:00Z")), true)
assert("11 nov 23:59 BEL → en période", isFermetureNovPeriod(new Date("2026-11-11T22:59:00Z")), true)
assert("12 nov 00:00 BEL → hors période", isFermetureNovPeriod(new Date("2026-11-11T23:00:00Z")), false)

// Arbre de catégories simplifié
const catalog = [
  { id: "c1", handle: "soins-et-alimentation", parent_category_id: null },
  { id: "c2", handle: "complements-alimentaires", parent_category_id: "c1" },
  { id: "c3", handle: "systeme-digestif", parent_category_id: "c2" },
  { id: "c4", handle: "tondeuses-et-peignes", parent_category_id: "c1" },
  { id: "c5", handle: "cavalier", parent_category_id: null },
  { id: "c6", handle: "vestes", parent_category_id: "c5" },
  { id: "c7", handle: "outlet", parent_category_id: null },
  { id: "c8", handle: "shampoings", parent_category_id: "c1" },
]
const h = (id: string) => expandCategoryHandles([{ id }], catalog)

assert("veste cavalier → éligible", isFermetureNovEligible(h("c6"), false), true)
assert("shampoing (soins) → éligible", isFermetureNovEligible(h("c8"), false), true)
assert("complément (sous-catégorie) → exclu", isFermetureNovEligible(h("c3"), false), false)
assert("tondeuse → exclue", isFermetureNovEligible(h("c4"), false), false)
assert("catégorie outlet → exclue", isFermetureNovEligible(h("c7"), false), false)
assert("article outlet (metadata) → exclu", isFermetureNovEligible(h("c6"), true), false)
assert("sans catégorie → éligible", isFermetureNovEligible([], false), true)

console.log(`\n${passed} OK, ${failed} KO`)
if (failed > 0) process.exit(1)
