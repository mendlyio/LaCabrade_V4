import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useState, useEffect } from "react"

const OdooConfigurationWidget = () => {
  const [status, setStatus] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    setIsLoadingStatus(true)
    try {
      const response = await fetch("/admin/odoo/status", {
        credentials: "include",
      })
      const data = await response.json()
      setStatus(data)
      if (data.connected) {
        fetchProducts()
      }
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

  const handleCheckboxChange = (productId: string, isChecked: boolean) => {
    setSelectedProducts((prev) => {
      const newSet = new Set(prev)
      if (isChecked) {
        newSet.add(productId)
      } else {
        newSet.delete(productId)
      }
      return newSet
    })
  }

  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
      const allProductIds = products.map((p) => p.id)
      setSelectedProducts(new Set(allProductIds))
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
        alert(`❌ ${data.message || "Erreur lors de l'importation des produits."}`)
      }
    } catch (error) {
      console.error("Erreur d'importation:", error)
      alert("❌ Erreur lors de l'importation des produits Odoo.")
    } finally {
      setIsSyncing(false)
    }
  }

  const allProductsSelected = products.length > 0 && selectedProducts.size === products.length
  const isConfigured = status?.configured
  const isConnected = status?.connected

  if (isLoadingStatus) {
    return (
      <div className="p-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-gray-800 dark:text-gray-300">Chargement de la configuration Odoo...</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      {/* Header - Toujours visible */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🏭</div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Intégration Odoo</h2>
              <p className="text-sm text-gray-800 dark:text-gray-300">
                Gérez votre connexion ERP et importez vos produits
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              isConnected 
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" 
                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
            }`}>
              {isConnected ? "✓ Connecté" : "○ Non connecté"}
            </span>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 text-sm transition-colors"
            >
              {isExpanded ? "Réduire ▲" : "Voir détails ▼"}
            </button>
          </div>
        </div>
      </div>

      {/* Contenu détaillé - Visible si étendu */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* Message de configuration si non configuré */}
          {!isConfigured && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 text-2xl">⚠️</div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Module Odoo non configuré</h3>
                  <p className="text-sm text-gray-800 dark:text-gray-300 mb-3">
                    Pour activer l'intégration Odoo, ajoutez les variables d'environnement suivantes :
                  </p>
                  <div className="bg-gray-900 text-white p-3 rounded font-mono text-xs overflow-x-auto">
                    <div className="space-y-1">
                      <div><span className="text-green-400">ODOO_URL</span>=https://votre-instance-odoo.com</div>
                      <div><span className="text-green-400">ODOO_DB_NAME</span>=nom_de_votre_base</div>
                      <div><span className="text-green-400">ODOO_USERNAME</span>=admin@example.com</div>
                      <div><span className="text-green-400">ODOO_API_KEY</span>=votre_api_key_ou_password</div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-800 dark:text-gray-300 mt-2">
                    Une fois configuré, redémarrez l'application pour activer les fonctionnalités ci-dessous.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Statut de connexion */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Informations de connexion</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-gray-800 dark:text-gray-300">URL Odoo</p>
                <p className="font-medium break-all text-gray-900 dark:text-gray-100">{status?.url || "Non défini"}</p>
              </div>
              <div>
                <p className="text-gray-800 dark:text-gray-300">Base de données</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{status?.database || "Non défini"}</p>
              </div>
              <div>
                <p className="text-gray-800 dark:text-gray-300">Utilisateur</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{status?.username || "Non défini"}</p>
              </div>
            </div>
          </div>

          {/* Liste des produits Odoo */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Produits Odoo disponibles</h3>
                  <p className="text-xs text-gray-800 dark:text-gray-300 mt-1">
                    Sélectionnez les produits que vous souhaitez importer dans Medusa
                  </p>
                </div>
                <button
                  onClick={fetchProducts}
                  disabled={isLoadingProducts || !isConnected}
                  className="px-3 py-1.5 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:bg-gray-500 disabled:cursor-not-allowed text-xs transition-colors"
                >
                  {isLoadingProducts ? "Chargement..." : "↻ Actualiser"}
                </button>
              </div>
            </div>

            {!isConnected ? (
              <div className="flex flex-col items-center justify-center p-8">
                <div className="text-4xl mb-3">🔌</div>
                <p className="text-sm text-gray-800 dark:text-gray-300 text-center">
                  {!isConfigured 
                    ? "Configurez Odoo pour voir les produits disponibles" 
                    : "Connexion à Odoo impossible. Vérifiez vos identifiants."
                  }
                </p>
              </div>
            ) : isLoadingProducts ? (
              <div className="flex items-center justify-center p-8">
                <p className="text-sm text-gray-800 dark:text-gray-300">Chargement des produits Odoo...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8">
                <div className="text-4xl mb-3">📦</div>
                <p className="text-sm text-gray-800 dark:text-gray-300">Aucun produit trouvé dans Odoo.</p>
              </div>
            ) : (
              <>
                <div className="p-4">
                  <p className="text-xs text-gray-800 dark:text-gray-300 mb-3">
                    <strong>{selectedProducts.size}</strong> / {products.length} produits sélectionnés
                  </p>
                  
                  <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                        <tr className="text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                          <th className="p-3">
                            <input
                              type="checkbox"
                              checked={allProductsSelected}
                              onChange={(e) => handleSelectAll(e.target.checked)}
                              className="w-3.5 h-3.5"
                            />
                          </th>
                          <th className="p-3">Nom</th>
                          <th className="p-3">SKU</th>
                          <th className="p-3">Prix</th>
                          <th className="p-3">Stock</th>
                          <th className="p-3">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {products.map((product) => (
                          <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="p-3">
                              <input
                                type="checkbox"
                                checked={selectedProducts.has(product.id)}
                                onChange={(e) => handleCheckboxChange(product.id, e.target.checked)}
                                className="w-3.5 h-3.5"
                              />
                            </td>
                            <td className="p-3 font-medium text-gray-900 dark:text-gray-100">{product.display_name}</td>
                            <td className="p-3 text-gray-800 dark:text-gray-300">{product.default_code || "N/A"}</td>
                            <td className="p-3">{product.list_price} {product.currency}</td>
                            <td className="p-3">{product.qty_available}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                product.synced 
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" 
                                  : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100"
                              }`}>
                                {product.synced ? "✓" : "○"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <button
                    onClick={syncSelectedProducts}
                    disabled={isSyncing || selectedProducts.size === 0 || !isConnected}
                    className="w-full px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:bg-gray-500 disabled:cursor-not-allowed font-medium transition-colors text-sm"
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

          {/* Fonctionnalités du module */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">🎯 Fonctionnalités de l'intégration</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className={`p-3 border rounded ${isConnected ? 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800' : 'border-gray-200 dark:border-gray-700'}`}>
                <div className="flex items-start gap-2">
                  <div className="text-xl">📥</div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">Import de produits</h4>
                    <p className="text-xs text-gray-800 dark:text-gray-300">Importation manuelle des produits sélectionnés</p>
                    <p className={`text-xs mt-1 font-medium ${isConnected ? 'text-green-700 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'}`}>
                      {isConnected ? '✓ Actif' : '○ Nécessite connexion'}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`p-3 border rounded ${isConfigured ? 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800' : 'border-gray-200 dark:border-gray-700'}`}>
                <div className="flex items-start gap-2">
                  <div className="text-xl">🔄</div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">Sync stock (Odoo → Medusa)</h4>
                    <p className="text-xs text-gray-800 dark:text-gray-300">Mise à jour automatique toutes les 15min</p>
                    <p className={`text-xs mt-1 font-medium ${isConfigured ? 'text-green-700 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'}`}>
                      {isConfigured ? '✓ Actif' : '○ Nécessite config'}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`p-3 border rounded ${isConfigured ? 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800' : 'border-gray-200 dark:border-gray-700'}`}>
                <div className="flex items-start gap-2">
                  <div className="text-xl">↔️</div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">Sync stock (Medusa → Odoo)</h4>
                    <p className="text-xs text-gray-800 dark:text-gray-300">Mise à jour en temps réel</p>
                    <p className={`text-xs mt-1 font-medium ${isConfigured ? 'text-green-700 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'}`}>
                      {isConfigured ? '✓ Actif' : '○ Nécessite config'}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`p-3 border rounded ${isConfigured ? 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800' : 'border-gray-200 dark:border-gray-700'}`}>
                <div className="flex items-start gap-2">
                  <div className="text-xl">🛒</div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">Création commandes Odoo</h4>
                    <p className="text-xs text-gray-800 dark:text-gray-300">Synchronisation automatique</p>
                    <p className={`text-xs mt-1 font-medium ${isConfigured ? 'text-green-700 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'}`}>
                      {isConfigured ? '✓ Actif' : '○ Nécessite config'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export const config = defineWidgetConfig({
  zone: "product.list.before",
})

export default OdooConfigurationWidget

