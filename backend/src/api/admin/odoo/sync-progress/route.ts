import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { syncFromErpWorkflow } from "../../../../workflows/sync-from-erp"
import { odooSyncCache } from "../../../../lib/odoo-cache"

/**
 * POST /admin/odoo/sync-progress
 * Import par lots avec Server-Sent Events pour la progression en temps réel
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { productIds } = req.body as { productIds: string[] }

  if (!productIds || productIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Aucun produit sélectionné",
    })
  }

  // Configuration SSE
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const sendEvent = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  try {
    const BATCH_SIZE = 10
    const batches: number[][] = []
    
    for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
      batches.push(productIds.slice(i, i + BATCH_SIZE).map(id => parseInt(id)))
    }

    let totalCreated = 0
    let totalUpdated = 0
    let totalErrors = 0
    let processedCount = 0

    // Envoyer état initial
    sendEvent({
      type: 'start',
      total: productIds.length,
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
          total: productIds.length,
          progress: Math.round((processedCount / productIds.length) * 100),
        })
      } catch (error: any) {
        totalErrors += batch.length
        processedCount += batch.length

        sendEvent({
          type: 'batch_error',
          batchNum,
          error: error.message,
          processed: processedCount,
          total: productIds.length,
        })
      }
    }

    // Invalider le cache si des produits ont été synchronisés
    if (totalCreated > 0 || totalUpdated > 0) {
      odooSyncCache.invalidate()
      console.log(`🔄 [CACHE] Cache invalidé après import par lots`)
    }

    // Envoyer résultat final
    sendEvent({
      type: 'complete',
      total: productIds.length,
      created: totalCreated,
      updated: totalUpdated,
      errors: totalErrors,
      success: totalErrors < productIds.length,
    })

    res.end()
  } catch (error: any) {
    sendEvent({
      type: 'error',
      message: error.message,
    })
    res.end()
  }
}

