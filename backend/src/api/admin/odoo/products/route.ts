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
    // Vérifier si le module Odoo est disponible
    let odooService: OdooModuleService
    try {
      odooService = req.scope.resolve(ODOO_MODULE)
    } catch (error) {
      return res.status(503).json({
        error: "Odoo non configuré",
        message: "Le module Odoo n'est pas disponible. Veuillez configurer les variables d'environnement.",
      })
    }
    const productService = req.scope.resolve(Modules.PRODUCT)

    // Lecture pagination + recherche
    const limit = Math.min(parseInt((req.query.limit as string) || "25"), 100)
    const offset = parseInt((req.query.offset as string) || "0")
    const q = (req.query.q as string) || ""

    // Récupérer page de produits Odoo avec total + recherche
    const { products: odooProducts, total } = await odooService.fetchProductsPaged({ limit, offset, q })

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
      image_url: product.image_128 && product.image_128 !== false 
        ? `data:image/png;base64,${product.image_128}` 
        : null,
    }))

    return res.json({
      products: enrichedProducts,
      total,
      count: enrichedProducts.length,
      limit,
      offset,
      q,
    })
  } catch (error: any) {
    console.error("Erreur lors du chargement des produits Odoo:", error)
    return res.status(500).json({
      error: "Erreur lors du chargement des produits",
      message: error.message,
    })
  }
}

