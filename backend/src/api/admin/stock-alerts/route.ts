import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import StockAlertService from "../../../services/stock-alert"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const stockAlertService: StockAlertService = req.scope.resolve("stockAlertService")

    const { q, notified, offset, limit } = req.query as {
      q?: string
      notified?: string
      offset?: string
      limit?: string
    }

    const take = Math.min(parseInt(limit || "100", 10), 200)
    const skip = parseInt(offset || "0", 10)

    const manager = (stockAlertService as any).manager_

    let whereClause = "WHERE deleted_at IS NULL"
    const params: any[] = []
    let paramIdx = 1

    if (notified === "true") {
      whereClause += ` AND notified = true`
    } else if (notified === "false") {
      whereClause += ` AND notified = false`
    }

    if (q) {
      whereClause += ` AND customer_email ILIKE $${paramIdx}`
      params.push(`%${q}%`)
      paramIdx++
    }

    const countResult = await manager.execute(
      `SELECT COUNT(*) as count FROM stock_alerts ${whereClause}`,
      params
    )
    const total = parseInt(countResult?.[0]?.count || "0", 10)

    const limitParam = take
    const offsetParam = skip
    const alerts = await manager.execute(
      `SELECT * FROM stock_alerts ${whereClause} ORDER BY created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limitParam, offsetParam]
    )

    return res.json({
      alerts: alerts || [],
      count: total,
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
    const stockAlertService: StockAlertService = req.scope.resolve("stockAlertService")
    const { id } = req.query as { id?: string }

    if (!id) {
      return res.status(400).json({ message: "ID requis" })
    }

    const manager = (stockAlertService as any).manager_
    await manager.execute(
      `UPDATE stock_alerts SET deleted_at = NOW() WHERE id = $1`,
      [id]
    )

    return res.json({ success: true })
  } catch (err: any) {
    console.error("[StockAlerts Admin] Erreur suppression:", err.message)
    return res.status(500).json({ message: err.message })
  }
}
