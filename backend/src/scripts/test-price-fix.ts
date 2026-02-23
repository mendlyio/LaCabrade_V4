#!/usr/bin/env tsx
/**
 * Simule le workflow de sync pour vérifier que les prix sont correctement résolus
 * Usage: npx tsx src/scripts/test-price-fix.ts [odoo_template_id1] [odoo_template_id2] ...
 * Sans argument: teste le produit 11602 (Skin Care) par défaut
 */
import OdooModuleService from "../modules/odoo/service"

// --- Copie exacte de la logique de résolution de prix du workflow ---
function odooPriceToMedusaAmount(price: unknown, debugSku?: string): number {
  const raw =
    typeof price === "number"
      ? price
      : typeof price === "string"
        ? Number(price.replace(",", "."))
        : Number(price)

  if (!Number.isFinite(raw)) return 0
  const amount = Math.round(raw * 100) / 100
  return amount
}

function resolveOdooPriceAmount({
  variantPrice,
  variantLstPrice,
  productPrice,
  debugSku,
}: {
  variantPrice: unknown
  variantLstPrice?: unknown
  productPrice: unknown
  debugSku?: string
}): number {
  // 1. lst_price de la variante — c'est le VRAI prix de vente public Odoo
  if (variantLstPrice !== undefined && variantLstPrice !== null) {
    const lstPrice = odooPriceToMedusaAmount(variantLstPrice, debugSku)
    if (lstPrice > 0) {
      return lstPrice
    }
  }

  // 2. list_price de la variante
  const varPrice = odooPriceToMedusaAmount(variantPrice, debugSku)
  if (varPrice > 0) {
    return varPrice
  }

  // 3. Fallback sur list_price du template
  const tmplPrice = odooPriceToMedusaAmount(productPrice, debugSku)
  if (tmplPrice > 0) {
    return tmplPrice
  }

  return 0
}
// --- Fin logique prix ---

async function main() {
  const templateIds = process.argv.slice(2).map(Number).filter(n => !isNaN(n))
  if (templateIds.length === 0) templateIds.push(11602) // Skin Care par défaut

  console.log(`\n🧪 Test de la correction des prix pour ${templateIds.length} produit(s)\n`)

  const odooService = new OdooModuleService({}, {
    url: process.env.ODOO_URL!,
    dbName: process.env.ODOO_DB_NAME!,
    username: process.env.ODOO_USERNAME!,
    apiKey: process.env.ODOO_API_KEY!,
  })

  try {
    // Utiliser fetchProductsByIds (qui enrichit maintenant les variantes simples)
    console.log("📦 Récupération des produits via fetchProductsByIds (code corrigé)...\n")
    const products = await odooService.fetchProductsByIds(templateIds)

    for (const odooProduct of products) {
      console.log(`━━━ ${odooProduct.display_name || odooProduct.name} (template #${odooProduct.id}) ━━━`)
      console.log(`  Template list_price: ${odooProduct.list_price}`)
      console.log(`  Variant count: ${odooProduct.product_variant_count}`)

      const variants = Array.isArray(odooProduct.product_variant_ids) 
        ? odooProduct.product_variant_ids 
        : []

      if (odooProduct.product_variant_count <= 1) {
        // Produit simple
        const firstVariant = variants[0]
        const isEnriched = typeof firstVariant === "object" && firstVariant !== null

        console.log(`  Première variante enrichie? ${isEnriched ? "✅ OUI" : "❌ NON (nombre brut)"}`)

        if (isEnriched) {
          console.log(`    variant.id:         ${firstVariant.id}`)
          console.log(`    variant.list_price:  ${firstVariant.list_price}`)
          console.log(`    variant.lst_price:   ${(firstVariant as any).lst_price}`)
          console.log(`    variant.default_code: ${firstVariant.default_code}`)

          const price = resolveOdooPriceAmount({
            variantPrice: firstVariant.list_price,
            variantLstPrice: (firstVariant as any).lst_price,
            productPrice: odooProduct.list_price,
            debugSku: firstVariant.default_code || `ODOO-${firstVariant.id}`,
          })

          console.log(`\n  💰 PRIX RÉSOLU: ${price}€`)
          if (price === 1) {
            console.log(`  ❌ TOUJOURS À 1€ — problème non résolu !`)
          } else if (price > 1) {
            console.log(`  ✅ Prix correct (avant: 1€, maintenant: ${price}€)`)
          } else {
            console.log(`  ⚠️ Prix à 0€ — aucun prix trouvé`)
          }
        } else {
          console.log(`  ❌ La variante n'est PAS enrichie, le fix n'a pas fonctionné`)
        }
      } else {
        // Produit multi-variantes - on teste les 3 premières
        const testVariants = variants.slice(0, 3)
        for (const variant of testVariants) {
          const isEnriched = typeof variant === "object" && variant !== null
          if (isEnriched) {
            const price = resolveOdooPriceAmount({
              variantPrice: variant.list_price,
              variantLstPrice: (variant as any).lst_price,
              productPrice: odooProduct.list_price,
              debugSku: variant.default_code || `ODOO-${variant.id}`,
            })
            console.log(`  Variante ${variant.default_code || variant.id}: list_price=${variant.list_price}, lst_price=${(variant as any).lst_price} → 💰 ${price}€`)
          }
        }
        if (variants.length > 3) {
          console.log(`  ... et ${variants.length - 3} autres variantes`)
        }
      }
      console.log()
    }

    console.log("✅ Test terminé\n")
  } catch (error: any) {
    console.error(`❌ Erreur: ${error.message}`)
    process.exit(1)
  }
}

main()
