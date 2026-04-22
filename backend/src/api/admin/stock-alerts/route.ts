import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STOCK_ALERT_MODULE } from "../../../modules/stock-alert"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const stockAlertService = req.scope.resolve(STOCK_ALERT_MODULE) as any

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

    return res.json({
      alerts: results || [],
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
