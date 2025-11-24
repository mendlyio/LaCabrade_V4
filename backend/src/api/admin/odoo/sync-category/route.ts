import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { syncFromErpWorkflow } from "../../../../workflows/sync-from-erp"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { categoryId } = req.body as { categoryId: string }

  if (!categoryId) {
    return res.status(400).json({ error: "categoryId is required" })
  }

  const limit = 20
  let offset = 0
  let totalSynced = 0
  let batchSize = 0

  // Set up SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  })

  const sendEvent = (type: string, data: any) => {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`)
  }

  try {
    console.log(`🔄 [API] Sync Category ${categoryId}...`)
    sendEvent('start', { message: "Démarrage de l'import de la catégorie..." })
    
    do {
        sendEvent('batch_start', { offset, limit })
        
        const { result } = await syncFromErpWorkflow(req.scope).run({
            input: {
                filterCategoryId: parseInt(categoryId),
                limit,
                offset
            }
        })
        
        batchSize = result.odooProducts.length
        totalSynced += result.createResult.created + result.updateResult.updated
        
        sendEvent('batch_complete', { 
            processed: batchSize,
            created: result.createResult.created,
            updated: result.updateResult.updated
        })

        offset += limit
        
        console.log(`  ✓ [API] Category sync: ${batchSize} products processed`)
        
    } while (batchSize === limit) 

    sendEvent('complete', { 
        total: totalSynced,
        created: totalSynced, // Approx logic for now
        updated: 0,
        errors: 0
    })
    res.end()
  } catch (error: any) {
    console.error("Error syncing category:", error)
    sendEvent('error', { message: error.message })
    res.end()
  }
}

