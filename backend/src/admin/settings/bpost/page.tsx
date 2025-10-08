import { useEffect, useState } from "react"

const BpostSettingsPage = () => {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/admin/bpost/status", { credentials: "include" })
        const data = await res.json()
        setStatus(data)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-800 dark:text-gray-300">Chargement...</p>
      </div>
    )
  }

  const isConfigured = !!status?.configured
  const isConnected = !!status?.connected

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Bpost</h1>
        <p className="text-gray-800 dark:text-gray-300">Configuration et test de connexion Bpost</p>
      </div>

      {!isConfigured && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded p-4 text-sm">
          <p className="font-medium text-orange-900 dark:text-orange-200">Module non configuré</p>
          <p className="text-orange-800 dark:text-orange-300 mt-1">Ajoutez: BPOST_PUBLIC_KEY, BPOST_PRIVATE_KEY (optionnel: BPOST_WEBHOOK_SECRET)</p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-gray-800 dark:text-gray-300 text-sm">Statut</p>
            <p className={`text-sm font-medium ${isConnected ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
              {isConnected ? "Connecté" : "Non connecté"}
            </p>
          </div>
          <button
            onClick={async () => {
              const res = await fetch("/admin/bpost/status", { credentials: "include" })
              setStatus(await res.json())
            }}
            className="px-3 py-1.5 bg-gray-900 text-white rounded hover:bg-gray-800"
          >
            Tester connexion
          </button>
        </div>
      </div>
    </div>
  )
}

export default BpostSettingsPage

export const config = {
  card: {
    label: "Bpost",
    description: "Configurer Bpost et tester la connexion",
  },
}
