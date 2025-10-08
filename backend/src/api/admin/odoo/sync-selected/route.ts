import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { syncFromErpWorkflow } from "../../../../workflows/sync-from-erp"

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

    console.log(`🔄 [ADMIN] Synchronisation de ${productIds.length} produits sélectionnés`)

    // Exécuter le workflow de synchronisation avec filtre
    const result = await syncFromErpWorkflow(req.scope).run({
      input: {
        limit: 1000,
        offset: 0,
        dryRun: false,
        filterProductIds: productIds.map(id => parseInt(id)), // Passer les IDs à filtrer
      },
    })

    const { toCreate, toUpdate } = result.result

    console.log(`✅ [ADMIN] ${toCreate + toUpdate} produits synchronisés`)

    return res.json({
      success: true,
      synced: toCreate + toUpdate,
      created: toCreate,
      updated: toUpdate,
    })
  } catch (error: any) {
    console.error("❌ [ADMIN] Erreur synchronisation sélective:", error)
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la synchronisation",
      error: error.message,
    })
  }
}

