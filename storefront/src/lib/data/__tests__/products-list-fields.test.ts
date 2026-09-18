/**
 * Listes boutique : exclure description/subtitle sans changer le filtrage.
 * Exécuter : cd storefront && npx tsx src/lib/data/__tests__/products-list-fields.test.ts
 */

import {
  PRODUCT_LIST_OMIT_FIELDS,
  productListCacheQuery,
  productListRequestFields,
} from "../../util/product-list-fields"

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

const brandPageFields =
  "*variants.calculated_price,+variants.inventory_quantity,+variants.prices,+metadata,+collection.title,+collection.handle,+categories.handle,+categories.name,+categories.id"

assert(
  "défaut liste exclut description et subtitle",
  productListRequestFields(undefined).includes("-description") &&
    productListRequestFields(undefined).includes("-subtitle"),
  true
)

assert(
  "champs marque / catégorie conservés (filtre metadata + collection)",
  productListRequestFields({ fields: brandPageFields } as any).startsWith(brandPageFields),
  true
)

assert(
  "champs marque reçoivent aussi les exclusions HTML",
  PRODUCT_LIST_OMIT_FIELDS.every((field) =>
    productListRequestFields({ fields: brandPageFields } as any).includes(field)
  ),
  true
)

assert(
  "ne pas dupliquer -description si déjà demandé",
  productListRequestFields({
    fields: "*variants.calculated_price,-description,-subtitle",
  } as any),
  "*variants.calculated_price,-description,-subtitle"
)

assert(
  "clé de cache identique si mêmes queryParams (fields inclus)",
  productListCacheQuery({ fields: brandPageFields, limit: 100 } as any) ===
    productListCacheQuery({ fields: brandPageFields, limit: 100 } as any),
  true
)

assert(
  "clé de cache distincte si filters différents (pas d'unification hasardeuse)",
  productListCacheQuery({ category_id: ["a"], limit: 100 } as any) !==
    productListCacheQuery({ category_id: ["b"], limit: 100 } as any),
  true
)

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
