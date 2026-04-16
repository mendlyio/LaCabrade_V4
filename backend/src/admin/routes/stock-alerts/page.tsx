import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useState, useCallback } from "react"

type StockAlert = {
  id: string
  product_id: string
  variant_id: string | null
  customer_email: string
  customer_id: string | null
  notified: boolean
  created_at: string
  updated_at: string
}

const BellIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M5.85 3.5a.75.75 0 00-1.117-1 9.719 9.719 0 00-2.348 4.876.75.75 0 001.479.248A8.219 8.219 0 015.85 3.5zM19.267 2.5a.75.75 0 10-1.118 1 8.22 8.22 0 011.987 4.124.75.75 0 001.48-.248A9.72 9.72 0 0019.266 2.5z" />
    <path fillRule="evenodd" d="M12 2.25A6.75 6.75 0 005.25 9v.75a8.217 8.217 0 01-2.119 5.52.75.75 0 00.298 1.206c1.544.57 3.16.99 4.831 1.243a3.75 3.75 0 107.48 0 24.583 24.583 0 004.83-1.244.75.75 0 00.298-1.205 8.217 8.217 0 01-2.118-5.52V9A6.75 6.75 0 0012 2.25zM9.75 18c0-.034 0-.067.002-.1a25.05 25.05 0 004.496 0l.002.1a2.25 2.25 0 11-4.5 0z" clipRule="evenodd" />
  </svg>
)

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("fr-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

const StockAlertsPage = () => {
  const [alerts, setAlerts] = useState<StockAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [notifiedFilter, setNotifiedFilter] = useState<string>("pending")
  const [count, setCount] = useState(0)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("q", search)
      if (notifiedFilter === "pending") params.set("notified", "false")
      if (notifiedFilter === "notified") params.set("notified", "true")
      params.set("limit", "200")

      const res = await fetch(`/admin/stock-alerts?${params.toString()}`)
      if (!res.ok) throw new Error("Erreur réseau")
      const data = await res.json()
      setAlerts(data.alerts || [])
      setCount(data.count || 0)
    } catch (err) {
      console.error("Erreur chargement alertes stock:", err)
    } finally {
      setLoading(false)
    }
  }, [search, notifiedFilter])

  useEffect(() => {
    const timer = setTimeout(fetchAlerts, 300)
    return () => clearTimeout(timer)
  }, [fetchAlerts])

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette alerte ?")) return
    setDeleting(id)
    try {
      await fetch(`/admin/stock-alerts?id=${id}`, { method: "DELETE" })
      setAlerts((prev) => prev.filter((a) => a.id !== id))
      setCount((c) => Math.max(0, c - 1))
    } catch (err) {
      console.error("Erreur suppression:", err)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="p-6">
      {/* En-tête */}
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Alertes retour en stock</h1>
        <p className="text-sm text-gray-500">
          Clients en attente d'être notifiés quand un produit revient en stock.
        </p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-gray-900">{count}</div>
          <div className="text-sm text-gray-500">Total alertes affichées</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-orange-600">
            {alerts.filter((a) => !a.notified).length}
          </div>
          <div className="text-sm text-orange-600">En attente</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-green-600">
            {alerts.filter((a) => a.notified).length}
          </div>
          <div className="text-sm text-green-600">Notifiés</div>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Rechercher un email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={notifiedFilter}
          onChange={(e) => setNotifiedFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Toutes les alertes</option>
          <option value="pending">En attente</option>
          <option value="notified">Notifiés</option>
        </select>
        <button
          onClick={fetchAlerts}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
        >
          Rafraîchir
        </button>
      </div>

      {/* Tableau */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Email client</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Produit</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Variante</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Date</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Statut</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  Chargement...
                </td>
              </tr>
            ) : alerts.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  Aucune alerte trouvée
                </td>
              </tr>
            ) : (
              alerts.map((alert) => (
                <tr key={alert.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {alert.customer_email}
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                    {alert.product_id}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                    {alert.variant_id || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatDate(alert.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    {alert.notified ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Notifié
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                        En attente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(alert.id)}
                      disabled={deleting === alert.id}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
                    >
                      {deleting === alert.id ? "..." : "Supprimer"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-gray-400">
        {count} alerte{count !== 1 ? "s" : ""} au total
      </div>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Alertes stock",
  icon: BellIcon,
})

export default StockAlertsPage
