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

    // Répartition par pays (adresse de livraison)
    const countryRes = await knex.raw(`
      SELECT oa.country_code AS country, COUNT(*) AS n
      FROM "order" o
      JOIN order_address oa ON oa.id = o.shipping_address_id
      WHERE o.deleted_at IS NULL AND o.is_draft_order = false
      GROUP BY oa.country_code
      ORDER BY n DESC
    `)
    const country_split = (countryRes.rows || []).map((r: any) => ({
      country: (r.country || "?").toUpperCase(),
      orders: Number(r.n) || 0,
    }))

    // CA par marque (90 j) — marque depuis product.metadata, fallback collection
    const brandRes = await knex.raw(`
      SELECT COALESCE(p.metadata->>'brand', li.product_collection, 'Autre') AS brand,
             SUM(li.unit_price * oi.quantity) AS revenue,
             SUM(oi.quantity) AS qty
      FROM "order" o
      JOIN order_item oi ON oi.order_id = o.id AND oi.version = o.version
      JOIN order_line_item li ON li.id = oi.item_id
      LEFT JOIN product p ON p.id = li.product_id
      WHERE o.deleted_at IS NULL AND o.is_draft_order = false
        AND li.is_giftcard = false
        AND o.created_at >= now() - interval '90 days'
      GROUP BY 1
      ORDER BY revenue DESC
      LIMIT 8
    `)
    const top_brands = (brandRes.rows || []).map((r: any) => ({
      brand: r.brand || "Autre",
      revenue: Math.round((Number(r.revenue) || 0) * 100) / 100,
      qty: Number(r.qty) || 0,
    }))

    // Taux de réachat (clients ayant commandé > 1 fois, all-time)
    const ordersByEmail = new Map<string, number>()
    for (const o of orders) {
      const e = (o.email || "").toLowerCase()
      if (!e) continue
      ordersByEmail.set(e, (ordersByEmail.get(e) || 0) + 1)
    }
    const total_customers = ordersByEmail.size
    const repeat_customers = [...ordersByEmail.values()].filter((n) => n > 1).length
    const repeat_rate = total_customers ? Math.round((repeat_customers / total_customers) * 100) : 0

    // Comparatif mensuel (6 derniers mois)
    const monthly: Array<{ month: string; revenue: number; orders: number }> = []
    const firstOfMonth = new Date()
    firstOfMonth.setDate(1)
    firstOfMonth.setHours(0, 0, 0, 0)
    for (let i = 5; i >= 0; i--) {
      const start = new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth() - i, 1)
      const end = new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth() - i + 1, 1)
      let rev = 0, n = 0
      for (const o of orders) {
        const t = new Date(o.created_at).getTime()
        if (t >= start.getTime() && t < end.getTime()) { rev += o.revenue; n++ }
      }
      monthly.push({
        month: start.toISOString().slice(0, 7),
        revenue: Math.round(rev * 100) / 100,
        orders: n,
      })
    }

    // Paniers abandonnés & relance (aligné avec le job send-cart-abandonment-emails)
    // Abandonné = panier avec email + articles, non complété, inactif > 1h30.
    // Relancé = metadata.abandon_email_sent_at présent.
    // Récupéré = relancé ET complété (le client est revenu commander).
    const cartRes = await knex.raw(`
      SELECT c.id,
        (c.completed_at IS NOT NULL) AS completed,
        c.updated_at,
        ((c.metadata->>'abandon_email_sent_at') IS NOT NULL) AS relaunched,
        COALESCE(SUM(li.unit_price * li.quantity), 0) AS value
      FROM cart c
      JOIN cart_line_item li ON li.cart_id = c.id AND li.deleted_at IS NULL
      WHERE c.email IS NOT NULL AND c.deleted_at IS NULL
        AND c.email NOT ILIKE '%@mendly.io%'
      GROUP BY c.id
      HAVING COUNT(li.id) > 0
    `)
    const ABANDON_DELAY = 90 * 60 * 1000 // 1h30
    const ABANDON_MAXAGE = 48 * 3600 * 1000 // 48h
    let ab_count = 0, ab_value = 0, relaunched_n = 0, recovered_n = 0, recovered_value = 0, pending = 0
    for (const r of cartRes.rows || []) {
      const completed = r.completed === true || r.completed === "t"
      const wasRelaunched = r.relaunched === true || r.relaunched === "t"
      const val = Number(r.value) || 0
      const age = now - new Date(r.updated_at).getTime()
      if (wasRelaunched) relaunched_n++
      if (wasRelaunched && completed) { recovered_n++; recovered_value += val }
      if (!completed && age > ABANDON_DELAY) {
        ab_count++
        ab_value += val
        if (age < ABANDON_MAXAGE && !wasRelaunched) pending++
      }
    }
    const carts = {
      abandoned: ab_count,
      abandoned_value: Math.round(ab_value * 100) / 100,
      relaunched: relaunched_n,
      recovered: recovered_n,
      recovered_value: Math.round(recovered_value * 100) / 100,
      recovery_rate: relaunched_n ? Math.round((recovered_n / relaunched_n) * 100) : 0,
      pending_relaunch: pending,
    }

    // Liste des paniers abandonnés (récents) avec coordonnées client pour relance manuelle
    const abListRes = await knex.raw(`
      SELECT c.id, c.email, c.updated_at,
        ((c.metadata->>'abandon_email_sent_at') IS NOT NULL) AS relaunched,
        a.first_name, a.last_name, a.phone, a.city, a.country_code,
        COALESCE(SUM(li.unit_price * li.quantity), 0) AS value,
        COUNT(li.id) AS items,
        json_agg(
          json_build_object('title', li.title, 'qty', li.quantity)
          ORDER BY li.created_at
        ) AS products
      FROM cart c
      JOIN cart_line_item li ON li.cart_id = c.id AND li.deleted_at IS NULL
      LEFT JOIN cart_address a ON a.id = COALESCE(c.shipping_address_id, c.billing_address_id)
      WHERE c.email IS NOT NULL AND c.deleted_at IS NULL AND c.completed_at IS NULL
        AND c.email NOT ILIKE '%@mendly.io%'
        AND c.updated_at < now() - interval '90 minutes'
      GROUP BY c.id, a.first_name, a.last_name, a.phone, a.city, a.country_code
      ORDER BY c.updated_at DESC
      LIMIT 15
    `)
    const abandoned_list = (abListRes.rows || []).map((r: any) => {
      const name = `${r.first_name || ""} ${r.last_name || ""}`.trim()
      const products = Array.isArray(r.products)
        ? r.products
            .filter((p: any) => p && p.title)
            .map((p: any) => ({ title: String(p.title), qty: Number(p.qty) || 1 }))
        : []
      return {
        email: r.email,
        name: name || null,
        phone: r.phone || null,
        city: r.city || null,
        country: (r.country_code || "").toUpperCase() || null,
        value: Math.round((Number(r.value) || 0) * 100) / 100,
        items: Number(r.items) || 0,
        updated_at: r.updated_at,
        relaunched: r.relaunched === true || r.relaunched === "t",
        products,
      }
    })

    const all_revenue = Math.round(orders.reduce((s, o) => s + o.revenue, 0) * 100) / 100

    return res.json({
      periods,
      daily,
      top_customers,
      top_products,
      country_split,
      top_brands,
      repeat: { rate: repeat_rate, repeat_customers, total_customers },
      monthly,
      carts,
      abandoned_list,
      totals: { all_orders: orders.length, all_revenue },
      generated_at: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[Stats Overview] Error:", error.message)
    return res.status(500).json({ message: error.message })
  }
}
