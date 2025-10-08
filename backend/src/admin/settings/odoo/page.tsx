import type { SettingConfig } from "@medusajs/admin-sdk"
import { useState, useEffect } from "react"

/**
 * Page Settings Odoo - Accessible via Settings → Extensions → Odoo
 * Permet de configurer Odoo et d'importer les produits sélectionnés
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
  const someProductsSelected = selectedProducts.size > 0 && selectedProducts.size < products.length

  if (isLoadingStatus) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-ui-fg-subtle">Chargement de la configuration Odoo...</p>
      </div>
    )
  }

  if (!status?.configured) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Configuration Odoo</h1>
          <p className="text-ui-fg-subtle">
            Configurez votre intégration Odoo pour synchroniser vos produits et commandes
          </p>
        </div>

        <div className="bg-ui-bg-component p-6 rounded-lg border border-ui-border-base">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-red-600 text-xl">⚠️</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium mb-2">Module Odoo non configuré</h3>
              <p className="text-ui-fg-subtle mb-4">
                Pour activer l'intégration Odoo, ajoutez les variables d'environnement suivantes à votre application :
              </p>
              <div className="bg-ui-bg-base p-4 rounded border border-ui-border-base font-mono text-sm">
                <div className="space-y-2">
                  <div><span className="text-blue-600">ODOO_URL</span>=https://votre-instance-odoo.com</div>
                  <div><span className="text-blue-600">ODOO_DB_NAME</span>=nom_de_votre_base</div>
                  <div><span className="text-blue-600">ODOO_USERNAME</span>=admin@example.com</div>
                  <div><span className="text-blue-600">ODOO_API_KEY</span>=votre_api_key_ou_password</div>
                </div>
              </div>
              <p className="text-ui-fg-subtle text-sm mt-4">
                Une fois les variables configurées, redémarrez l'application pour activer le module Odoo.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Configuration Odoo</h1>
        <p className="text-ui-fg-subtle">
          Gérez votre intégration Odoo et importez vos produits
        </p>
      </div>

      {/* Statut de connexion */}
      <div className="bg-ui-bg-component p-6 rounded-lg border border-ui-border-base">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Statut de la connexion</h2>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            status.connected 
              ? "bg-green-100 text-green-800" 
              : "bg-orange-100 text-orange-800"
          }`}>
            {status.connected ? "✓ Connecté" : "○ Déconnecté"}
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-ui-fg-subtle mb-1">URL Odoo</p>
            <p className="font-medium">{status.url || "Non défini"}</p>
          </div>
          <div>
            <p className="text-ui-fg-subtle mb-1">Base de données</p>
            <p className="font-medium">{status.database || "Non défini"}</p>
          </div>
          <div>
            <p className="text-ui-fg-subtle mb-1">Utilisateur</p>
            <p className="font-medium">{status.username || "Non défini"}</p>
          </div>
        </div>
      </div>

      {/* Liste des produits Odoo */}
      <div className="bg-ui-bg-component rounded-lg border border-ui-border-base">
        <div className="p-6 border-b border-ui-border-base">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium mb-1">Produits Odoo disponibles</h2>
              <p className="text-ui-fg-subtle text-sm">
                Sélectionnez les produits que vous souhaitez importer dans Medusa
              </p>
            </div>
            <button
              onClick={fetchProducts}
              disabled={isLoadingProducts || !status.connected}
              className="px-4 py-2 bg-ui-button-neutral text-ui-fg-on-color rounded-md hover:bg-ui-button-neutral-hover disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isLoadingProducts ? "Chargement..." : "↻ Actualiser"}
            </button>
          </div>
        </div>

        {isLoadingProducts ? (
          <div className="flex items-center justify-center p-12">
            <p className="text-ui-fg-subtle">Chargement des produits Odoo...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex items-center justify-center p-12">
            <p className="text-ui-fg-subtle">Aucun produit trouvé dans Odoo.</p>
          </div>
        ) : (
          <>
            <div className="p-6">
              <p className="text-sm text-ui-fg-subtle mb-4">
                {selectedProducts.size} / {products.length} produits sélectionnés
              </p>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-ui-border-base">
                    <tr className="text-left text-xs font-medium text-ui-fg-subtle uppercase tracking-wider">
                      <th className="pb-3 pr-4">
                        <input
                          type="checkbox"
                          checked={allProductsSelected}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="form-checkbox h-4 w-4 text-ui-button-neutral rounded"
                        />
                      </th>
                      <th className="pb-3 pr-4">Nom</th>
                      <th className="pb-3 pr-4">SKU</th>
                      <th className="pb-3 pr-4">Prix</th>
                      <th className="pb-3 pr-4">Stock Odoo</th>
                      <th className="pb-3">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ui-border-base">
                    {products.map((product) => (
                      <tr key={product.id} className="text-sm">
                        <td className="py-4 pr-4">
                          <input
                            type="checkbox"
                            checked={selectedProducts.has(product.id)}
                            onChange={(e) => handleCheckboxChange(product.id, e.target.checked)}
                            className="form-checkbox h-4 w-4 text-ui-button-neutral rounded"
                          />
                        </td>
                        <td className="py-4 pr-4 font-medium">{product.display_name}</td>
                        <td className="py-4 pr-4 text-ui-fg-subtle">{product.default_code || "N/A"}</td>
                        <td className="py-4 pr-4">{product.list_price} {product.currency}</td>
                        <td className="py-4 pr-4">{product.qty_available}</td>
                        <td className="py-4">
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

            <div className="p-6 border-t border-ui-border-base bg-ui-bg-base">
              <button
                onClick={syncSelectedProducts}
                disabled={isSyncing || selectedProducts.size === 0 || !status.connected}
                className="w-full px-6 py-3 bg-ui-button-neutral text-ui-fg-on-color rounded-md hover:bg-ui-button-neutral-hover disabled:opacity-50 disabled:cursor-not-allowed font-medium"
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

      {/* Informations de synchronisation */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">ℹ️ Synchronisation automatique</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Le stock Medusa est mis à jour depuis Odoo <strong>toutes les 15 minutes</strong></li>
          <li>• Les ventes Medusa mettent à jour le stock dans Odoo <strong>en temps réel</strong></li>
          <li>• Les commandes Medusa sont créées dans Odoo <strong>automatiquement</strong></li>
        </ul>
      </div>
    </div>
  )
}

export const config: SettingConfig = {
  card: {
    label: "Odoo",
    description: "Gérez l'intégration Odoo et importez vos produits",
    icon: "🔗", // Vous pouvez utiliser un composant d'icône ici si disponible
  },
}

export default OdooSettingsPage

