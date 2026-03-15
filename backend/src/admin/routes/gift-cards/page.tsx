import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useState, useCallback } from "react"

type GiftCardRow = {
  id: string
  code: string
  original_amount: number
  balance: number
  spent: number
  recipient_email: string
  recipient_name: string
  sender_name: string | null
  message: string | null
  order_id: string
  promotion_id: string | null
  status: "active" | "depleted" | "disabled"
  created_at: string
  updated_at: string
}

const STATUS_CONFIG = {
  active: { label: "Actif", bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300" },
  depleted: { label: "Épuisé", bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-400" },
  disabled: { label: "Désactivé", bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300" },
}

const GiftCardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M9.375 3a1.875 1.875 0 000 3.75h1.875v4.5H3.375A1.875 1.875 0 011.5 9.375v-.75c0-1.036.84-1.875 1.875-1.875h3.193A3.375 3.375 0 019.375 3zM12.75 12h8.625c.621 0 1.125-.504 1.125-1.125v-.75a1.875 1.875 0 00-1.875-1.875h-3.193A3.375 3.375 0 0014.625 3a1.875 1.875 0 000 3.75h-1.875v4.5zm-1.5 0H1.5v6.75C1.5 19.993 2.507 21 3.75 21h6.75V12zm1.5 0V21h6.75c1.243 0 2.25-1.007 2.25-2.25V12h-9z" />
  </svg>
)

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(amount)

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("fr-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

const GiftCardsPage = () => {
  const [giftCards, setGiftCards] = useState<GiftCardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [disabling, setDisabling] = useState<string | null>(null)
  const [count, setCount] = useState(0)

  const fetchGiftCards = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("q", search)
      if (statusFilter !== "all") params.set("status", statusFilter)
      params.set("limit", "100")

      const res = await fetch(`/admin/gift-cards?${params}`, {
        credentials: "include",
      })
      const data = await res.json()
      setGiftCards(data.gift_cards || [])
      setCount(data.count || 0)
    } catch (e) {
      console.error("Error fetching gift cards:", e)
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => {
    fetchGiftCards()
  }, [fetchGiftCards])

  const handleDisable = async (gc: GiftCardRow) => {
    if (!confirm(`Désactiver le bon cadeau ${gc.code} ?`)) return
    setDisabling(gc.id)
    try {
      await fetch(`/admin/gift-cards/${gc.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      await fetchGiftCards()
    } catch (e) {
      console.error("Error disabling gift card:", e)
    } finally {
      setDisabling(null)
    }
  }

  const totalActive = giftCards.filter((gc) => gc.status === "active").length
  const totalBalance = giftCards
    .filter((gc) => gc.status === "active")
    .reduce((sum, gc) => sum + gc.balance, 0)
  const totalSold = giftCards.reduce((sum, gc) => sum + gc.original_amount, 0)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Bons Cadeaux
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gérez les bons cadeaux vendus et suivez leur utilisation
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total vendus</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">
            {formatCurrency(totalSold)}
          </p>
          <p className="text-xs text-gray-400 mt-1">{count} bon(s) cadeau(x)</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Solde restant total</p>
          <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(totalBalance)}
          </p>
          <p className="text-xs text-gray-400 mt-1">{totalActive} actif(s)</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total dépensé</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">
            {formatCurrency(totalSold - totalBalance)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Rechercher par code, email, nom..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="all">Tous les statuts</option>
          <option value="active">Actifs</option>
          <option value="depleted">Épuisés</option>
          <option value="disabled">Désactivés</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Chargement...</div>
        ) : giftCards.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Aucun bon cadeau trouvé
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Code</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Destinataire</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Montant</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Dépensé</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Solde</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Statut</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Date</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {giftCards.map((gc) => {
                  const statusCfg = STATUS_CONFIG[gc.status] || STATUS_CONFIG.active
                  return (
                    <tr key={gc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          {gc.code}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-900 dark:text-gray-100">{gc.recipient_name}</div>
                        <div className="text-xs text-gray-400">{gc.recipient_email}</div>
                        {gc.sender_name && (
                          <div className="text-xs text-gray-400 italic">
                            De : {gc.sender_name}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(gc.original_amount)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                        {formatCurrency(gc.spent)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(gc.balance)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.text}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {formatDate(gc.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {gc.status === "active" && (
                          <button
                            onClick={() => handleDisable(gc)}
                            disabled={disabling === gc.id}
                            className="text-xs px-3 py-1.5 rounded border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                          >
                            {disabling === gc.id ? "..." : "Désactiver"}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Bons Cadeaux",
  icon: GiftCardIcon,
})

export default GiftCardsPage
