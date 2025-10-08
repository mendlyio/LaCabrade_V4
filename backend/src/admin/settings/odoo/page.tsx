import { useEffect, useState } from "react"
// NOTE: On n'importe PAS @medusajs/ui. On ne dépend d'AUCUNE API spéciale.
// Certains boilerplates v2 détectent src/admin/settings/*/page.tsx automatiquement.

const OdooSettingsPage = () => {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/admin/odoo/status", { credentials: "include" })
        const data = await res.json()
        setStatus(data)
      } catch (e) {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Chargement...</p>
      </div>
    )
  }

  const isConfigured = !!status?.configured
  const isConnected = !!status?.connected

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Odoo</h1>
        <p className="text-gray-600">Configuration et import des produits depuis Odoo</p>
      </div>

      {!isConfigured && (
        <div className="bg-orange-50 border border-orange-200 rounded p-4 text-sm">
          <p className="font-medium text-orange-900">Module non configuré</p>
          <p className="text-orange-800 mt-1">Ajoutez les variables: ODOO_URL, ODOO_DB_NAME, ODOO_USERNAME, ODOO_API_KEY</p>
        </div>
      )}

      <div className="bg-white border rounded p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-gray-600 text-sm">Statut</p>
            <p className={`text-sm font-medium ${isConnected ? "text-green-700" : "text-red-700"}`}>
              {isConnected ? "Connecté" : "Non connecté"}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded">
        <div className="p-4 border-b">
          <p className="font-medium">Import manuel de produits</p>
          <p className="text-sm text-gray-600">Sélectionnez des produits Odoo à importer dans Medusa</p>
        </div>
        <div className="p-4">
          <button
            onClick={async () => {
              try {
                await fetch("/admin/odoo/products", { credentials: "include" })
                alert("La liste des produits est chargée dans la console API Admin.")
              } catch (e) {
                alert("Erreur de chargement des produits.")
              }
            }}
            disabled={!isConnected}
            className="px-4 py-2 bg-gray-900 text-white rounded disabled:bg-gray-400"
          >
            Voir les produits Odoo
          </button>
        </div>
      </div>
    </div>
  )
}

export default OdooSettingsPage

// Enregistre la carte dans Settings (pas de typage requis)
export const config = {
  card: {
    label: "Odoo",
    description: "Configurer Odoo et importer des produits",
  },
}
