import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import odooSyncProductsJob from "../../../../jobs/odoo-sync-products"

/**
 * POST /admin/odoo/sync-modified
 * Déclenche manuellement la synchronisation des produits modifiés dans Odoo
 * (Normalement exécuté automatiquement toutes les 2 heures)
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const force = (req.query.force as string) === "true"
    console.log(
      `🔄 [ADMIN] Synchronisation manuelle des produits ${
        force ? "(FORCE / overwrite)" : "modifiés"
      } dans Odoo`
    )

    // Exécuter le job de synchronisation
    await odooSyncProductsJob(req.scope, { force })

    return res.json({
      success: true,
      message: force
        ? "Synchronisation FORCÉE terminée (overwrite)"
        : "Synchronisation des produits modifiés terminée",
    })
  } catch (error: any) {
    console.error("❌ [ADMIN] Erreur synchronisation produits modifiés:", error)
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la synchronisation",
      error: error.message,
    })
  }
}

