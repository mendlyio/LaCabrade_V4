import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * GET /admin/stats/overview
 *
 * Statistiques de vente agrégées pour le tableau de bord backoffice :
 * CA / commandes / panier moyen par période (7/30/90 j) avec comparaison,
 * CA quotidien (14 j), top produits et top clients.
 *
 * CA calculé depuis les articles (unit_price TTC en euros ; bons cadeau en
 * centimes → /100). On filtre sur la version courante de la commande
 * (order_item.version = order.version) pour ne pas doubler les commandes éditées.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    // Revenu par commande (toutes commandes non supprimées / non brouillon)
    const ordersRes = await knex.raw(`
      SELECT o.id, o.created_at, o.email,
        COALESCE(SUM(
          CASE WHEN li.is_giftcard THEN li.unit_price / 100.0 ELSE li.unit_price END
          * oi.quantity
        ), 0) AS revenue
      FROM "order" o
      JOIN order_item oi ON oi.order_id = o.id AND oi.version = o.version
      JOIN order_line_item li ON li.id = oi.item_id
      WHERE o.deleted_at IS NULL AND o.is_draft_order = false
      GROUP BY o.id, o.created_at, o.email
    `)
    const orders: Array<{ id: string; created_at: string; email: string; revenue: number }> =
      (ordersRes.rows || []).map((r: any) => ({
        id: r.id,
        created_at: r.created_at,
        email: r.email,
        revenue: Number(r.revenue) || 0,
      }))

    const now = Date.now()
    const DAY = 86400000

    // KPIs par période avec comparaison à la période précédente
    const periodStats = (days: number) => {
      const start = now - days * DAY
      const prevStart = now - 2 * days * DAY
      let orders_n = 0, revenue = 0, orders_prev = 0, revenue_prev = 0
      for (const o of orders) {
        const t = new Date(o.created_at).getTime()
        if (t >= start) { orders_n++; revenue += o.revenue }
        else if (t >= prevStart) { orders_prev++; revenue_prev += o.revenue }
      }
      return {
        orders: orders_n,
        revenue: Math.round(revenue * 100) / 100,
        aov: orders_n ? Math.round((revenue / orders_n) * 100) / 100 : 0,
        orders_prev,
        revenue_prev: Math.round(revenue_prev * 100) / 100,
      }
    }

    const periods = {
      "7d": periodStats(7),
      "30d": periodStats(30),
      "90d": periodStats(90),
    }

    // CA quotidien sur 14 jours
    const daily: Array<{ date: string; revenue: number; orders: number }> = []
    for (let i = 13; i >= 0; i--) {
      const dayStart = new Date(now - i * DAY)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = dayStart.getTime() + DAY
      let rev = 0, n = 0
      for (const o of orders) {
        const t = new Date(o.created_at).getTime()
        if (t >= dayStart.getTime() && t < dayEnd) { rev += o.revenue; n++ }
      }
      daily.push({
        date: dayStart.toISOString().slice(0, 10),
        revenue: Math.round(rev * 100) / 100,
        orders: n,
      })
    }

    // Top clients (90 j) par dépense
    const custMap = new Map<string, { orders: number; spent: number }>()
    const start90 = now - 90 * DAY
    for (const o of orders) {
      if (new Date(o.created_at).getTime() < start90) continue
      const e = (o.email || "—").toLowerCase()
      const cur = custMap.get(e) || { orders: 0, spent: 0 }
      cur.orders++; cur.spent += o.revenue
      custMap.set(e, cur)
    }
    const top_customers = [...custMap.entries()]
      .map(([email, v]) => ({ email, orders: v.orders, spent: Math.round(v.spent * 100) / 100 }))
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5)

    // Top produits (90 j), hors bons cadeau
    const prodRes = await knex.raw(`
      SELECT li.product_title AS title,
             SUM(oi.quantity) AS qty,
             SUM(li.unit_price * oi.quantity) AS revenue
      FROM "order" o
      JOIN order_item oi ON oi.order_id = o.id AND oi.version = o.version
      JOIN order_line_item li ON li.id = oi.item_id
      WHERE o.deleted_at IS NULL AND o.is_draft_order = false
        AND li.is_giftcard = false
        AND o.created_at >= now() - interval '90 days'
      GROUP BY li.product_title
      ORDER BY qty DESC
      LIMIT 10
    `)
    const top_products = (prodRes.rows || []).map((r: any) => ({
      title: r.title || "Produit",
      qty: Number(r.qty) || 0,
      revenue: Math.round((Number(r.revenue) || 0) * 100) / 100,
    }))

    const all_revenue = Math.round(orders.reduce((s, o) => s + o.revenue, 0) * 100) / 100

    return res.json({
      periods,
      daily,
      top_customers,
      top_products,
      totals: { all_orders: orders.length, all_revenue },
      generated_at: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[Stats Overview] Error:", error.message)
    return res.status(500).json({ message: error.message })
  }
}
