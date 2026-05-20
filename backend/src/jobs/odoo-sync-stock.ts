import { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { ODOO_MODULE } from "../modules/odoo"
import OdooModuleService from "../modules/odoo/service"

/**
 * Job planifié : Synchronisation du stock Odoo → Medusa toutes les 15 minutes
 *
 * ⚠️ Ce job synchronise UNIQUEMENT le stock des produits DÉJÀ importés
 * dans Medusa. Les imports de produits se font manuellement via l'UI Admin.
 *
 * Refactor (mai 2026) :
 *  - Mutex global : si un run précédent tourne encore, on skip (évitait
 *    précédemment l'empilement de jobs qui saturait l'event loop et faisait
 *    timeout le healthcheck Railway → SIGTERM → restart).
 *  - Récupération du stock Odoo par BATCH (1 appel RPC pour 200 SKUs au lieu
 *    de 200 appels). Diminue de 100× le nombre de requêtes vers Odoo.
 *  - Suppression de la création de lien variant↔inventory à chaque tick :
 *    c'est le rôle de l'import initial, pas du cron de sync stock.
 *  - Yield à l'event loop entre chaque batch pour que les healthchecks
 *    Railway puissent passer pendant la sync.
 *  - Logs résumés (par batch) au lieu d'une ligne par variante.
 */

// Mutex global module-level (le module est singleton dans le process Medusa).
let isRunning = false
let lastRunStartedAt: number | null = null

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const yieldEventLoop = () => new Promise<void>((r) => setImmediate(r))

const SKU_BATCH = Number(process.env.STOCK_SYNC_SKU_BATCH || 200)
const PRODUCT_PAGE = Number(process.env.STOCK_SYNC_PRODUCT_PAGE || 200)
const MAX_RUN_MS = Number(process.env.STOCK_SYNC_MAX_RUN_MS || 10 * 60 * 1000) // 10 min

export default async function syncStockFromOdooJob(container: MedusaContainer) {
  // Garde-fou mutex : si un run précédent tourne encore, on n'empile pas.
  if (isRunning) {
    const elapsed = lastRunStartedAt ? Math.round((Date.now() - lastRunStartedAt) / 1000) : 0
    console.log(
      `⏭️  [STOCK SYNC] Skip: run précédent encore en cours (${elapsed}s écoulés)`
    )
    return
  }

  // Vérifier la configuration Odoo
  if (!process.env.ODOO_URL || !process.env.ODOO_DB_NAME) {
    return // Silent skip si Odoo non configuré
  }

  // Vérifier si le module Odoo est enregistré
  let odooService: OdooModuleService
  try {
    odooService = container.resolve(ODOO_MODULE)
  } catch (error) {
    return
  }

  isRunning = true
  lastRunStartedAt = Date.now()
  const runDeadline = lastRunStartedAt + MAX_RUN_MS

  try {
    console.log("🔄 [STOCK SYNC] Démarrage sync stock depuis Odoo...")

    const inventoryService = container.resolve(Modules.INVENTORY)
    const productService = container.resolve(Modules.PRODUCT)

    // 1) Récupérer les variantes Medusa à synchroniser (uniquement celles avec un SKU)
    //    On pagine pour éviter les pics mémoire sur les grosses catalogues.
    type VariantToSync = { sku: string; productId: string; variantId: string }
    const toSync: VariantToSync[] = []
    let offset = 0
    while (true) {
      if (Date.now() > runDeadline) {
        console.warn("⏱️  [STOCK SYNC] Deadline atteinte pendant le listing produits, arrêt anticipé")
        break
      }

      const batch = await productService.listProducts(
        {},
        {
          select: ["id", "metadata"],
          relations: ["variants"],
          take: PRODUCT_PAGE,
          skip: offset,
        }
      )
      if (!batch?.length) break

      for (const product of batch as any[]) {
        // Ne synchroniser que les produits importés depuis Odoo
        if (!product.metadata?.external_id) continue
        for (const variant of product.variants || []) {
          if (!variant.sku) continue
          toSync.push({
            sku: variant.sku,
            productId: product.id,
            variantId: variant.id,
          })
        }
      }

      if (batch.length < PRODUCT_PAGE) break
      offset += PRODUCT_PAGE
      await yieldEventLoop()
    }

    if (toSync.length === 0) {
      console.log("ℹ️  [STOCK SYNC] Aucune variante Odoo à synchroniser")
      return
    }

    console.log(`📦 [STOCK SYNC] ${toSync.length} variantes à vérifier (par batchs de ${SKU_BATCH})`)

    // 2) Traitement par batch de SKUs
    let updated = 0
    let unchanged = 0
    let missingInOdoo = 0
    let missingInventory = 0
    let errors = 0

    for (let i = 0; i < toSync.length; i += SKU_BATCH) {
      if (Date.now() > runDeadline) {
        console.warn(
          `⏱️  [STOCK SYNC] Deadline ${MAX_RUN_MS}ms atteinte, arrêt à ${i}/${toSync.length}`
        )
        break
      }

      const slice = toSync.slice(i, i + SKU_BATCH)
      const skus = slice.map((v) => v.sku)

      // 2a) UN SEUL appel Odoo pour tout le batch (avec 1 retry sur erreur réseau)
      let stockMap = new Map<string, number>()
      try {
        stockMap = await odooService.getStocksBySkus(skus)
      } catch (e: any) {
        const msg = e?.message || String(e)
        const isNetwork =
          msg.includes("ECONNRESET") ||
          msg.includes("aborted") ||
          msg.includes("ETIMEDOUT") ||
          msg.includes("fetch failed")
        if (isNetwork) {
          console.warn(`⚠️  [STOCK SYNC] Erreur réseau Odoo, retry après 2s: ${msg}`)
          await sleep(2000)
          try {
            stockMap = await odooService.getStocksBySkus(skus)
          } catch (e2: any) {
            console.error(
              `❌ [STOCK SYNC] Batch ${i}-${i + slice.length} ignoré (Odoo KO): ${e2?.message || e2}`
            )
            errors += slice.length
            await yieldEventLoop()
            continue
          }
        } else {
          console.error(
            `❌ [STOCK SYNC] Batch ${i}-${i + slice.length} ignoré: ${msg}`
          )
          errors += slice.length
          await yieldEventLoop()
          continue
        }
      }

      // 2b) Récupérer en UN SEUL appel tous les inventory items du batch
      let inventoryItems: any[] = []
      try {
        inventoryItems = await inventoryService.listInventoryItems({ sku: skus })
      } catch (e: any) {
        console.error(`❌ [STOCK SYNC] listInventoryItems batch: ${e?.message || e}`)
        errors += slice.length
        await yieldEventLoop()
        continue
      }

      // Indexer par SKU (en gardant le plus récent en cas de doublon, sans
      // supprimer ici — le nettoyage de doublons doit se faire via un script
      // dédié, pas dans un cron de sync stock).
      const itemBySku = new Map<string, any>()
      for (const item of inventoryItems) {
        if (!item?.sku) continue
        const existing = itemBySku.get(item.sku)
        if (!existing) {
          itemBySku.set(item.sku, item)
        } else {
          const existingAt = new Date(existing.created_at || 0).getTime()
          const candidateAt = new Date(item.created_at || 0).getTime()
          if (candidateAt > existingAt) itemBySku.set(item.sku, item)
        }
      }

      // 2c) Récupérer les niveaux de stock pour tous les inventory items du batch en un appel
      const itemIds = Array.from(itemBySku.values()).map((it) => it.id)
      let levels: any[] = []
      if (itemIds.length) {
        try {
          levels = await inventoryService.listInventoryLevels({
            inventory_item_id: itemIds,
          })
        } catch (e: any) {
          console.error(`❌ [STOCK SYNC] listInventoryLevels batch: ${e?.message || e}`)
          errors += slice.length
          await yieldEventLoop()
          continue
        }
      }
      // Garder un seul level par inventory_item_id (le premier suffit, c'est
      // l'unique location dans la plupart des configs).
      const levelByItemId = new Map<string, any>()
      for (const lvl of levels) {
        if (!levelByItemId.has(lvl.inventory_item_id)) {
          levelByItemId.set(lvl.inventory_item_id, lvl)
        }
      }

      // 2d) Pour chaque variante du batch, comparer & mettre à jour si besoin
      for (const v of slice) {
        const odooStock = stockMap.get(v.sku)
        if (odooStock === undefined) {
          missingInOdoo++
          continue
        }

        const item = itemBySku.get(v.sku)
        if (!item) {
          missingInventory++
          continue
        }

        const level = levelByItemId.get(item.id)
        if (!level) {
          missingInventory++
          continue
        }

        const currentStocked = level.stocked_quantity || 0
        const reserved = level.reserved_quantity || 0
        // available = stocked - reserved, on veut available = odooStock
        const targetStocked = odooStock + reserved

        if (currentStocked === targetStocked) {
          unchanged++
          continue
        }

        try {
          await inventoryService.updateInventoryLevels({
            inventory_item_id: item.id,
            location_id: level.location_id,
            stocked_quantity: targetStocked,
          })
          updated++
        } catch (e: any) {
          errors++
          console.error(`❌ [STOCK SYNC] update ${v.sku}: ${e?.message || e}`)
        }
      }

      console.log(
        `   ▸ Batch ${i / SKU_BATCH + 1}/${Math.ceil(toSync.length / SKU_BATCH)}: ` +
          `${updated} maj / ${unchanged} idem / ${missingInOdoo} absent Odoo / ${missingInventory} sans inventory / ${errors} err`
      )

      // Yield à l'event loop pour laisser passer les healthchecks Railway
      // et toute autre requête HTTP en attente.
      await yieldEventLoop()
    }

    const durationSec = Math.round((Date.now() - lastRunStartedAt!) / 1000)
    console.log(
      `✅ [STOCK SYNC] Terminé en ${durationSec}s: ` +
        `${updated} mis à jour, ${unchanged} inchangés, ${missingInOdoo} absents Odoo, ` +
        `${missingInventory} sans inventory, ${errors} erreurs`
    )

    // Invalider le cache Next.js du storefront si des stocks ont changé
    if (updated > 0) {
      const storefrontUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.STOREFRONT_URL
      const revalidateSecret = process.env.REVALIDATE_SECRET
      if (storefrontUrl && revalidateSecret) {
        try {
          const controller = new AbortController()
          const timer = setTimeout(() => controller.abort(), 10_000)
          await fetch(`${storefrontUrl}/api/revalidate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ secret: revalidateSecret, tags: ["products"] }),
            signal: controller.signal,
          }).finally(() => clearTimeout(timer))
          console.log(`🔄 [STOCK SYNC] Cache storefront invalidé (${updated} produits mis à jour)`)
        } catch (revalidateErr: any) {
          console.warn(
            `⚠️  [STOCK SYNC] Impossible d'invalider le cache storefront:`,
            revalidateErr?.message || revalidateErr
          )
        }
      }
    }
  } catch (error: any) {
    console.error("❌ [STOCK SYNC] Erreur globale:", error?.message || error)
  } finally {
    isRunning = false
    lastRunStartedAt = null
  }
}

export const config = {
  name: "odoo-stock-sync-15min",
  schedule: "*/15 * * * *", // Toutes les 15 minutes
}
