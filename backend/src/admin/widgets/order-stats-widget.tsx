import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect, useState } from "react"

type Period = "7d" | "30d" | "90d"

type PeriodStat = {
  orders: number
  revenue: number
  aov: number
  orders_prev: number
  revenue_prev: number
}

type StatsData = {
  periods: Record<Period, PeriodStat>
  daily: Array<{ date: string; revenue: number; orders: number }>
  top_customers: Array<{ email: string; orders: number; spent: number }>
  top_products: Array<{ title: string; qty: number; revenue: number }>
  totals: { all_orders: number; all_revenue: number }
}

const euro = (n: number) =>
  new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0)
const euro2 = (n: number) =>
  new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(n || 0)

const PERIOD_LABEL: Record<Period, string> = { "7d": "7 jours", "30d": "30 jours", "90d": "90 jours" }

function Trend({ current, prev }: { current: number; prev: number }) {
  if (prev === 0) {
    return current > 0 ? <span className="text-emerald-200 text-xs font-semibold">nouveau</span> : null
  }
  const pct = Math.round(((current - prev) / prev) * 100)
  const up = pct >= 0
  return (
    <span className={`text-xs font-semibold ${up ? "text-emerald-200" : "text-red-200"}`}>
      {up ? "▲" : "▼"} {Math.abs(pct)}%
    </span>
  )
}

const OrderStatsWidget = () => {
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>("30d")

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/admin/stats/overview", { credentials: "include" })
        if (res.ok) setData(await res.json())
      } catch {
        /* noop */
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) {
    return (
      <div className="mb-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 text-sm text-gray-400">
        Chargement des statistiques…
      </div>
    )
  }
  if (!data) return null

  const p = data.periods[period]
  const maxDaily = Math.max(1, ...data.daily.map((d) => d.revenue))

  return (
    <div className="mb-4 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
      {/* Header + sélecteur de période */}
      <div className="bg-gradient-to-r from-[#9e354a] to-[#7a2838] px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          <h2 className="text-base font-bold">Tableau de bord — Ventes</h2>
        </div>
        <div className="flex gap-1 bg-white/15 rounded-lg p-0.5">
          {(["7d", "30d", "90d"] as Period[]).map((pp) => (
            <button
              key={pp}
              onClick={() => setPeriod(pp)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                period === pp ? "bg-white text-[#9e354a]" : "text-white/90 hover:bg-white/10"
              }`}
            >
              {PERIOD_LABEL[pp]}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 p-5">
        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div className="rounded-lg bg-gradient-to-br from-[#9e354a] to-[#7a2838] text-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/80 uppercase tracking-wide">Chiffre d'affaires</p>
              <Trend current={p.revenue} prev={p.revenue_prev} />
            </div>
            <p className="text-2xl font-bold mt-1">{euro(p.revenue)}</p>
            <p className="text-[11px] text-white/70 mt-0.5">
              période préc. {euro(p.revenue_prev)}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Commandes</p>
              <span className="text-xs font-semibold text-gray-400">
                {(() => {
                  if (p.orders_prev === 0) return p.orders > 0 ? "nouveau" : ""
                  const pct = Math.round(((p.orders - p.orders_prev) / p.orders_prev) * 100)
                  return `${pct >= 0 ? "▲" : "▼"} ${Math.abs(pct)}%`
                })()}
              </span>
            </div>
            <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-gray-100">{p.orders}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">période préc. {p.orders_prev}</p>
          </div>
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Panier moyen</p>
            <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-gray-100">{euro2(p.aov)}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              CA total all-time {euro(data.totals.all_revenue)} · {data.totals.all_orders} cmd
            </p>
          </div>
        </div>

        {/* Graphique CA 14 jours */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Chiffre d'affaires — 14 derniers jours
          </p>
          <div className="flex items-end gap-1 h-24">
            {data.daily.map((d) => {
              const h = Math.max(3, Math.round((d.revenue / maxDaily) * 90))
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center justify-end group relative">
                  <div
                    className="w-full rounded-t bg-[#9e354a]/80 hover:bg-[#9e354a] transition-colors"
                    style={{ height: `${h}px` }}
                  />
                  <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-900 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap z-10">
                    {d.date.slice(5)} · {euro(d.revenue)} · {d.orders} cmd
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>{data.daily[0]?.date.slice(5)}</span>
            <span>{data.daily[data.daily.length - 1]?.date.slice(5)}</span>
          </div>
        </div>

        {/* Top produits + Top clients */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Top produits (90 j)
            </p>
            <div className="space-y-1.5">
              {data.top_products.length === 0 && (
                <p className="text-xs text-gray-400">Aucune vente sur la période.</p>
              )}
              {data.top_products.map((prod, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2"
                >
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-[#9e354a] text-white text-[10px] font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate text-gray-800 dark:text-gray-200" title={prod.title}>
                    {prod.title}
                  </span>
                  <span className="text-xs font-semibold text-gray-500 flex-shrink-0">
                    ×{prod.qty}
                  </span>
                  <span className="text-xs font-bold text-[#9e354a] dark:text-[#d98aa0] flex-shrink-0 w-16 text-right">
                    {euro(prod.revenue)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Meilleurs clients (90 j)
            </p>
            <div className="space-y-1.5">
              {data.top_customers.length === 0 && (
                <p className="text-xs text-gray-400">Aucun client sur la période.</p>
              )}
              {data.top_customers.map((cust, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2"
                >
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate text-gray-800 dark:text-gray-200" title={cust.email}>
                    {cust.email}
                  </span>
                  <span className="text-xs text-gray-500 flex-shrink-0">{cust.orders} cmd</span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0 w-16 text-right">
                    {euro(cust.spent)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const config = defineWidgetConfig({
  zone: "order.list.before",
})

export default OrderStatsWidget
