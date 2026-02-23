#!/usr/bin/env tsx
/**
 * Script de correction des prix pour TOUS les produits Odoo dans Medusa
 * Se connecte directement à Odoo + DB Medusa pour corriger les prix
 * 
 * Usage: npx tsx src/scripts/fix-all-prices.ts [--dry-run]
 */
import pg from "pg"
import OdooModuleService from "../modules/odoo/service"

const { Pool } = pg

const DRY_RUN = process.argv.includes("--dry-run")

function odooPriceToMedusaAmount(price: unknown): number {
  const raw = typeof price === "number" ? price : Number(price)
  if (!Number.isFinite(raw)) return 0
  return Math.round(raw * 100) / 100
}

async function main() {
  console.log(`\n🔧 Correction des prix de TOUS les produits Odoo`)
  console.log(`   Mode: ${DRY_RUN ? "DRY-RUN (aucune modification)" : "⚡ PRODUCTION (modifications réelles)"}`)
  console.log()

  // 1. Connexion DB Medusa
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  
  try {
    await pool.query("SELECT 1")
    console.log("✅ Connexion DB Medusa OK")
  } catch (e: any) {
    console.error("❌ Impossible de se connecter à la DB:", e.message)
    process.exit(1)
  }

  // 2. Connexion Odoo
  const odooService = new OdooModuleService({}, {
    url: process.env.ODOO_URL!,
    dbName: process.env.ODOO_DB_NAME!,
    username: process.env.ODOO_USERNAME!,
    apiKey: process.env.ODOO_API_KEY!,
  })

  // 3. Récupérer tous les produits Medusa avec un external_id Odoo
  const { rows: medusaProducts } = await pool.query(`
    SELECT p.id, p.title, p.metadata
    FROM product p
    WHERE p.deleted_at IS NULL
      AND p.metadata->>'external_id' IS NOT NULL
    ORDER BY p.title
  `)

  console.log(`📦 ${medusaProducts.length} produits Medusa avec external_id Odoo\n`)

  // 4. Récupérer les variantes Medusa avec leurs prix actuels
  const { rows: medusaVariants } = await pool.query(`
    SELECT 
      pv.id as variant_id,
      pv.product_id,
      pv.title as variant_title,
      pv.sku,
      pv.metadata,
      pp.amount as current_price,
      pp.id as price_id,
      pp.currency_code
    FROM product_variant pv
    LEFT JOIN product_variant_price_set pvps ON pvps.variant_id = pv.id
    LEFT JOIN price_set ps ON ps.id = pvps.price_set_id
    LEFT JOIN price pp ON pp.price_set_id = ps.id
    WHERE pv.deleted_at IS NULL
    ORDER BY pv.product_id, pv.variant_rank
  `)

  console.log(`🔗 ${medusaVariants.length} variantes avec prix dans Medusa\n`)

  // Grouper par product_id
  const variantsByProduct = new Map<string, typeof medusaVariants>()
  for (const v of medusaVariants) {
    const arr = variantsByProduct.get(v.product_id) || []
    arr.push(v)
    variantsByProduct.set(v.product_id, arr)
  }

  // 5. Récupérer tous les IDs de templates Odoo
  const odooTemplateIds = medusaProducts
    .map((p: any) => parseInt(p.metadata?.external_id))
    .filter((id: number) => !isNaN(id))

  console.log(`🔍 Récupération des prix depuis Odoo pour ${odooTemplateIds.length} templates...`)

  // Traiter par lots de 50
  const BATCH_SIZE = 50
  let totalFixed = 0
  let totalSkipped = 0
  let totalErrors = 0
  let totalAlreadyCorrect = 0

  for (let i = 0; i < odooTemplateIds.length; i += BATCH_SIZE) {
    const batch = odooTemplateIds.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(odooTemplateIds.length / BATCH_SIZE)

    process.stdout.write(`\r  Lot ${batchNum}/${totalBatches} (${i + batch.length}/${odooTemplateIds.length} produits)...`)

    try {
      const odooProducts = await odooService.fetchProductsByIds(batch)

      for (const odooProduct of odooProducts) {
        const externalId = String(odooProduct.id)
        
        // Trouver le produit Medusa correspondant
        const medusaProduct = medusaProducts.find(
          (p: any) => String(p.metadata?.external_id) === externalId
        )
        if (!medusaProduct) continue

        const variants = variantsByProduct.get(medusaProduct.id) || []
        if (!variants.length) continue

        // Récupérer les variantes Odoo enrichies
        const odooVariants = Array.isArray(odooProduct.product_variant_ids)
          ? odooProduct.product_variant_ids.filter((v: any) => typeof v === "object")
          : []

        for (const medusaVariant of variants) {
          if (!medusaVariant.price_id) continue

          // Trouver la variante Odoo correspondante
          let odooVariant: any = null
          
          // Match par SKU
          if (medusaVariant.sku) {
            odooVariant = odooVariants.find((ov: any) => 
              ov.default_code === medusaVariant.sku || ov.barcode === medusaVariant.sku
            )
          }
          
          // Match par odoo_variant_id
          if (!odooVariant && medusaVariant.metadata?.odoo_variant_id) {
            odooVariant = odooVariants.find((ov: any) => 
              ov.id === medusaVariant.metadata.odoo_variant_id
            )
          }

          // Si pas trouvé et produit simple, prendre la première variante
          if (!odooVariant && odooVariants.length === 1) {
            odooVariant = odooVariants[0]
          }

          if (!odooVariant) {
            totalSkipped++
            continue
          }

          // Résoudre le prix: lst_price > list_price > template list_price
          let correctPrice = 0
          const lstPrice = odooPriceToMedusaAmount(odooVariant.lst_price)
          const listPrice = odooPriceToMedusaAmount(odooVariant.list_price)
          const templatePrice = odooPriceToMedusaAmount(odooProduct.list_price)

          if (lstPrice > 0) {
            correctPrice = lstPrice
          } else if (listPrice > 0) {
            correctPrice = listPrice
          } else if (templatePrice > 0) {
            correctPrice = templatePrice
          }

          if (correctPrice <= 0) {
            totalSkipped++
            continue
          }

          const currentPrice = Number(medusaVariant.current_price)

          if (Math.abs(currentPrice - correctPrice) < 0.01) {
            totalAlreadyCorrect++
            continue
          }

          // Prix différent → corriger
          if (DRY_RUN) {
            console.log(`\n  [DRY-RUN] ${medusaProduct.title} | SKU:${medusaVariant.sku} | ${currentPrice}€ → ${correctPrice}€`)
          } else {
            try {
              await pool.query(
                `UPDATE price SET amount = $1, updated_at = NOW() WHERE id = $2`,
                [correctPrice, medusaVariant.price_id]
              )
              totalFixed++
            } catch (e: any) {
              console.log(`\n  ❌ Erreur update SKU:${medusaVariant.sku}: ${e.message}`)
              totalErrors++
            }
          }

          if (DRY_RUN) totalFixed++
        }
      }
    } catch (e: any) {
      console.log(`\n  ⚠️ Erreur lot ${batchNum}: ${e.message}`)
      totalErrors++
    }
  }

  console.log(`\n\n━━━ RÉSULTAT ━━━`)
  console.log(`  ✅ Déjà corrects:  ${totalAlreadyCorrect}`)
  console.log(`  🔧 Corrigés:       ${totalFixed}`)
  console.log(`  ⏭️  Ignorés:       ${totalSkipped}`)
  console.log(`  ❌ Erreurs:        ${totalErrors}`)
  console.log()

  await pool.end()
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
