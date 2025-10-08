import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useState, useEffect } from "react"

/**
 * Widget Odoo - Affiché en PREMIER dans Product List
 * Carte dédiée avec configuration et import de produits
 */

const OdooWidget = () => {
  const [status, setStatus] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [showProducts, setShowProducts] = useState(false)

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    setIsLoadingStatus(true)
    try {
      const response = await fetch("/admin/odoo/status", { credentials: "include" })
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      console.error("Erreur statut:", error)
    } finally {
      setIsLoadingStatus(false)
    }
  }

  const fetchProducts = async () => {
    setIsLoadingProducts(true)
    try {
      const response = await fetch("/admin/odoo/products", { credentials: "include" })
      const data = await response.json()
      setProducts(data.products || [])
    } catch (error) {
      console.error("Erreur produits:", error)
      alert("❌ Erreur lors du chargement des produits")
    } finally {
      setIsLoadingProducts(false)
    }
  }

  const handleShowProducts = () => {
    if (!showProducts && products.length === 0) {
      fetchProducts()
    }
    setShowProducts(!showProducts)
  }

  const handleCheckboxChange = (productId: string, isChecked: boolean) => {
    setSelectedProducts((prev) => {
      const newSet = new Set(prev)
      if (isChecked) newSet.add(productId)
      else newSet.delete(productId)
      return newSet
    })
  }

  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
      setSelectedProducts(new Set(products.map((p) => p.id)))
    } else {
      setSelectedProducts(new Set())
    }
  }

  const syncSelectedProducts = async () => {
    if (selectedProducts.size === 0) {
      alert("ℹ️ Veuillez sélectionner au moins un produit à importer.")
      return
    }

    setIsSyncing(true)
    alert(`ℹ️ Importation de ${selectedProducts.size} produit(s) en cours...`)

    try {
      const response = await fetch("/admin/odoo/sync-selected", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: Array.from(selectedProducts) }),
      })

      const data = await response.json()

      if (data.success) {
        alert(`✅ ${data.message}`)
        setSelectedProducts(new Set())
        fetchProducts()
      } else {
        alert(`❌ ${data.message || "Erreur lors de l'importation"}`)
      }
    } catch (error) {
      console.error("Erreur:", error)
      alert("❌ Erreur lors de l'importation des produits Odoo.")
    } finally {
      setIsSyncing(false)
    }
  }

  if (isLoadingStatus) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <p className="text-gray-600">Chargement de la configuration Odoo...</p>
      </div>
    )
  }

  if (!status?.configured) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-l-4 border-orange-500">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 text-3xl">⚠️</div>
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-2">🔗 Configuration Odoo</h2>
            <p className="text-gray-700 mb-4">
              Le module Odoo n'est pas configuré. Ajoutez ces variables d'environnement :
            </p>
            <div className="bg-gray-100 p-4 rounded font-mono text-sm space-y-1">
              <div><span className="text-blue-600 font-semibold">ODOO_URL</span>=https://votre-odoo.com</div>
              <div><span className="text-blue-600 font-semibold">ODOO_DB_NAME</span>=votre_base</div>
              <div><span className="text-blue-600 font-semibold">ODOO_USERNAME</span>=admin@example.com</div>
              <div><span className="text-blue-600 font-semibold">ODOO_API_KEY</span>=votre_api_key</div>
            </div>
            <p className="text-gray-600 text-sm mt-3">
              Redémarrez l'application après configuration.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const allSelected = products.length > 0 && selectedProducts.size === products.length

  return (
    <div className="bg-white rounded-lg shadow-md mb-6 border-l-4 border-green-500">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔗</span>
            <div>
              <h2 className="text-xl font-bold">Intégration Odoo</h2>
              <p className="text-sm text-gray-600">Importez vos produits depuis Odoo</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            status.connected 
              ? "bg-green-100 text-green-800" 
              : "bg-orange-100 text-orange-800"
          }`}>
            {status.connected ? "✓ Connecté" : "○ Déconnecté"}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600">URL Odoo</p>
            <p className="font-medium truncate">{status.url || "N/A"}</p>
          </div>
          <div>
            <p className="text-gray-600">Base de données</p>
            <p className="font-medium">{status.database || "N/A"}</p>
          </div>
          <div>
            <p className="text-gray-600">Utilisateur</p>
            <p className="font-medium truncate">{status.username || "N/A"}</p>
          </div>
        </div>
      </div>

      {/* Toggle Products Button */}
      <div className="p-6 border-b bg-gray-50">
        <button
          onClick={handleShowProducts}
          disabled={!status.connected}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
        >
          <span>{showProducts ? "▼" : "►"}</span>
          {showProducts ? "Masquer les produits Odoo" : "Afficher les produits Odoo disponibles"}
        </button>
      </div>

      {/* Products List */}
      {showProducts && (
        <div className="p-6">
          {isLoadingProducts ? (
            <p className="text-gray-600 text-center py-8">Chargement des produits...</p>
          ) : products.length === 0 ? (
            <p className="text-gray-600 text-center py-8">Aucun produit trouvé dans Odoo.</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  <strong>{selectedProducts.size}</strong> / {products.length} produits sélectionnés
                </p>
                <button
                  onClick={fetchProducts}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  ↻ Actualiser
                </button>
              </div>

              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-3 text-left">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="w-4 h-4"
                        />
                      </th>
                      <th className="p-3 text-left font-medium">Nom</th>
                      <th className="p-3 text-left font-medium">SKU</th>
                      <th className="p-3 text-left font-medium">Prix</th>
                      <th className="p-3 text-left font-medium">Stock</th>
                      <th className="p-3 text-left font-medium">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedProducts.has(product.id)}
                            onChange={(e) => handleCheckboxChange(product.id, e.target.checked)}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="p-3 font-medium">{product.display_name}</td>
                        <td className="p-3 text-gray-600">{product.default_code || "N/A"}</td>
                        <td className="p-3">{product.list_price} {product.currency}</td>
                        <td className="p-3">{product.qty_available}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            product.synced 
                              ? "bg-green-100 text-green-800" 
                              : "bg-orange-100 text-orange-800"
                          }`}>
                            {product.synced ? "✓ Sync" : "○ Non sync"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4">
                <button
                  onClick={syncSelectedProducts}
                  disabled={isSyncing || selectedProducts.size === 0}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                >
                  {isSyncing 
                    ? `⏳ Importation de ${selectedProducts.size} produit(s)...` 
                    : `Importer ${selectedProducts.size} produit(s) sélectionné(s)`
                  }
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Info Footer */}
      <div className="p-4 bg-blue-50 border-t text-xs text-blue-900">
        <strong>ℹ️ Synchronisation automatique :</strong>
        <ul className="mt-2 space-y-1">
          <li>• Stock mis à jour depuis Odoo toutes les 15 minutes</li>
          <li>• Ventes Medusa → Stock Odoo en temps réel</li>
          <li>• Commandes Medusa → Créées dans Odoo automatiquement</li>
        </ul>
      </div>
    </div>
  )
}

export const config = defineWidgetConfig({
  zone: "product.list.before",
})

export default OdooWidget

