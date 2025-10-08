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
  const [total, setTotal] = useState<number>(0)
  const [limit, setLimit] = useState<number>(25)
  const [offset, setOffset] = useState<number>(0)
  const [search, setSearch] = useState<string>("")
  const [searchInput, setSearchInput] = useState<string>("")
  const [importProgress, setImportProgress] = useState<{
    show: boolean
    processed: number
    total: number
    created: number
    updated: number
    errors: number
    currentBatch: number
    totalBatches: number
  } | null>(null)

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
        fetchProducts({ offset: 0, limit, q: search })
      }
    } catch (error) {
      console.error("Erreur statut:", error)
    } finally {
      setIsLoadingStatus(false)
    }
  }

  const fetchProducts = async (params?: { offset?: number; limit?: number; q?: string }) => {
    setIsLoadingProducts(true)
    try {
      const off = params?.offset ?? offset
      const lim = params?.limit ?? limit
      const qParam = params?.q ?? search
      const qs = `/admin/odoo/products?offset=${off}&limit=${lim}${qParam ? `&q=${encodeURIComponent(qParam)}` : ""}`
      const response = await fetch(qs, {
        credentials: "include",
      })
      const data = await response.json()
      setProducts(data.products || [])
      setTotal(data.total || 0)
      setLimit(data.limit ?? lim)
      setOffset(data.offset ?? off)
      setSearch(data.q ?? qParam ?? "")
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

    const productCount = selectedProducts.size

    // Si peu de produits (< 50), utiliser l'ancienne méthode simple
    if (productCount < 50) {
      setIsSyncing(true)

      try {
        const response = await fetch("/admin/odoo/sync-selected", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productIds: Array.from(selectedProducts) }),
        })

        const data = await response.json()

        if (response.ok && (data.success !== false)) {
          const message = data.message || `${data.created || 0} produit(s) créé(s), ${data.updated || 0} mis à jour`
          alert(`✅ Importation réussie: ${message}`)
          setSelectedProducts(new Set())
          fetchProducts()
        } else {
          alert(`❌ ${data.message || data.error || "Erreur lors de l'importation des produits."}`)
        }
      } catch (error) {
        console.error("Erreur d'importation:", error)
        alert("❌ Erreur lors de l'importation des produits Odoo.")
      } finally {
        setIsSyncing(false)
      }
      return
    }

    // Pour beaucoup de produits, utiliser SSE avec progression
    setIsSyncing(true)
    setImportProgress({
      show: true,
      processed: 0,
      total: productCount,
      created: 0,
      updated: 0,
      errors: 0,
      currentBatch: 0,
      totalBatches: Math.ceil(productCount / 10),
    })

    try {
      const response = await fetch("/admin/odoo/sync-progress", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: Array.from(selectedProducts) }),
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la connexion au serveur")
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error("Impossible de lire la réponse du serveur")
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.substring(6))

              if (event.type === 'batch_start') {
                setImportProgress(prev => prev ? {
                  ...prev,
                  currentBatch: event.batchNum,
                } : null)
              } else if (event.type === 'batch_complete') {
                setImportProgress(prev => prev ? {
                  ...prev,
                  processed: event.processed,
                  created: prev.created + event.created,
                  updated: prev.updated + event.updated,
                  currentBatch: event.batchNum,
                } : null)
              } else if (event.type === 'batch_error') {
                setImportProgress(prev => prev ? {
                  ...prev,
                  processed: event.processed,
                  errors: prev.errors + 1,
                  currentBatch: event.batchNum,
                } : null)
              } else if (event.type === 'complete') {
                setImportProgress(prev => prev ? {
                  ...prev,
                  processed: event.total,
                  created: event.created,
                  updated: event.updated,
                  errors: event.errors,
                } : null)

                // Attendre 2 secondes avant de fermer la modal
                setTimeout(() => {
                  setImportProgress(null)
                  setSelectedProducts(new Set())
                  fetchProducts()
                  
                  if (event.errors > 0) {
                    alert(`⚠️ Import terminé avec des erreurs:\n${event.created} créés, ${event.updated} mis à jour, ${event.errors} erreurs`)
                  } else {
                    alert(`✅ Import terminé:\n${event.created} créés, ${event.updated} mis à jour`)
                  }
                }, 2000)
              } else if (event.type === 'error') {
                throw new Error(event.message)
              }
            } catch (parseError) {
              console.error("Erreur parsing SSE:", parseError)
            }
          }
        }
      }
    } catch (error) {
      console.error("Erreur d'importation:", error)
      alert("❌ Erreur lors de l'importation des produits Odoo.")
      setImportProgress(null)
    } finally {
      setIsSyncing(false)
    }
  }

  const resyncAll = async () => {
    if (!confirm("🔄 Re-synchroniser tous les produits déjà importés depuis Odoo ?\n\nCela mettra à jour les prix, descriptions, et autres données.\n\nCette opération peut prendre plusieurs minutes.")) {
      return
    }

    setIsSyncing(true)
    setImportProgress({
      show: true,
      processed: 0,
      total: 0,
      created: 0,
      updated: 0,
      errors: 0,
      currentBatch: 0,
      totalBatches: 0,
    })

    try {
      const response = await fetch("/admin/odoo/resync", {
        method: "POST",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la connexion au serveur")
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error("Impossible de lire la réponse du serveur")
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.substring(6))

              if (event.type === 'start') {
                setImportProgress(prev => prev ? {
                  ...prev,
                  total: event.total,
                  totalBatches: event.batches,
                } : null)
              } else if (event.type === 'batch_start') {
                setImportProgress(prev => prev ? {
                  ...prev,
                  currentBatch: event.batchNum,
                } : null)
              } else if (event.type === 'batch_complete') {
                setImportProgress(prev => prev ? {
                  ...prev,
                  processed: event.processed,
                  created: prev.created + event.created,
                  updated: prev.updated + event.updated,
                  currentBatch: event.batchNum,
                } : null)
              } else if (event.type === 'batch_error') {
                setImportProgress(prev => prev ? {
                  ...prev,
                  processed: event.processed,
                  errors: prev.errors + 1,
                  currentBatch: event.batchNum,
                } : null)
              } else if (event.type === 'complete') {
                setImportProgress(prev => prev ? {
                  ...prev,
                  processed: event.total,
                  created: event.created,
                  updated: event.updated,
                  errors: event.errors,
                } : null)

                // Attendre 2 secondes avant de fermer la modal
                setTimeout(() => {
                  setImportProgress(null)
                  fetchProducts()
                  
                  if (event.errors > 0) {
                    alert(`⚠️ Re-synchronisation terminée avec des erreurs:\n${event.updated} mis à jour, ${event.errors} erreurs`)
                  } else {
                    alert(`✅ Re-synchronisation terminée:\n${event.updated} produit(s) mis à jour`)
                  }
                }, 2000)
              } else if (event.type === 'error') {
                throw new Error(event.message)
              }
            } catch (parseError) {
              console.error("Erreur parsing SSE:", parseError)
            }
          }
        }
      }
    } catch (error) {
      console.error("Erreur re-synchronisation:", error)
      alert("❌ Erreur lors de la re-synchronisation")
      setImportProgress(null)
    } finally {
      setIsSyncing(false)
    }
  }

  const allProductsSelected = products.length > 0 && products.every((p) => selectedProducts.has(p.id))
  const isConfigured = status?.configured
  const isConnected = status?.connected
  const currentFrom = total === 0 ? 0 : offset + 1
  const currentTo = Math.min(offset + (products?.length || 0), total)
  const hasPrev = offset > 0
  const hasNext = offset + (products?.length || 0) < total

  if (isLoadingStatus) {
    return (
      <div className="p-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-gray-800 dark:text-gray-300">Chargement de la configuration Odoo...</p>
      </div>
    )
  }

  return (
    <>
      {/* Modal de progression pour import en masse */}
      {importProgress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">⏳</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Import en cours...
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Lot {importProgress.currentBatch} / {importProgress.totalBatches}
              </p>
            </div>

            {/* Barre de progression */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>{importProgress.processed} / {importProgress.total} produits</span>
                <span>{Math.round((importProgress.processed / importProgress.total) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-blue-600 h-3 transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${(importProgress.processed / importProgress.total) * 100}%` }}
                />
              </div>
            </div>

            {/* Statistiques */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {importProgress.created}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Créés</div>
              </div>
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {importProgress.updated}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Mis à jour</div>
              </div>
              <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {importProgress.errors}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Erreurs</div>
              </div>
            </div>

            <p className="text-xs text-center text-gray-500 dark:text-gray-500">
              ⚠️ Ne fermez pas cette page pendant l'import
            </p>
          </div>
        </div>
      )}

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
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Produits Odoo disponibles</h3>
                  <p className="text-xs text-gray-800 dark:text-gray-300 mt-1">Sélectionnez les produits que vous souhaitez importer dans Medusa</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setOffset(0)
                        fetchProducts({ offset: 0, limit, q: searchInput })
                      }
                    }}
                    placeholder="Rechercher par nom"
                    className="px-2 py-1 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  <button
                    onClick={() => {
                      setOffset(0)
                      fetchProducts({ offset: 0, limit, q: searchInput })
                    }}
                    disabled={isLoadingProducts || !isConnected}
                    className="px-2.5 py-1.5 bg-gray-900 text-white rounded hover:bg-gray-800 disabled:bg-gray-500 disabled:cursor-not-allowed text-xs"
                  >
                    Rechercher
                  </button>
                  <button
                    onClick={() => fetchProducts()}
                    disabled={isLoadingProducts || !isConnected}
                    className="px-3 py-1.5 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:bg-gray-500 disabled:cursor-not-allowed text-xs transition-colors"
                  >
                    {isLoadingProducts ? "Chargement..." : "↻ Actualiser"}
                  </button>
                </div>
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
                    <strong>{selectedProducts.size}</strong> sélection(s) — {currentFrom}-{currentTo} sur {total}
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
                          <th className="p-3">Image</th>
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
                            <td className="p-3">
                              {product.image_url ? (
                                <img 
                                  src={product.image_url} 
                                  alt={product.display_name}
                                  className="w-12 h-12 object-cover rounded border border-gray-200 dark:border-gray-700"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              ) : (
                                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 text-xs">
                                  📦
                                </div>
                              )}
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
                  <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const newOffset = Math.max(offset - limit, 0)
                          setOffset(newOffset)
                          fetchProducts({ offset: newOffset, limit, q: search })
                        }}
                        disabled={!hasPrev || isLoadingProducts}
                        className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-xs text-gray-900 dark:text-gray-100 disabled:opacity-50"
                      >
                        ◀ Précédent
                      </button>
                      <button
                        onClick={() => {
                          const newOffset = offset + limit
                          setOffset(newOffset)
                          fetchProducts({ offset: newOffset, limit, q: search })
                        }}
                        disabled={!hasNext || isLoadingProducts}
                        className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-xs text-gray-900 dark:text-gray-100 disabled:opacity-50"
                      >
                        Suivant ▶
                      </button>
                      <select
                        value={limit}
                        onChange={(e) => {
                          const newLimit = parseInt(e.target.value)
                          setLimit(newLimit)
                          setOffset(0)
                          fetchProducts({ offset: 0, limit: newLimit, q: search })
                        }}
                        className="px-2 py-1 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-gray-900 dark:text-gray-100"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                    <button
                      onClick={syncSelectedProducts}
                      disabled={isSyncing || selectedProducts.size === 0 || !isConnected}
                      className="w-full md:w-auto px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:bg-gray-500 disabled:cursor-not-allowed font-medium transition-colors text-sm"
                    >
                      {isSyncing 
                        ? `⏳ Importation de ${selectedProducts.size} produit(s)...` 
                        : `Importer ${selectedProducts.size} produit(s) sélectionné(s)`
                      }
                    </button>
                    <button
                      onClick={resyncAll}
                      disabled={isSyncing || !isConnected}
                      className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed font-medium transition-colors text-sm"
                    >
                      {isSyncing 
                        ? `⏳ Re-synchronisation...` 
                        : `🔄 Re-synchroniser tous les produits importés`
                      }
                    </button>
                  </div>
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
    </>
  )
}

export const config = defineWidgetConfig({
  zone: "product.list.before",
})

export default OdooConfigurationWidget

