import { useState, useEffect } from "react"
import type { SettingConfig } from "@medusajs/admin-sdk"

/**
 * Page Settings Odoo - Accessible via Settings → Extensions → Odoo
 * Route: /app/settings/odoo
 */

const OdooSettingsPage = () => {
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

  if (isLoadingStatus) {
    return (
      <div className="py-8 px-6">
        <div className="flex items-center justify-center">
          <p className="text-gray-600">Chargement de la configuration Odoo...</p>
        </div>
      </div>
    )
  }

  const isConfigured = status?.configured
  const isConnected = status?.connected

  return (
    <div className="py-8 px-6 max-w-7xl">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold mb-2">Configuration Odoo</h1>
          <p className="text-gray-600">
            Gérez votre intégration Odoo et importez vos produits
          </p>
        </div>

        {/* Message de configuration si non configuré */}
        {!isConfigured && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 text-3xl">⚠️</div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">Module Odoo non configuré</h3>
                <p className="text-gray-700 mb-3">
                  Pour activer l'intégration Odoo, ajoutez les variables d'environnement suivantes :
                </p>
                <div className="bg-gray-900 text-white p-4 rounded font-mono text-xs overflow-x-auto">
                  <div className="space-y-1">
                    <div><span className="text-green-400">ODOO_URL</span>=https://votre-instance-odoo.com</div>
                    <div><span className="text-green-400">ODOO_DB_NAME</span>=nom_de_votre_base</div>
                    <div><span className="text-green-400">ODOO_USERNAME</span>=admin@example.com</div>
                    <div><span className="text-green-400">ODOO_API_KEY</span>=votre_api_key_ou_password</div>
                  </div>
                </div>
                <p className="text-gray-600 text-xs mt-3">
                  Une fois configuré, redémarrez l'application pour activer les fonctionnalités ci-dessous.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Statut de connexion */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Statut de la connexion</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              isConnected 
                ? "bg-green-100 text-green-800" 
                : "bg-red-100 text-red-800"
            }`}>
              {isConnected ? "✓ Connecté" : "○ Non connecté"}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600 mb-1">URL Odoo</p>
              <p className="font-medium break-all">{status?.url || "Non défini"}</p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">Base de données</p>
              <p className="font-medium">{status?.database || "Non défini"}</p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">Utilisateur</p>
              <p className="font-medium">{status?.username || "Non défini"}</p>
            </div>
          </div>
        </div>

        {/* Liste des produits Odoo */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-1">Produits Odoo disponibles</h2>
                <p className="text-gray-600 text-sm">
                  Sélectionnez les produits que vous souhaitez importer dans Medusa
                </p>
              </div>
              <button
                onClick={fetchProducts}
                disabled={isLoadingProducts || !isConnected}
                className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm transition-colors"
              >
                {isLoadingProducts ? "Chargement..." : "↻ Actualiser"}
              </button>
            </div>
          </div>

          {!isConnected ? (
            <div className="flex flex-col items-center justify-center p-12 bg-gray-50">
              <div className="text-6xl mb-4">🔌</div>
              <p className="text-gray-600 text-center">
                {!isConfigured 
                  ? "Configurez Odoo pour voir les produits disponibles" 
                  : "Connexion à Odoo impossible. Vérifiez vos identifiants."
                }
              </p>
            </div>
          ) : isLoadingProducts ? (
            <div className="flex items-center justify-center p-12">
              <p className="text-gray-600">Chargement des produits Odoo...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-gray-600">Aucun produit trouvé dans Odoo.</p>
            </div>
          ) : (
            <>
              <div className="p-6">
                <p className="text-sm text-gray-600 mb-4">
                  <strong>{selectedProducts.size}</strong> / {products.length} produits sélectionnés
                </p>
                
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        <th className="p-4">
                          <input
                            type="checkbox"
                            checked={allProductsSelected}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="w-4 h-4 text-gray-900 rounded border-gray-300 focus:ring-gray-900"
                          />
                        </th>
                        <th className="p-4">Nom</th>
                        <th className="p-4">SKU</th>
                        <th className="p-4">Prix</th>
                        <th className="p-4">Stock Odoo</th>
                        <th className="p-4">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {products.map((product) => (
                        <tr key={product.id} className="text-sm hover:bg-gray-50 transition-colors">
                          <td className="p-4">
                            <input
                              type="checkbox"
                              checked={selectedProducts.has(product.id)}
                              onChange={(e) => handleCheckboxChange(product.id, e.target.checked)}
                              className="w-4 h-4 text-gray-900 rounded border-gray-300 focus:ring-gray-900"
                            />
                          </td>
                          <td className="p-4 font-medium">{product.display_name}</td>
                          <td className="p-4 text-gray-600">{product.default_code || "N/A"}</td>
                          <td className="p-4">{product.list_price} {product.currency}</td>
                          <td className="p-4">{product.qty_available}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              product.synced 
                                ? "bg-green-100 text-green-800" 
                                : "bg-orange-100 text-orange-800"
                            }`}>
                              {product.synced ? "✓ Synchronisé" : "○ Non synchronisé"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={syncSelectedProducts}
                  disabled={isSyncing || selectedProducts.size === 0 || !isConnected}
                  className="w-full px-6 py-3 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
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
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">🎯 Fonctionnalités de l'intégration Odoo</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Import produits */}
            <div className={`p-4 border rounded-lg ${isConnected ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-start gap-3">
                <div className="text-2xl">📥</div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Import de produits</h3>
                  <p className="text-sm text-gray-600">
                    Importez manuellement les produits Odoo de votre choix dans Medusa (SKU, prix, stock, variantes)
                  </p>
                  <p className={`text-xs mt-2 font-medium ${isConnected ? 'text-green-700' : 'text-gray-500'}`}>
                    {isConnected ? '✓ Actif' : '○ Nécessite connexion'}
                  </p>
                </div>
              </div>
            </div>

            {/* Sync stock auto */}
            <div className={`p-4 border rounded-lg ${isConfigured ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-start gap-3">
                <div className="text-2xl">🔄</div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Synchronisation stock (Odoo → Medusa)</h3>
                  <p className="text-sm text-gray-600">
                    Mise à jour automatique toutes les 15 minutes pour les produits déjà importés
                  </p>
                  <p className={`text-xs mt-2 font-medium ${isConfigured ? 'text-green-700' : 'text-gray-500'}`}>
                    {isConfigured ? '✓ Actif' : '○ Nécessite configuration'}
                  </p>
                </div>
              </div>
            </div>

            {/* Sync stock bi-directionnel */}
            <div className={`p-4 border rounded-lg ${isConfigured ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-start gap-3">
                <div className="text-2xl">↔️</div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Synchronisation stock (Medusa → Odoo)</h3>
                  <p className="text-sm text-gray-600">
                    Les ventes Medusa mettent à jour le stock Odoo en temps réel
                  </p>
                  <p className={`text-xs mt-2 font-medium ${isConfigured ? 'text-green-700' : 'text-gray-500'}`}>
                    {isConfigured ? '✓ Actif' : '○ Nécessite configuration'}
                  </p>
                </div>
              </div>
            </div>

            {/* Sync commandes */}
            <div className={`p-4 border rounded-lg ${isConfigured ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-start gap-3">
                <div className="text-2xl">🛒</div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Création commandes Odoo</h3>
                  <p className="text-sm text-gray-600">
                    Chaque commande Medusa crée automatiquement un bon de commande dans Odoo
                  </p>
                  <p className={`text-xs mt-2 font-medium ${isConfigured ? 'text-green-700' : 'text-gray-500'}`}>
                    {isConfigured ? '✓ Actif' : '○ Nécessite configuration'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const config: SettingConfig = {
  card: {
    label: "Odoo",
    description: "Gérez l'intégration Odoo et importez vos produits",
  },
}

export default OdooSettingsPage

