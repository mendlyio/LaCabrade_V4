import { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { ODOO_MODULE } from "../modules/odoo"
import OdooModuleService from "../modules/odoo/service"
import { syncFromErpWorkflow } from "../workflows/sync-from-erp"
import { odooSyncCache } from "../lib/odoo-cache"

/**
 * Job planifié : Synchronisation automatique des produits modifiés dans Odoo
 * S'exécute toutes les 2 heures
 * Compare write_date Odoo vs updated_at Medusa
 */
export default async function odooSyncProductsJob(container: MedusaContainer) {
  console.log(`🔄 [JOB] Démarrage synchronisation produits Odoo modifiés`)

  try {
    // Vérifier si Odoo est configuré
    let odooService: OdooModuleService
    try {
      odooService = container.resolve(ODOO_MODULE)
    } catch (error) {
      console.log(`⏭️  [JOB] Odoo non configuré, job ignoré`)
      return
    }

    const productService = container.resolve(Modules.PRODUCT)

    // Récupérer tous les produits Medusa avec external_id et leur date de mise à jour
    const medusaProducts = await productService.listProducts(
      {},
      { 
        select: ["id", "metadata", "updated_at"],
        take: 10000,
      }
    )

    const productsMap = new Map<string, { id: string; updated_at: Date }>()
    medusaProducts.forEach((p: any) => {
      if (p.metadata?.external_id) {
        productsMap.set(p.metadata.external_id, {
          id: p.id,
          updated_at: new Date(p.updated_at),
        })
      }
    })

    if (productsMap.size === 0) {
      console.log(`ℹ️  [JOB] Aucun produit Odoo trouvé dans Medusa`)
      return
    }

    console.log(`📦 [JOB] ${productsMap.size} produits Odoo dans Medusa`)

    // Récupérer tous les produits Odoo avec leur date de modification
    const odooProductIds = Array.from(productsMap.keys()).map(id => parseInt(id))
    
    // Appel Odoo pour récupérer uniquement les dates de modification
    const odooProductsInfo = await odooService.fetchProductsWithDates(odooProductIds)

    // Filtrer les produits modifiés dans Odoo depuis leur dernière sync
    const modifiedProductIds: number[] = []
    
    for (const odooProduct of odooProductsInfo) {
      const medusaProduct = productsMap.get(odooProduct.id.toString())
      if (!medusaProduct) continue

      // Comparer les dates (Odoo write_date vs Medusa updated_at)
      const odooDate = new Date(odooProduct.write_date)
      const medusaDate = medusaProduct.updated_at

      // Si Odoo plus récent, ajouter à la liste
      if (odooDate > medusaDate) {
        console.log(`  📝 Produit ${odooProduct.id} modifié dans Odoo: ${odooDate.toISOString()} > ${medusaDate.toISOString()}`)
        modifiedProductIds.push(odooProduct.id)
      }
    }

    if (modifiedProductIds.length === 0) {
      console.log(`✅ [JOB] Aucun produit modifié dans Odoo, rien à synchroniser`)
      return
    }

    console.log(`🔄 [JOB] ${modifiedProductIds.length} produit(s) à synchroniser`)

    // Synchroniser les produits modifiés par lots de 10
    const BATCH_SIZE = 10
    let totalUpdated = 0
    let totalErrors = 0

    for (let i = 0; i < modifiedProductIds.length; i += BATCH_SIZE) {
      const batch = modifiedProductIds.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(modifiedProductIds.length / BATCH_SIZE)

      console.log(`📦 [JOB] Lot ${batchNum}/${totalBatches}: ${batch.length} produits`)

      try {
        const result = await syncFromErpWorkflow(container).run({
          input: {
            limit: 1000,
            offset: 0,
            dryRun: false,
            filterProductIds: batch,
          },
        })

        totalUpdated += result.result.toUpdate || 0
        console.log(`  ✅ ${result.result.toUpdate} produit(s) mis à jour`)
      } catch (error: any) {
        totalErrors += batch.length
        console.error(`  ❌ Erreur lot ${batchNum}:`, error.message)
      }
    }

    // Invalider le cache si des produits ont été synchronisés
    if (totalUpdated > 0) {
      odooSyncCache.invalidate()
      console.log(`🔄 [CACHE] Cache invalidé`)
    }

    console.log(`✅ [JOB] Synchronisation terminée: ${totalUpdated} mis à jour, ${totalErrors} erreurs`)
  } catch (error: any) {
    console.error(`❌ [JOB] Erreur synchronisation Odoo:`, error.message)
    console.error(error.stack)
  }
}

// Configuration du job : toutes les 2 heures
export const config = {
  name: "odoo-sync-products",
  schedule: "0 */2 * * *", // Toutes les 2 heures à la minute 0
  // Alternative: "0 0,2,4,6,8,10,12,14,16,18,20,22 * * *" pour être plus explicite
}

