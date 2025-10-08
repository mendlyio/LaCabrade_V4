import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { syncFromErpWorkflow } from "../../../../workflows/sync-from-erp"

/**
 * POST /admin/odoo/sync-batch
 * Import par lots avec progression en temps réel
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

    console.log(`🔄 [BATCH] Import par lots de ${productIds.length} produits`)

    const BATCH_SIZE = 10
    const batches: number[][] = []
    
    // Diviser en lots de 10
    for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
      batches.push(productIds.slice(i, i + BATCH_SIZE).map(id => parseInt(id)))
    }

    let totalCreated = 0
    let totalUpdated = 0
    let totalErrors = 0
    const errors: Array<{ productId: string; error: string }> = []

    // Traiter chaque lot séquentiellement
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      const batchNum = i + 1
      
      console.log(`📦 [BATCH ${batchNum}/${batches.length}] Traitement de ${batch.length} produits:`, batch)

      try {
        const result = await syncFromErpWorkflow(req.scope).run({
          input: {
            limit: 1000,
            offset: 0,
            dryRun: false,
            filterProductIds: batch,
          },
        })

        totalCreated += result.result.toCreate || 0
        totalUpdated += result.result.toUpdate || 0
        
        console.log(`✅ [BATCH ${batchNum}/${batches.length}] ${result.result.toCreate} créés, ${result.result.toUpdate} mis à jour`)
      } catch (error: any) {
        console.error(`❌ [BATCH ${batchNum}/${batches.length}] Erreur:`, error.message)
        totalErrors += batch.length
        
        // Enregistrer les erreurs par produit
        batch.forEach(id => {
          errors.push({
            productId: id.toString(),
            error: error.message,
          })
        })
      }
    }

    console.log(`✅ [BATCH] Terminé: ${totalCreated} créés, ${totalUpdated} mis à jour, ${totalErrors} erreurs`)

    return res.json({
      success: true,
      total: productIds.length,
      created: totalCreated,
      updated: totalUpdated,
      errors: totalErrors,
      errorDetails: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error("❌ [BATCH] Erreur globale:", error)
    return res.status(500).json({
      success: false,
      message: "Erreur lors de l'import par lots",
      error: error.message,
    })
  }
}

