/**
 * Tests matching variantes Odoo → Medusa.
 * Exécuter : cd backend && npx tsx src/utils/__tests__/odoo-variant-match.test.ts
 */

import {
  completeVariantOptions,
  extractVariantOptions,
  findExistingVariant,
  isVariantCollisionError,
  optionSignature,
} from "../odoo-variant-match"

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

const existing = [
  {
    id: "var_noir",
    sku: "SKU-NOIR",
    metadata: { odoo_variant_id: 101, external_id: "101" },
    options: [
      { value: "NOIR", option: { title: "Couleur" } },
      { value: "165", option: { title: "Taille" } },
    ],
  },
  {
    id: "var_rouge",
    sku: "SKU-ROUGE",
    metadata: { odoo_variant_id: 102 },
    options: [
      { value: "ROUGE", option: { title: "Couleur" } },
      { value: "165", option: { title: "Taille" } },
    ],
  },
]

assert(
  "signature d'options stable quel que soit l'ordre",
  optionSignature({ Taille: "165", Couleur: "NOIR" }),
  optionSignature({ Couleur: "NOIR", Taille: "165" })
)

assert("extrait les options depuis le format tableau Medusa", extractVariantOptions(existing[0]), {
  Couleur: "NOIR",
  Taille: "165",
})

assert(
  "retrouve par odoo_variant_id même sans SKU chargé",
  findExistingVariant(existing, {
    sku: undefined,
    metadata: { odoo_variant_id: 101 },
    options: { Couleur: "NOIR" },
  })?.id,
  "var_noir"
)

assert("retrouve par SKU", findExistingVariant(existing, { sku: "SKU-ROUGE" })?.id, "var_rouge")

assert(
  "retrouve par combinaison d'options complète",
  findExistingVariant(existing, {
    options: { Couleur: "ROUGE", Taille: "165" },
  })?.id,
  "var_rouge"
)

assert(
  "complète une option manquante depuis la variante existante",
  completeVariantOptions({ Couleur: "NOIR" }, ["Couleur", "Taille"], existing[0]),
  { Couleur: "NOIR", Taille: "165" }
)

assert(
  "refuse une variante incomplète sans existante (cas SHETLA)",
  completeVariantOptions({ Couleur: "SHETLA" }, ["Couleur", "Taille"]),
  null
)

assert(
  "détecte collision already exists",
  isVariantCollisionError("Variant (NOIR) with provided options already exists."),
  true
)
assert(
  "détecte options incomplètes SHETLA",
  isVariantCollisionError(
    "Product has 2 option values but there were 1 provided option values for the variant: SHETLA."
  ),
  true
)
assert("ignore les erreurs non-collision", isVariantCollisionError("ECONNRESET"), false)

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
