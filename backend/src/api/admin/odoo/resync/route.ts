import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { syncFromErpWorkflow } from "../../../../workflows/sync-from-erp"
import { odooSyncCache } from "../../../../lib/odoo-cache"
import { Modules } from "@medusajs/framework/utils"
import { ODOO_MODULE } from "../../../../modules/odoo"
import OdooModuleService from "../../../../modules/odoo/service"

/**
 * POST /admin/odoo/resync
 * Re-synchronise tous les produits déjà importés depuis Odoo
 * Utile pour mettre à jour les prix, descriptions, etc.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    // Récupérer le service Odoo
    let odooService: OdooModuleService
    try {
      odooService = req.scope.resolve(ODOO_MODULE)
    } catch (error) {
      return res.status(503).json({
        success: false,
        message: "Le module Odoo n'est pas disponible",
      })
    }

    const productService = req.scope.resolve(Modules.PRODUCT)

    console.log(`🔄 [ADMIN] Re-synchronisation de tous les produits Odoo déjà importés`)

    // Récupérer tous les produits Medusa avec un external_id
    const medusaProducts = await productService.listProducts(
      {},
      { 
        select: ["id", "metadata"],
        take: 10000,
      }
    )

    const odooProductIds = medusaProducts
      .filter((p: any) => p.metadata?.external_id)
      .map((p: any) => parseInt(p.metadata.external_id))
      .filter((id: number) => !isNaN(id))

    if (odooProductIds.length === 0) {
      return res.json({
        success: true,
        message: "Aucun produit Odoo à re-synchroniser",
        synced: 0,
        created: 0,
        updated: 0,
      })
    }

    console.log(`📦 [ADMIN] ${odooProductIds.length} produits Odoo trouvés dans Medusa`)

    // Exécuter le workflow de synchronisation pour ces produits
    const result = await syncFromErpWorkflow(req.scope).run({
      input: {
        limit: 1000,
        offset: 0,
        dryRun: false,
        filterProductIds: odooProductIds,
      },
    })

    const { toCreate, toUpdate } = result.result

    console.log(`✅ [ADMIN] Re-synchronisation terminée: ${toCreate} créés, ${toUpdate} mis à jour`)

    // Invalider le cache
    if (toCreate > 0 || toUpdate > 0) {
      odooSyncCache.invalidate()
      console.log(`🔄 [CACHE] Cache invalidé après re-synchronisation`)
    }

    return res.json({
      success: true,
      message: `${toUpdate} produit(s) re-synchronisé(s) avec Odoo`,
      synced: toCreate + toUpdate,
      created: toCreate,
      updated: toUpdate,
    })
  } catch (error: any) {
    console.error("❌ [ADMIN] Erreur re-synchronisation:", error)
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la re-synchronisation",
      error: error.message,
    })
  }
}

