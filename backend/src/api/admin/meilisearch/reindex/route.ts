import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { reindexAllProducts } from "../../../../utils/meilisearch-index"
import { getMeiliClient } from "../../../../utils/meilisearch"

/**
 * POST /admin/meilisearch/reindex
 * Body: { fresh?: boolean }  (fresh = vide l'index avant de réindexer)
 *
 * Réindexe tous les produits publiés dans Meilisearch.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    if (!getMeiliClient()) {
      return res.status(400).json({
        success: false,
        message:
          "Meilisearch non configuré (MEILISEARCH_HOST / MEILISEARCH_API_KEY manquants).",
      })
    }
    const fresh = (req.body as any)?.fresh === true
    const start = Date.now()
    const result = await reindexAllProducts(req.scope, { fresh })
    return res.json({
      success: true,
      indexed: result.indexed,
      duration_ms: Date.now() - start,
    })
  } catch (error: any) {
    console.error("[Meilisearch reindex] Erreur:", error?.message)
    return res.status(500).json({ success: false, message: error?.message })
  }
}

/** GET /admin/meilisearch/reindex — état de l'index */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const client = getMeiliClient()
    if (!client) {
      return res.json({ configured: false })
    }
    const index = client.index("products")
    const stats = await index.getStats().catch(() => null)
    return res.json({
      configured: true,
      numberOfDocuments: stats?.numberOfDocuments ?? 0,
      isIndexing: stats?.isIndexing ?? false,
    })
  } catch (error: any) {
    return res.json({ configured: true, error: error?.message })
  }
}
