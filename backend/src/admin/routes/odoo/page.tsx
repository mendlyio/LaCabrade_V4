import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Table, Checkbox, Badge, Text } from "@medusajs/ui"
import { useState, useEffect } from "react"

const OdooSettingsPage = () => {
  const [connectionStatus, setConnectionStatus] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  // Charger le statut de connexion
  useEffect(() => {
    fetchConnectionStatus()
  }, [])

  const fetchConnectionStatus = async () => {
    try {
      const response = await fetch("/admin/odoo/status", {
        credentials: "include",
      })
      const data = await response.json()
      setConnectionStatus(data)
    } catch (error) {
      console.error("Erreur statut:", error)
    }
  }

  // Charger les produits Odoo disponibles
  const fetchOdooProducts = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/admin/odoo/products", {
        credentials: "include",
      })
      const data = await response.json()
      setProducts(data.products || [])
    } catch (error) {
      console.error("Erreur produits:", error)
      alert("Erreur lors du chargement des produits Odoo")
    } finally {
      setIsLoading(false)
    }
  }

  // Synchroniser les produits sélectionnés
  const syncSelectedProducts = async () => {
    if (selectedProducts.size === 0) {
      alert("Veuillez sélectionner au moins un produit")
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
        alert(`✅ ${data.synced} produits synchronisés avec succès !`)
        setSelectedProducts(new Set())
      } else {
        alert("❌ Erreur lors de la synchronisation")
      }
    } catch (error) {
      console.error("Erreur sync:", error)
      alert("Erreur lors de la synchronisation")
    } finally {
      setIsSyncing(false)
    }
  }

  // Toggle sélection produit
  const toggleProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts)
    if (newSelected.has(productId)) {
      newSelected.delete(productId)
    } else {
      newSelected.add(productId)
    }
    setSelectedProducts(newSelected)
  }

  // Sélectionner tous
  const toggleAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set())
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)))
    }
  }

  if (!connectionStatus?.configured) {
    return (
      <Container className="p-8">
        <Heading level="h1" className="mb-4">
          Configuration Odoo
        </Heading>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <Text className="text-orange-800">
            ⚠️ Odoo n'est pas configuré. Veuillez ajouter les variables d'environnement :
          </Text>
          <ul className="mt-4 space-y-2 text-sm text-orange-700">
            <li>• ODOO_URL</li>
            <li>• ODOO_DB_NAME</li>
            <li>• ODOO_USERNAME</li>
            <li>• ODOO_API_KEY</li>
          </ul>
        </div>
      </Container>
    )
  }

  return (
    <Container className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Heading level="h1">Gestion Produits Odoo</Heading>
          <Badge color={connectionStatus.connected ? "green" : "red"}>
            {connectionStatus.connected ? "Connecté" : "Déconnecté"}
          </Badge>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-sm mb-6">
          <div>
            <Text className="text-gray-500">URL Odoo</Text>
            <Text className="font-medium">{connectionStatus.url}</Text>
          </div>
          <div>
            <Text className="text-gray-500">Base de données</Text>
            <Text className="font-medium">{connectionStatus.database}</Text>
          </div>
          <div>
            <Text className="text-gray-500">Utilisateur</Text>
            <Text className="font-medium">{connectionStatus.username}</Text>
          </div>
        </div>
      </div>

      <div className="mb-6 flex gap-4">
        <Button onClick={fetchOdooProducts} disabled={isLoading}>
          {isLoading ? "Chargement..." : "📋 Charger les produits Odoo"}
        </Button>
        
        {products.length > 0 && (
          <Button 
            onClick={syncSelectedProducts} 
            disabled={isSyncing || selectedProducts.size === 0}
            variant="primary"
          >
            {isSyncing 
              ? "Synchronisation..." 
              : `✅ Importer ${selectedProducts.size} produit(s)`}
          </Button>
        )}
      </div>

      {products.length > 0 && (
        <div className="bg-white border rounded-lg">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectedProducts.size === products.length}
                onCheckedChange={toggleAll}
              />
              <Text className="font-medium">
                {selectedProducts.size} / {products.length} produits sélectionnés
              </Text>
            </div>
          </div>

          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell className="w-12"></Table.HeaderCell>
                <Table.HeaderCell>Nom du produit</Table.HeaderCell>
                <Table.HeaderCell>SKU</Table.HeaderCell>
                <Table.HeaderCell>Prix</Table.HeaderCell>
                <Table.HeaderCell>Stock Odoo</Table.HeaderCell>
                <Table.HeaderCell>Statut</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {products.map((product) => (
                <Table.Row key={product.id}>
                  <Table.Cell>
                    <Checkbox
                      checked={selectedProducts.has(product.id)}
                      onCheckedChange={() => toggleProduct(product.id)}
                    />
                  </Table.Cell>
                  <Table.Cell className="font-medium">
                    {product.display_name}
                  </Table.Cell>
                  <Table.Cell>{product.default_code || "-"}</Table.Cell>
                  <Table.Cell>{product.list_price} €</Table.Cell>
                  <Table.Cell>{product.qty_available || 0}</Table.Cell>
                  <Table.Cell>
                    <Badge color={product.synced ? "green" : "gray"}>
                      {product.synced ? "Synchronisé" : "Non importé"}
                    </Badge>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <Text className="text-sm text-blue-800">
          <strong>ℹ️ Synchronisation du stock :</strong>
          <br />
          • Vente sur Medusa → Stock mis à jour automatiquement dans Odoo
          <br />
          • Vente sur Odoo → Configurer un webhook Odoo pointant vers : <code>/admin/odoo/webhook/stock</code>
        </Text>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Odoo ERP",
  icon: "CloudArrowUp",
})

export default OdooSettingsPage

