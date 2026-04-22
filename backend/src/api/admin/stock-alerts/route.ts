import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { STOCK_ALERT_MODULE } from "../../../modules/stock-alert"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const stockAlertService = req.scope.resolve(STOCK_ALERT_MODULE) as any
    const productModuleService = req.scope.resolve(Modules.PRODUCT) as any

    const { q, notified, offset, limit } = req.query as {
      q?: string
      notified?: string
      offset?: string
      limit?: string
    }

    const take = Math.min(parseInt(limit || "100", 10), 200)
    const skip = parseInt(offset || "0", 10)

    const filters: Record<string, any> = {}
    if (notified === "true") filters.notified = true
    if (notified === "false") filters.notified = false

    const [alerts, count] = await stockAlertService.listAndCountStockAlerts(
      filters,
      { order: { created_at: "DESC" }, skip, take }
    )

    let results = alerts
    if (q) {
      const search = q.toLowerCase()
      results = alerts.filter((a: any) => a.customer_email?.toLowerCase().includes(search))
    }

    // Enrichir avec les noms produit et variante
    const productIds = [...new Set(results.map((a: any) => a.product_id).filter(Boolean))]
    const variantIds = [...new Set(results.map((a: any) => a.variant_id).filter(Boolean))]

    let productMap: Record<string, string> = {}
    let variantMap: Record<string, string> = {}

    if (productIds.length > 0) {
      try {
        const products = await productModuleService.listProducts(
          { id: productIds },
          { select: ["id", "title"] }
        )
        productMap = Object.fromEntries(products.map((p: any) => [p.id, p.title]))
      } catch (e) {
        // Fallback silencieux — on affiche les IDs
      }
    }

    if (variantIds.length > 0) {
      try {
        const variants = await productModuleService.listProductVariants(
          { id: variantIds },
          { select: ["id", "title"] }
        )
        variantMap = Object.fromEntries(variants.map((v: any) => [v.id, v.title]))
      } catch (e) {
        // Fallback silencieux
      }
    }

    const enriched = results.map((alert: any) => ({
      ...alert,
      product_name: productMap[alert.product_id] || alert.product_id,
      variant_name: alert.variant_id ? (variantMap[alert.variant_id] || alert.variant_id) : null,
    }))

    return res.json({
      alerts: enriched,
      count: q ? results.length : count,
      offset: skip,
      limit: take,
    })
  } catch (err: any) {
    console.error("[StockAlerts Admin] Erreur liste:", err.message)
    return res.status(500).json({ message: err.message })
  }
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const stockAlertService = req.scope.resolve(STOCK_ALERT_MODULE) as any
    const { id } = req.query as { id?: string }

    if (!id) {
      return res.status(400).json({ message: "ID requis" })
    }

    await stockAlertService.deleteStockAlerts([id])

    return res.json({ success: true })
  } catch (err: any) {
    console.error("[StockAlerts Admin] Erreur suppression:", err.message)
    return res.status(500).json({ message: err.message })
  }
}
