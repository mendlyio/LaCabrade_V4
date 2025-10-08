import { useEffect, useState } from "react"

const BpostSettingsPage = () => {
  const [status, setStatus] = useState<any>(null)
  const [options, setOptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/admin/bpost/status", { credentials: "include" })
        const data = await res.json()
        setStatus(data)
        const r2 = await fetch("/admin/bpost/shipping-options", { credentials: "include" })
        const d2 = await r2.json()
        setOptions(d2.shipping_options || [])
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

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Options d'expédition Bpost</h2>
        {options.length === 0 && (
          <p className="text-sm text-gray-700 dark:text-gray-300">Aucune option Bpost trouvée. Créez des options avec provider "bpost" dans Emplacements & Livraison.</p>
        )}
        <ul className="divide-y">
          {options.map((o: any) => (
            <li key={o.id} className="py-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base-regular text-gray-900 dark:text-gray-100">{o.name}</div>
                  <div className="text-small-regular text-gray-700 dark:text-gray-300">provider: {o.provider_id}</div>
                </div>
              </div>
              {o.metadata?.bpost_pricing_rules && (
                <pre className="mt-2 text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded overflow-auto max-h-48">{JSON.stringify(o.metadata.bpost_pricing_rules, null, 2)}</pre>
              )}
            </li>
          ))}
        </ul>
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
