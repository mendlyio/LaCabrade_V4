import { MedusaContainer } from "@medusajs/framework/types"
import { syncFromErpWorkflow } from "../workflows/sync-from-erp"
import { OdooProduct } from "../modules/odoo/service"

/**
 * Scheduled job pour synchroniser automatiquement les produits depuis Odoo
 * S'exécute selon le cron configuré (par défaut: tous les jours à 2h du matin)
 */
export default async function odooSyncProductsJob(container: MedusaContainer) {
  const limit = 100
  let offset = 0
  let total = 0
  let totalToCreate = 0
  let totalToUpdate = 0

  console.log("🔄 [ODOO CRON] Début de la synchronisation automatique des produits...")

  try {
    let hasMore = true
    
    while (hasMore) {
      const result = await syncFromErpWorkflow(container).run({
        input: {
          limit,
          offset,
          dryRun: false, // Mode live
        },
      })

      const { productsProcessed, toCreate, toUpdate } = result.result

      total += productsProcessed
      totalToCreate += toCreate
      totalToUpdate += toUpdate

      if (productsProcessed < limit) {
        hasMore = false
      } else {
        offset += limit
      }

      console.log(`  ✓ [ODOO CRON] Traité ${productsProcessed} produits (offset: ${offset})`)
    }

    console.log(`✅ [ODOO CRON] Synchronisation terminée : ${total} produits (${totalToCreate} créés, ${totalToUpdate} mis à jour)`)
  } catch (error: any) {
    console.error("❌ [ODOO CRON] Erreur lors de la synchronisation:", error.message)
    throw error
  }
}

export const config = {
  name: "odoo-sync-products",
  // Cron expression: tous les jours à 2h du matin
  // Format: minute hour day month weekday
  schedule: "0 2 * * *",
  
  // Autres options possibles:
  // "0 */6 * * *"  - Toutes les 6 heures
  // "0 0 * * *"    - Tous les jours à minuit
  // "0 12 * * *"   - Tous les jours à midi
  // "0 0 * * 0"    - Tous les dimanches à minuit
}

