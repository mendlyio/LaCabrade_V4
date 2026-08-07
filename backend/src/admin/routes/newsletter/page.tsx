import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useState, useCallback } from "react"

type Subscriber = {
  id: string
  email: string
  birthday: string | null
  promo_code: string | null
  birthday_promo_code: string | null
  status: "active" | "unsubscribed"
  created_at: string
  updated_at: string
}

const NewsletterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
    <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
  </svg>
)

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("fr-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

const formatBirthday = (birthday: string | null) => {
  if (!birthday) return "—"
  const [month, day] = birthday.split("-")
  const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]
  return `${day} ${months[parseInt(month, 10) - 1]}`
}

const isBirthdayToday = (birthday: string | null): boolean => {
  if (!birthday) return false
  const today = new Date()
  const mm = String(today.getMonth() + 1).padStart(2, "0")
  const dd = String(today.getDate()).padStart(2, "0")
  return birthday === `${mm}-${dd}`
}

const NewsletterPage = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("active")
  const [disabling, setDisabling] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState<string | null>(null)
  const [count, setCount] = useState(0)

  const fetchSubscribers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("q", search)
      if (statusFilter !== "all") params.set("status", statusFilter)
      params.set("limit", "200")

      const res = await fetch(`/admin/newsletter?${params}`, {
        credentials: "include",
      })
      const data = await res.json()
      setSubscribers(data.subscribers || [])
      setCount(data.count || 0)
    } catch (e) {
      console.error("Erreur chargement newsletter:", e)
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => {
    fetchSubscribers()
  }, [fetchSubscribers])

  const handleUnsubscribe = async (sub: Subscriber) => {
    if (!confirm(`Désabonner ${sub.email} ?`)) return
    setDisabling(sub.id)
    try {
      await fetch(`/admin/newsletter/${sub.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      await fetchSubscribers()
    } catch (e) {
      console.error("Erreur désabonnement:", e)
    } finally {
      setDisabling(null)
    }
  }

  const handleRegeneratePromo = async (sub: Subscriber) => {
    if (
      !confirm(
        `Régénérer le code -10% pour ${sub.email} ?\n\nL'ancien code (${sub.promo_code || "—"}) sera désactivé et un nouvel email sera envoyé.`
      )
    ) {
      return
    }
    setRegenerating(sub.id)
    try {
      const res = await fetch(`/admin/newsletter/${sub.id}/regenerate-promo`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resend_email: true }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(`Erreur : ${data.message || res.status}`)
      } else {
        alert(`Nouveau code : ${data.promo_code}\nEmail renvoyé à ${data.email}`)
        await fetchSubscribers()
      }
    } catch (e) {
      console.error("Erreur régénération:", e)
      alert("Erreur lors de la régénération")
    } finally {
      setRegenerating(null)
    }
  }

  const activeCount = subscribers.filter((s) => s.status === "active").length
  const withBirthday = subscribers.filter((s) => s.birthday !== null).length
  const birthdaysToday = subscribers.filter((s) => isBirthdayToday(s.birthday)).length

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Newsletter
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gestion des abonnés et codes de réduction
          </p>
        </div>
        <button
          onClick={fetchSubscribers}
          className="text-sm px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Actualiser
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total abonnés</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">{count}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Actifs</p>
          <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Avec anniversaire</p>
          <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400 mt-1">{withBirthday}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Anniversaires aujourd'hui</p>
          <p className="text-2xl font-semibold text-rose-600 dark:text-rose-400 mt-1">{birthdaysToday}</p>
          {birthdaysToday > 0 && (
            <p className="text-xs text-rose-500 mt-1">🎂 Emails envoyés automatiquement</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Rechercher par email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="all">Tous</option>
          <option value="active">Actifs</option>
          <option value="unsubscribed">Désabonnés</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Chargement...</div>
        ) : subscribers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Aucun abonné trouvé</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Email</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Anniversaire</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Code bienvenue</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Code anniversaire</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Statut</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Inscrit le</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {subscribers.map((sub) => {
                  const isToday = isBirthdayToday(sub.birthday)
                  return (
                    <tr
                      key={sub.id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors ${isToday ? "bg-rose-50/40 dark:bg-rose-900/10" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="text-gray-900 dark:text-gray-100 font-medium">{sub.email}</div>
                        {isToday && (
                          <div className="text-xs text-rose-500 font-medium mt-0.5">🎂 Anniversaire aujourd'hui !</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                        {formatBirthday(sub.birthday)}
                      </td>
                      <td className="px-4 py-3">
                        {sub.promo_code ? (
                          <code className="text-xs font-mono bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-2 py-1 rounded border border-amber-200 dark:border-amber-800">
                            {sub.promo_code}
                          </code>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {sub.birthday_promo_code ? (
                          <code className="text-xs font-mono bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 px-2 py-1 rounded border border-rose-200 dark:border-rose-800">
                            {sub.birthday_promo_code}
                          </code>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {sub.status === "active" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                            Actif
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                            Désabonné
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {formatDate(sub.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {sub.status === "active" && (
                            <button
                              onClick={() => handleRegeneratePromo(sub)}
                              disabled={regenerating === sub.id}
                              className="text-xs px-3 py-1.5 rounded border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors disabled:opacity-50"
                              title="Régénérer le code -10% et renvoyer l'email"
                            >
                              {regenerating === sub.id ? "..." : "Nouveau code"}
                            </button>
                          )}
                          {sub.status === "active" && (
                            <button
                              onClick={() => handleUnsubscribe(sub)}
                              disabled={disabling === sub.id}
                              className="text-xs px-3 py-1.5 rounded border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                            >
                              {disabling === sub.id ? "..." : "Désabonner"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="text-xs text-gray-400 dark:text-gray-500 flex flex-wrap gap-4">
        <span>
          <span className="inline-block w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/20 border border-amber-200 mr-1 align-middle"></span>
          Code bienvenue -10% (envoyé à l'inscription)
        </span>
        <span>
          <span className="inline-block w-3 h-3 rounded bg-rose-100 dark:bg-rose-900/20 border border-rose-200 mr-1 align-middle"></span>
          Code anniversaire -10% (envoyé automatiquement chaque année)
        </span>
      </div>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Newsletter",
  icon: NewsletterIcon,
})

export default NewsletterPage
