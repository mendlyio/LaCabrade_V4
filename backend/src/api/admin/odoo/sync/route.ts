import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { syncFromErpWorkflow } from "../../../../workflows/sync-from-erp"
import { OdooProduct } from "../../../../modules/odoo/service"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const limit = 10
  let offset = 0
  let total = 0
  let odooProducts: OdooProduct[] = []

  try {
    console.log("🔄 [API] Début de la synchronisation manuelle Odoo...")

    do {
      odooProducts = (
        await syncFromErpWorkflow(req.scope).run({
          input: {
            limit,
            offset,
          },
        })
      ).result.odooProducts

      offset += limit
      total += odooProducts.length

      console.log(`  ✓ [API] Synchronisé ${odooProducts.length} produits (Total: ${total})`)
    } while (odooProducts.length > 0)

    console.log(`✅ [API] Synchronisation terminée : ${total} produits synchronisés`)

    return res.json({
      success: true,
      message: `Synchronisation réussie : ${total} produits synchronisés`,
      total,
    })
  } catch (error) {
    console.error("❌ [API] Erreur lors de la synchronisation:", error)
    
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la synchronisation",
      error: error.message,
    })
  }
}

