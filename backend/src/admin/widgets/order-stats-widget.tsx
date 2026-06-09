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
  country_split: Array<{ country: string; orders: number }>
  top_brands: Array<{ brand: string; revenue: number; qty: number }>
  repeat: { rate: number; repeat_customers: number; total_customers: number }
  monthly: Array<{ month: string; revenue: number; orders: number }>
  carts: {
    abandoned: number
    abandoned_value: number
    relaunched: number
    recovered: number
    recovered_value: number
    recovery_rate: number
    pending_relaunch: number
  }
  abandoned_list: Array<{
    email: string
    name: string | null
    phone: string | null
    city: string | null
    country: string | null
    value: number
    items: number
    updated_at: string
    relaunched: boolean
    products: Array<{ title: string; qty: number }>
  }>
  searches: {
    top: Array<{ query: string; count: number; avg_results: number }>
    zero_results: Array<{ query: string; count: number }>
  }
  totals: { all_orders: number; all_revenue: number }
}

const COUNTRY_NAME: Record<string, string> = {
  BE: "🇧🇪 Belgique",
  FR: "🇫🇷 France",
  LU: "🇱🇺 Luxembourg",
  ES: "🇪🇸 Espagne",
  AL: "Allemagne",
  DE: "🇩🇪 Allemagne",
  NL: "🇳🇱 Pays-Bas",
}
const MONTH_NAME = ["jan", "fév", "mar", "avr", "mai", "juin", "juil", "août", "sep", "oct", "nov", "déc"]

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
  const [loading, setLoading] = useState(false)
  const [period, setPeriod] = useState<Period>("30d")
  // Replié par défaut ; on mémorise le choix de l'utilisateur
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return true
    return localStorage.getItem("lc_stats_collapsed") !== "0"
  })

  // Chargement différé : on ne récupère les stats qu'au premier dépliage
  useEffect(() => {
    if (collapsed || data || loading) return
    setLoading(true)
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
  }, [collapsed, data, loading])

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem("lc_stats_collapsed", next ? "1" : "0")
      } catch {
        /* noop */
      }
      return next
    })
  }

  return (
    <div className="mb-4 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
      {/* Header cliquable (replier / déplier) */}
      <button
        type="button"
        onClick={toggle}
        className="w-full bg-gradient-to-r from-[#9e354a] to-[#7a2838] px-5 py-4 flex items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-2 text-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          <h2 className="text-base font-bold">Tableau de bord — Ventes</h2>
          {collapsed && (
            <span className="text-xs text-white/70 font-normal hidden sm:inline">
              — cliquez pour afficher
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!collapsed && (
            <div
              className="flex gap-1 bg-white/15 rounded-lg p-0.5"
              onClick={(e) => e.stopPropagation()}
            >
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
          )}
          <svg
            className={`w-5 h-5 text-white transition-transform ${collapsed ? "" : "rotate-180"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {!collapsed && (
        <div className="bg-white dark:bg-gray-900 p-5">
          {loading && <p className="text-sm text-gray-400">Chargement des statistiques…</p>}
          {!loading && !data && (
            <p className="text-sm text-gray-400">Impossible de charger les statistiques.</p>
          )}
          {!loading && data && (() => {
            const p = data.periods[period]
            const maxDaily = Math.max(1, ...data.daily.map((d) => d.revenue))
            return (
              <>
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

        {/* Paniers abandonnés & relance */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Paniers abandonnés &amp; relance automatique
            </p>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              ● Relance par email active (toutes les heures)
            </span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 p-3">
              <p className="text-[11px] text-orange-700 dark:text-orange-300 uppercase tracking-wide">Paniers abandonnés</p>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-300 mt-0.5">{data.carts.abandoned}</p>
              <p className="text-[11px] text-orange-600/80 dark:text-orange-400/80 mt-0.5">
                valeur cumulée {euro(data.carts.abandoned_value)}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3">
              <p className="text-[11px] text-gray-500 uppercase tracking-wide">Emails de relance</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{data.carts.relaunched}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {data.carts.pending_relaunch > 0
                  ? `${data.carts.pending_relaunch} en attente`
                  : "à jour"}
              </p>
            </div>
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 p-3">
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">Paniers récupérés</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">{data.carts.recovered}</p>
              <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                {euro(data.carts.recovered_value)} récupérés
              </p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 text-white p-3">
              <p className="text-[11px] text-white/85 uppercase tracking-wide">Taux de récupération</p>
              <p className="text-2xl font-bold mt-0.5">{data.carts.recovery_rate}%</p>
              <p className="text-[11px] text-white/80 mt-0.5">des paniers relancés</p>
            </div>
          </div>

          {/* Liste des paniers abandonnés récents — survol = coordonnées client */}
          {data.abandoned_list.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] text-gray-400 mb-1.5">
                Paniers abandonnés récents (survolez une ligne pour voir les coordonnées) :
              </p>
              <div className="rounded-lg border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800 overflow-visible">
                {data.abandoned_list.map((cart, i) => (
                  <div
                    key={i}
                    className="group relative flex items-center gap-3 px-3 py-2 text-sm hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors cursor-default"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-gray-800 dark:text-gray-200">
                        {cart.name || cart.email}
                      </p>
                      {cart.products.length > 0 && (
                        <p className="truncate text-[11px] text-gray-400">
                          🛒 {cart.products
                            .map((p) => `${p.title}${p.qty > 1 ? ` ×${p.qty}` : ""}`)
                            .join(", ")}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {cart.items} art.
                    </span>
                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100 flex-shrink-0 w-20 text-right">
                      {euro2(cart.value)}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        cart.relaunched
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {cart.relaunched ? "Relancé" : "Non relancé"}
                    </span>
                    <span className="text-[10px] text-gray-400 flex-shrink-0 w-16 text-right">
                      {new Date(cart.updated_at).toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit" })}
                    </span>

                    {/* Popover coordonnées au survol */}
                    <div className="absolute left-3 top-full mt-1 z-20 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg shadow-xl p-3 min-w-[240px]">
                      <p className="font-semibold mb-1 text-white">
                        {cart.name || "Client"}
                      </p>
                      <p className="flex items-center gap-1.5 text-white/90">
                        <span>✉</span>
                        <a href={`mailto:${cart.email}`} className="underline hover:text-white">
                          {cart.email}
                        </a>
                      </p>
                      {cart.phone && (
                        <p className="flex items-center gap-1.5 text-white/90 mt-0.5">
                          <span>📞</span>
                          <a href={`tel:${cart.phone}`} className="underline hover:text-white">
                            {cart.phone}
                          </a>
                        </p>
                      )}
                      {(cart.city || cart.country) && (
                        <p className="flex items-center gap-1.5 text-white/90 mt-0.5">
                          <span>📍</span>
                          {[cart.city, cart.country].filter(Boolean).join(", ")}
                        </p>
                      )}
                      {cart.products.length > 0 && (
                        <div className="mt-1.5 pt-1.5 border-t border-white/20">
                          <p className="text-white/60 mb-0.5">Articles dans le panier :</p>
                          <ul className="space-y-0.5">
                            {cart.products.map((p, j) => (
                              <li key={j} className="text-white/90">
                                • {p.title}
                                {p.qty > 1 ? ` ×${p.qty}` : ""}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <p className="mt-1.5 pt-1.5 border-t border-white/20 text-white/70">
                        {cart.items} article(s) · {euro2(cart.value)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Comparatif mensuel (6 mois) */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Comparatif mensuel — 6 derniers mois
          </p>
          <div className="flex items-end gap-2 h-28">
            {(() => {
              const maxM = Math.max(1, ...data.monthly.map((m) => m.revenue))
              return data.monthly.map((m) => {
                const h = Math.max(4, Math.round((m.revenue / maxM) * 80))
                const [, mm] = m.month.split("-")
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center justify-end">
                    <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                      {euro(m.revenue)}
                    </span>
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-[#9e354a] to-[#c95d73]"
                      style={{ height: `${h}px` }}
                      title={`${m.orders} commandes`}
                    />
                    <span className="text-[10px] text-gray-400 mt-1">{MONTH_NAME[Number(mm) - 1]}</span>
                  </div>
                )
              })
            })()}
          </div>
        </div>

        {/* Répartition pays + Taux de réachat */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Répartition par pays (livraison)
            </p>
            <div className="space-y-1.5">
              {(() => {
                const total = data.country_split.reduce((s, c) => s + c.orders, 0) || 1
                return data.country_split.slice(0, 5).map((c) => {
                  const pct = Math.round((c.orders / total) * 100)
                  return (
                    <div key={c.country} className="flex items-center gap-2 text-sm">
                      <span className="w-28 truncate text-gray-700 dark:text-gray-300">
                        {COUNTRY_NAME[c.country] || c.country}
                      </span>
                      <div className="flex-1 h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <div className="h-full bg-[#9e354a]" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-16 text-right text-xs text-gray-500">
                        {c.orders} ({pct}%)
                      </span>
                    </div>
                  )
                })
              })()}
            </div>
          </div>

          <div className="flex flex-col">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Fidélité client
            </p>
            <div className="flex-1 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-white p-4 flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{data.repeat.rate}%</p>
                <p className="text-xs text-white/90 mt-1">taux de réachat</p>
              </div>
              <div className="text-right text-xs text-white/90 leading-relaxed">
                <p className="font-semibold text-base">{data.repeat.repeat_customers}</p>
                <p>clients fidèles</p>
                <p className="mt-1">sur {data.repeat.total_customers} au total</p>
              </div>
            </div>
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

        {/* CA par marque */}
        <div className="mt-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Chiffre d'affaires par marque (90 j)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {data.top_brands.length === 0 && (
              <p className="text-xs text-gray-400">Aucune vente sur la période.</p>
            )}
            {(() => {
              const maxB = Math.max(1, ...data.top_brands.map((b) => b.revenue))
              return data.top_brands.map((b, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2"
                >
                  <span className="flex-1 truncate text-gray-800 dark:text-gray-200" title={b.brand}>
                    {b.brand}
                  </span>
                  <div className="w-20 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden hidden sm:block">
                    <div className="h-full bg-[#9e354a]" style={{ width: `${Math.round((b.revenue / maxB) * 100)}%` }} />
                  </div>
                  <span className="text-xs font-bold text-[#9e354a] dark:text-[#d98aa0] flex-shrink-0 w-16 text-right">
                    {euro(b.revenue)}
                  </span>
                </div>
              ))
            })()}
          </div>
        </div>

        {/* Recherches clients */}
        {(data.searches.top.length > 0 || data.searches.zero_results.length > 0) && (
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Recherches les plus fréquentes (90 j)
              </p>
              <div className="space-y-1.5">
                {data.searches.top.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2"
                  >
                    <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className="flex-1 truncate text-gray-800 dark:text-gray-200">{s.query}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{s.count}×</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Recherches sans résultat (90 j)
              </p>
              {data.searches.zero_results.length === 0 ? (
                <p className="text-xs text-gray-400">Aucune recherche infructueuse 🎉</p>
              ) : (
                <div className="space-y-1.5">
                  {data.searches.zero_results.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-sm bg-red-50 dark:bg-red-900/10 rounded-lg px-3 py-2"
                    >
                      <span className="flex-1 truncate text-red-700 dark:text-red-300">{s.query}</span>
                      <span className="text-xs text-red-400 flex-shrink-0">{s.count}×</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-gray-400 mt-1.5">
                💡 Recherches sans résultat = produits manquants ou mots-clés à ajouter au catalogue.
              </p>
            </div>
          </div>
        )}
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}

export const config = defineWidgetConfig({
  zone: "order.list.before",
})

export default OrderStatsWidget
