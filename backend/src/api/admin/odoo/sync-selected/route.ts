import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { syncFromErpWorkflow } from "../../../../workflows/sync-from-erp"
import { odooSyncCache } from "../../../../lib/odoo-cache"

/**
 * POST /admin/odoo/sync-selected
 * Synchronise uniquement les produits sélectionnés depuis Odoo
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { productIds } = req.body as { productIds: string[] }

    if (!productIds || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Aucun produit sélectionné",
      })
    }

    console.log(`🔄 [ADMIN] Synchronisation de ${productIds.length} produits sélectionnés:`, productIds)

    // Exécuter le workflow de synchronisation avec filtre
    const result = await syncFromErpWorkflow(req.scope).run({
      input: {
        limit: 1000,
        offset: 0,
        dryRun: false,
        filterProductIds: productIds.map(id => parseInt(id)), // Passer les IDs à filtrer
      },
    })

    console.log(`✅ [ADMIN] Workflow result:`, JSON.stringify(result.result, null, 2))

    const { toCreate, toUpdate } = result.result

    console.log(`✅ [ADMIN] ${toCreate + toUpdate} produits synchronisés (${toCreate} créés, ${toUpdate} mis à jour)`)

    // Invalider le cache après une synchronisation réussie
    if (toCreate > 0 || toUpdate > 0) {
      odooSyncCache.invalidate()
      console.log(`🔄 [CACHE] Cache invalidé après synchronisation`)
    }

    return res.json({
      success: true,
      synced: toCreate + toUpdate,
      created: toCreate,
      updated: toUpdate,
    })
  } catch (error: any) {
    console.error("❌ [ADMIN] Erreur synchronisation sélective:", error)
    console.error("❌ [ADMIN] Stack trace:", error.stack)
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la synchronisation",
      error: error.message,
      stack: error.stack,
    })
  }
}

