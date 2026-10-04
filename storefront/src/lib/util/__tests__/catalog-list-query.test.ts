/**
 * Catalogue partagé : category_id hors getProductsList.
 * Exécuter : cd storefront && npx tsx src/lib/util/__tests__/catalog-list-query.test.ts
 */

import {
  CATALOG_ASSEMBLY_BATCH,
  catalogAssemblyQuery,
  catalogListQuery,
} from "../catalog-list-query"
import { productListCacheQuery } from "../product-list-fields"

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

const fields =
  "*variants.calculated_price,+variants.inventory_quantity,+variants.prices,+metadata,+collection.title,+collection.handle,+categories.handle,+categories.name,+categories.id"

const categoryA = {
  limit: 100,
  offset: 0,
  region_id: "reg_be",
  fields,
  order: "-created_at",
  category_id: ["cat-a", "cat-a-child"],
}

const categoryB = {
  ...categoryA,
  category_id: ["cat-b"],
}

const sharedA = catalogListQuery(categoryA)
const sharedB = catalogListQuery(categoryB)

assert("category_id retiré", "category_id" in sharedA, false)
assert("fields / region / order conservés", sharedA, {
  limit: 100,
  offset: 0,
  region_id: "reg_be",
  fields,
  order: "-created_at",
})
assert(
  "deux catégories → même clé cache liste",
  productListCacheQuery(sharedA as any) === productListCacheQuery(sharedB as any),
  true
)
assert(
  "sans helper les clés restent distinctes (pas d'unification hasardeuse)",
  productListCacheQuery(categoryA as any) !== productListCacheQuery(categoryB as any),
  true
)

const withSearch = catalogListQuery({
  ...categoryA,
  q: "licol",
})
assert("q de recherche conservé", (withSearch as { q?: string }).q, "licol")

const pageTwo = {
  ...categoryA,
  offset: 100,
  limit: 100,
}
const assemblyA = catalogAssemblyQuery(categoryA)
const assemblyB = catalogAssemblyQuery(categoryB)
const assemblyPageTwo = catalogAssemblyQuery(pageTwo)
const assemblySearch = catalogAssemblyQuery({
  ...categoryA,
  q: "licol",
})

assert("lots catalogue toujours 100", assemblyA.limit, CATALOG_ASSEMBLY_BATCH)
assert("offset page normalisé à 0", assemblyA.offset, 0)
assert("offset page 2 aussi à 0", assemblyPageTwo.offset, 0)
assert(
  "deux catégories + pages → même clé assemblage",
  productListCacheQuery(assemblyA as any) ===
    productListCacheQuery(assemblyB as any) &&
    productListCacheQuery(assemblyA as any) ===
      productListCacheQuery(assemblyPageTwo as any),
  true
)
assert(
  "q de recherche : clé assemblage distincte",
  productListCacheQuery(assemblyA as any) !==
    productListCacheQuery(assemblySearch as any),
  true
)
assert("q conservé sur l'assemblage", (assemblySearch as { q?: string }).q, "licol")

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
