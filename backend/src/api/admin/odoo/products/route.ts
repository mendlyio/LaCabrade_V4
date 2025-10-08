import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ODOO_MODULE } from "../../../../modules/odoo"
import OdooModuleService from "../../../../modules/odoo/service"
import { Modules } from "@medusajs/framework/utils"
import { odooSyncCache } from "../../../../lib/odoo-cache"

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

    // Si aucun produit Odoo, retourner immédiatement
    if (odooProducts.length === 0) {
      return res.json({
        products: [],
        total,
        count: 0,
        limit,
        offset,
        q,
      })
    }

    // Optimisation: Utiliser le cache pour les IDs synchronisés
    let syncedOdooIds = odooSyncCache.get()

    if (!syncedOdooIds) {
      // Recharger le cache: récupérer uniquement les IDs des produits Medusa avec external_id
      const medusaProducts = await productService.listProducts(
        {},
        { 
          select: ["id", "metadata"],
          take: 10000, // Limite raisonnable
        }
      )

      syncedOdooIds = new Set(
        medusaProducts
          .filter((p: any) => p.metadata?.external_id)
          .map((p: any) => p.metadata.external_id)
      )

      // Mettre à jour le cache
      odooSyncCache.set(syncedOdooIds)
      console.log(`📦 [CACHE] Cache rechargé avec ${syncedOdooIds.size} produits synchronisés`)
    }

    // Enrichir les produits Odoo avec le statut de synchronisation
    const enrichedProducts = odooProducts.map((product) => ({
      id: product.id.toString(),
      display_name: product.display_name,
      default_code: product.default_code,
      list_price: product.list_price,
      qty_available: product.qty_available || 0,
      synced: syncedOdooIds.has(product.id.toString()),
      currency: product.currency_id?.display_name || "EUR",
      image_url: (product.image_512 && typeof product.image_512 === 'string')
        ? `data:image/png;base64,${product.image_512}` 
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

