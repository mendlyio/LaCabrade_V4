import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ODOO_MODULE } from "../../../../modules/odoo"
import OdooModuleService from "../../../../modules/odoo/service"
import { Modules } from "@medusajs/framework/utils"

/**
 * GET /admin/odoo/products
 * Liste tous les produits disponibles dans Odoo avec leur statut de synchronisation
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const odooService: OdooModuleService = req.scope.resolve(ODOO_MODULE)
    const productService = req.scope.resolve(Modules.PRODUCT)

    // Récupérer tous les produits Odoo (limite à 1000 pour l'UI)
    const odooProducts = await odooService.fetchProducts({ limit: 1000, offset: 0 })

    // Récupérer les produits déjà synchronisés dans Medusa
    const medusaProducts = await productService.listProducts({})

    // Créer un map des IDs Odoo déjà synchronisés
    const syncedOdooIds = new Set(
      medusaProducts
        .filter((p: any) => p.metadata?.external_id)
        .map((p: any) => p.metadata.external_id)
    )

    // Enrichir les produits Odoo avec le statut de synchronisation
    const enrichedProducts = odooProducts.map((product) => ({
      id: product.id.toString(),
      display_name: product.display_name,
      default_code: product.default_code,
      list_price: product.list_price,
      qty_available: product.qty_available || 0,
      synced: syncedOdooIds.has(product.id.toString()),
      currency: product.currency_id?.display_name || "EUR",
    }))

    return res.json({
      products: enrichedProducts,
      total: enrichedProducts.length,
    })
  } catch (error: any) {
    console.error("Erreur lors du chargement des produits Odoo:", error)
    return res.status(500).json({
      error: "Erreur lors du chargement des produits",
      message: error.message,
    })
  }
}

