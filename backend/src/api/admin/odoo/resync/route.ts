import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { syncFromErpWorkflow } from "../../../../workflows/sync-from-erp"
import { odooSyncCache } from "../../../../lib/odoo-cache"
import { Modules } from "@medusajs/framework/utils"
import { ODOO_MODULE } from "../../../../modules/odoo"
import OdooModuleService from "../../../../modules/odoo/service"

/**
 * POST /admin/odoo/resync
 * Re-synchronise tous les produits déjà importés depuis Odoo par lots avec SSE
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

    // Configuration SSE pour progression en temps réel
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const sendEvent = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    const BATCH_SIZE = 10
    const batches: number[][] = []
    
    // Diviser en lots de 10
    for (let i = 0; i < odooProductIds.length; i += BATCH_SIZE) {
      batches.push(odooProductIds.slice(i, i + BATCH_SIZE))
    }

    let totalCreated = 0
    let totalUpdated = 0
    let totalErrors = 0
    let processedCount = 0

    // Envoyer état initial
    sendEvent({
      type: 'start',
      total: odooProductIds.length,
      batches: batches.length,
    })

    // Traiter chaque lot
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      const batchNum = i + 1

      sendEvent({
        type: 'batch_start',
        batchNum,
        totalBatches: batches.length,
        products: batch,
      })

      try {
        const result = await syncFromErpWorkflow(req.scope).run({
          input: {
            limit: 1000,
            offset: 0,
            dryRun: false,
            filterProductIds: batch,
          },
        })

        const created = result.result.toCreate || 0
        const updated = result.result.toUpdate || 0
        
        totalCreated += created
        totalUpdated += updated
        processedCount += batch.length

        sendEvent({
          type: 'batch_complete',
          batchNum,
          created,
          updated,
          processed: processedCount,
          total: odooProductIds.length,
          progress: Math.round((processedCount / odooProductIds.length) * 100),
        })
      } catch (error: any) {
        totalErrors += batch.length
        processedCount += batch.length

        sendEvent({
          type: 'batch_error',
          batchNum,
          error: error.message,
          processed: processedCount,
          total: odooProductIds.length,
        })
      }
    }

    // Invalider le cache si des produits ont été synchronisés
    if (totalCreated > 0 || totalUpdated > 0) {
      odooSyncCache.invalidate()
      console.log(`🔄 [CACHE] Cache invalidé après re-synchronisation`)
    }

    // Envoyer résultat final
    sendEvent({
      type: 'complete',
      total: odooProductIds.length,
      created: totalCreated,
      updated: totalUpdated,
      errors: totalErrors,
      success: totalErrors < odooProductIds.length,
    })

    res.end()
  } catch (error: any) {
    console.error("❌ [ADMIN] Erreur re-synchronisation:", error)
    
    // Si SSE pas encore initialisé, retourner JSON
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: "Erreur lors de la re-synchronisation",
        error: error.message,
      })
    }
    
    // Sinon envoyer erreur via SSE
    res.write(`data: ${JSON.stringify({
      type: 'error',
      message: error.message,
    })}\n\n`)
    res.end()
  }
}

