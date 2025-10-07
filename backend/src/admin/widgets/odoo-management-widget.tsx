import { defineWidgetConfig } from "@medusajs/admin-shared"
import { useState, useEffect } from "react"

/**
 * Widget Admin Odoo - Interface complète de gestion
 * Affiche une interface riche pour gérer l'intégration Odoo
 */

const OdooManagementWidget = () => {
  const [status, setStatus] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      setIsLoadingStatus(true)
      const response = await fetch("/admin/odoo/status", {
        credentials: "include",
      })
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
      const response = await fetch("/admin/odoo/products", {
        credentials: "include",
      })
      const data = await response.json()
      setProducts(data.products || [])
    } catch (error) {
      console.error("Erreur produits:", error)
      alert("❌ Erreur lors du chargement des produits")
    } finally {
      setIsLoadingProducts(false)
    }
  }

  const syncSelectedProducts = async () => {
    if (selectedProducts.size === 0) {
      alert("⚠️ Veuillez sélectionner au moins un produit")
      return
    }

    setIsSyncing(true)
    try {
      const response = await fetch("/admin/odoo/sync-selected", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: Array.from(selectedProducts),
        }),
      })
      const data = await response.json()
      
      if (data.success) {
        alert(`✅ ${data.synced} produits synchronisés !`)
        setSelectedProducts(new Set())
        fetchProducts() // Recharger
      } else {
        alert("❌ Erreur lors de la synchronisation")
      }
    } catch (error) {
      console.error("Erreur sync:", error)
      alert("❌ Erreur lors de la synchronisation")
    } finally {
      setIsSyncing(false)
    }
  }

  const toggleProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts)
    if (newSelected.has(productId)) {
      newSelected.delete(productId)
    } else {
      newSelected.add(productId)
    }
    setSelectedProducts(newSelected)
  }

  const toggleAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set())
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)))
    }
  }

  if (isLoadingStatus) {
    return (
      <div className="bg-white shadow-md rounded-lg p-8">
        <div className="flex items-center justify-center">
          <p className="text-gray-500">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!status?.configured) {
    return (
      <div className="bg-white shadow-md rounded-lg p-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Configuration Odoo</h2>
          <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
            Non configuré
          </span>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <p className="text-orange-800 mb-4">
            ⚠️ Odoo n'est pas configuré. Veuillez ajouter les variables d'environnement :
          </p>
          <ul className="space-y-2 text-sm text-orange-700">
            <li>• ODOO_URL</li>
            <li>• ODOO_DB_NAME</li>
            <li>• ODOO_USERNAME</li>
            <li>• ODOO_API_KEY</li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow-md rounded-lg">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Gestion Produits Odoo</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            status.connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {status.connected ? '✅ Connecté' : '❌ Déconnecté'}
          </span>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-sm mb-6">
          <div>
            <p className="text-gray-500">URL Odoo</p>
            <p className="font-medium">{status.url}</p>
          </div>
          <div>
            <p className="text-gray-500">Base de données</p>
            <p className="font-medium">{status.database}</p>
          </div>
          <div>
            <p className="text-gray-500">Utilisateur</p>
            <p className="font-medium">{status.username}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={fetchProducts}
            disabled={isLoadingProducts}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md font-medium disabled:opacity-50"
          >
            {isLoadingProducts ? "Chargement..." : "📋 Charger les produits Odoo"}
          </button>
          
          {products.length > 0 && (
            <button
              onClick={syncSelectedProducts}
              disabled={isSyncing || selectedProducts.size === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:opacity-50"
            >
              {isSyncing 
                ? "Synchronisation..." 
                : `✅ Importer ${selectedProducts.size} produit(s)`}
            </button>
          )}
        </div>
      </div>

      {/* Product List */}
      {products.length > 0 && (
        <div>
          <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedProducts.size === products.length}
                onChange={toggleAll}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="font-medium">
                {selectedProducts.size} / {products.length} produits sélectionnés
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-12 px-6 py-3"></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Nom du produit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Prix
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Stock Odoo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedProducts.has(product.id)}
                        onChange={() => toggleProduct(product.id)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {product.display_name}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {product.default_code || "-"}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {product.list_price} {product.currency}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {product.qty_available || 0}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        product.synced 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {product.synced ? "✅ Synchronisé" : "Non importé"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="p-6 bg-blue-50 border-t border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>ℹ️ Synchronisation automatique :</strong>
          <br />
          • Stock : Synchronisé toutes les 15 minutes (Odoo ↔ Medusa)
          <br />
          • Vente sur Medusa → Stock mis à jour dans Odoo en temps réel
          <br />
          • Commande sur Medusa → Créée automatiquement dans Odoo
        </p>
      </div>
    </div>
  )
}

export const config = defineWidgetConfig({
  zone: "product.list.before",
})

export default OdooManagementWidget

