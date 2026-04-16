#!/usr/bin/env tsx
/**
 * Script de correction des prix pour TOUS les produits Odoo dans Medusa
 * Se connecte directement à Odoo + DB Medusa pour corriger les prix
 *
 * Usage:
 *   npx tsx src/scripts/fix-all-prices.ts [--dry-run]
 *   npx tsx src/scripts/fix-all-prices.ts 70297 73329
 *   npx tsx src/scripts/fix-all-prices.ts --skus=70297,73329
 *   (lancer depuis le dossier backend pour charger .env)
 */
import path from "path"
import { config as loadEnv } from "dotenv"
import pg from "pg"
import type { Pool as PgPool } from "pg"
import OdooModuleService from "../modules/odoo/service"

loadEnv({ path: path.resolve(process.cwd(), ".env") })

const { Pool } = pg

const DRY_RUN = process.argv.includes("--dry-run")

const skusArg = process.argv.find((a) => a.startsWith("--skus="))
const skusFromFlag = skusArg
  ? skusArg
      .slice("--skus=".length)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : []
/** Arguments positionnels (ex. `…/fix-all-prices.ts 70297 73329`) */
const positionalSkus = process.argv.slice(2).filter(
  (a) =>
    a !== "--dry-run" &&
    !a.startsWith("--") &&
    !a.endsWith(".ts") &&
    !a.includes("/")
)
const skuList =
  skusFromFlag.length > 0 ? skusFromFlag : positionalSkus.length > 0 ? positionalSkus : []
const SKU_FILTER: Set<string> | null = skuList.length > 0 ? new Set(skuList) : null

/** Même logique que sync-from-erp (chaînes avec virgule, etc.) */
function odooPriceToMedusaAmount(price: unknown): number {
  const raw =
    typeof price === "number"
      ? price
      : typeof price === "string"
        ? Number(price.replace(",", "."))
        : Number(price)

  if (!Number.isFinite(raw)) return 0
  return Math.round(raw * 100) / 100
}

/**
 * Si prix / price_set / lien variante ont été soft-deleted, l'API Medusa ne renvoie aucun prix
 * (même si `amount` est correct dans `price`). Il faut remettre deleted_at à NULL.
 */
async function restoreSoftDeletedPricing(
  pool: PgPool,
  params: {
    variantId: string
    priceId: string
    priceSetId: string | null
    pvpsId: string | null
  }
): Promise<void> {
  const { variantId, priceId, priceSetId, pvpsId } = params
  await pool.query(
    `UPDATE price SET deleted_at = NULL, updated_at = NOW() WHERE id = $1`,
    [priceId]
  )
  if (priceSetId) {
    await pool.query(
      `UPDATE price_set SET deleted_at = NULL, updated_at = NOW() WHERE id = $1`,
      [priceSetId]
    )
  }
  if (pvpsId) {
    await pool.query(
      `UPDATE product_variant_price_set SET deleted_at = NULL, updated_at = NOW() WHERE id = $1`,
      [pvpsId]
    )
  } else {
    await pool.query(
      `UPDATE product_variant_price_set SET deleted_at = NULL, updated_at = NOW()
       WHERE variant_id = $1 AND price_set_id = $2`,
      [variantId, priceSetId]
    )
  }
}

function pricingWasSoftDeleted(row: {
  price_deleted_at?: string | null
  price_set_deleted_at?: string | null
  pvps_deleted_at?: string | null
}): boolean {
  return !!(row.price_deleted_at || row.price_set_deleted_at || row.pvps_deleted_at)
}

async function main() {
  const scope =
    SKU_FILTER && SKU_FILTER.size > 0
      ? `SKU listés (${[...SKU_FILTER].join(", ")})`
      : "tous les produits Odoo"
  console.log(`\n🔧 Correction des prix — ${scope}`)
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

  // 4. Récupérer les variantes Medusa avec leurs prix (y compris soft-deleted : sinon pas d’affichage API)
  const { rows: medusaVariants } = await pool.query(`
    SELECT DISTINCT ON (pv.id)
      pv.id as variant_id,
      pv.product_id,
      pv.title as variant_title,
      pv.sku,
      pv.metadata,
      pp.amount as current_price,
      pp.id as price_id,
      pp.currency_code,
      pvps.id as pvps_id,
      ps.id as price_set_id,
      pp.deleted_at as price_deleted_at,
      ps.deleted_at as price_set_deleted_at,
      pvps.deleted_at as pvps_deleted_at
    FROM product_variant pv
    LEFT JOIN product_variant_price_set pvps ON pvps.variant_id = pv.id
    LEFT JOIN price_set ps ON ps.id = pvps.price_set_id
    LEFT JOIN price pp ON pp.price_set_id = ps.id
      AND (LOWER(pp.currency_code) = 'eur' OR pp.currency_code IS NULL)
    WHERE pv.deleted_at IS NULL
    ORDER BY
      pv.id,
      (pp.id IS NOT NULL) DESC,
      (pvps.deleted_at IS NULL) DESC,
      (pp.deleted_at IS NULL) DESC,
      pvps.updated_at DESC NULLS LAST,
      pp.updated_at DESC NULLS LAST
  `)

  console.log(`🔗 ${medusaVariants.length} variantes avec prix dans Medusa\n`)

  let filteredProducts = medusaProducts
  let filteredVariants = medusaVariants

  if (SKU_FILTER && SKU_FILTER.size > 0) {
    filteredVariants = medusaVariants.filter(
      (v) => v.sku && SKU_FILTER.has(String(v.sku).trim())
    )
    const productIds = new Set(filteredVariants.map((v) => v.product_id))
    filteredProducts = medusaProducts.filter((p) => productIds.has(p.id))
    console.log(
      `🎯 Filtre SKU: ${[...SKU_FILTER].join(", ")} → ${filteredVariants.length} variante(s), ${filteredProducts.length} produit(s)\n`
    )
    if (filteredVariants.length === 0) {
      console.error(
        "❌ Aucune variante Medusa ne correspond à ces SKU (colonne sku sur product_variant)."
      )
      await pool.end()
      process.exit(1)
    }
  }

  // Grouper par product_id
  const variantsByProduct = new Map<string, typeof medusaVariants>()
  for (const v of filteredVariants) {
    const arr = variantsByProduct.get(v.product_id) || []
    arr.push(v)
    variantsByProduct.set(v.product_id, arr)
  }

  // 5. Récupérer tous les IDs de templates Odoo
  const odooTemplateIds = filteredProducts
    .map((p: any) => parseInt(p.metadata?.external_id))
    .filter((id: number) => !isNaN(id))

  console.log(`🔍 Récupération des prix depuis Odoo pour ${odooTemplateIds.length} templates...`)

  // Traiter par lots de 50
  const BATCH_SIZE = 50
  let totalFixed = 0
  let totalRestoredLinks = 0
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
        const medusaProduct = filteredProducts.find(
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

          if (!medusaVariant.price_id) {
            totalSkipped++
            continue
          }

          const currentPrice = Number(medusaVariant.current_price)
          const amountOk =
            Number.isFinite(currentPrice) &&
            Math.abs(currentPrice - correctPrice) < 0.01
          const needsRestore = pricingWasSoftDeleted(medusaVariant)

          if (amountOk && !needsRestore) {
            totalAlreadyCorrect++
            continue
          }

          if (DRY_RUN) {
            if (!amountOk) {
              console.log(
                `\n  [DRY-RUN] ${medusaProduct.title} | SKU:${medusaVariant.sku} | ${currentPrice}€ → ${correctPrice}€`
              )
            }
            if (needsRestore) {
              console.log(
                `  [DRY-RUN] Réactivation liens prix (soft-delete) SKU:${medusaVariant.sku}`
              )
            }
            if (!amountOk) totalFixed++
            if (needsRestore) totalRestoredLinks++
            continue
          }

          try {
            if (!amountOk) {
              await pool.query(
                `UPDATE price SET amount = $1, updated_at = NOW() WHERE id = $2`,
                [correctPrice, medusaVariant.price_id]
              )
              totalFixed++
            }
            if (needsRestore) {
              await restoreSoftDeletedPricing(pool, {
                variantId: medusaVariant.variant_id,
                priceId: medusaVariant.price_id,
                priceSetId: medusaVariant.price_set_id ?? null,
                pvpsId: medusaVariant.pvps_id ?? null,
              })
              totalRestoredLinks++
            }
          } catch (e: any) {
            console.log(`\n  ❌ Erreur update SKU:${medusaVariant.sku}: ${e.message}`)
            totalErrors++
          }
        }
      }
    } catch (e: any) {
      console.log(`\n  ⚠️ Erreur lot ${batchNum}: ${e.message}`)
      totalErrors++
    }
  }

  console.log(`\n\n━━━ RÉSULTAT ━━━`)
  console.log(`  ✅ Déjà corrects:  ${totalAlreadyCorrect}`)
  console.log(`  🔧 Montants ajustés: ${totalFixed}`)
  console.log(`  🔗 Liens prix réactivés (API): ${totalRestoredLinks}`)
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
