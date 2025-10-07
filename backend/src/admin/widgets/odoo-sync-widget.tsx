import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Text, Badge, Toaster, toast } from "@medusajs/ui"
import { useState, useEffect } from "react"

const OdooSyncWidget = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<any>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)

  // Charger le statut au montage du composant
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
      console.error("Erreur lors de la récupération du statut:", error)
      toast.error("Erreur lors de la récupération du statut Odoo")
    } finally {
      setIsLoadingStatus(false)
    }
  }

  const handleSync = async () => {
    setIsLoading(true)
    toast.info("Synchronisation en cours...")

    try {
      const response = await fetch("/admin/odoo/sync", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
      } else {
        toast.error(data.message || "Erreur lors de la synchronisation")
      }
    } catch (error) {
      console.error("Erreur:", error)
      toast.error("Erreur lors de la synchronisation des produits Odoo")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingStatus) {
    return (
      <Container className="p-6">
        <div className="flex items-center justify-center">
          <Text className="text-ui-fg-subtle">Chargement...</Text>
        </div>
      </Container>
    )
  }

  if (!status?.configured) {
    return (
      <Container className="p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Heading level="h2">Synchronisation Odoo</Heading>
            <Badge color="red">Non configuré</Badge>
          </div>
          <Text className="text-ui-fg-subtle">
            Le module Odoo n'est pas configuré. Veuillez ajouter les variables d'environnement suivantes :
          </Text>
          <ul className="list-disc list-inside text-sm text-ui-fg-subtle space-y-1">
            <li>ODOO_URL</li>
            <li>ODOO_DB_NAME</li>
            <li>ODOO_USERNAME</li>
            <li>ODOO_API_KEY</li>
          </ul>
        </div>
      </Container>
    )
  }

  return (
    <>
      <Toaster />
      <Container className="p-6">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <Heading level="h2">Synchronisation Odoo</Heading>
            <Badge color={status.connected ? "green" : "orange"}>
              {status.connected ? "Connecté" : "Déconnecté"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-4 text-sm">
            <div className="flex justify-between">
              <Text className="text-ui-fg-subtle">URL Odoo:</Text>
              <Text className="font-medium">{status.url || "Non défini"}</Text>
            </div>
            <div className="flex justify-between">
              <Text className="text-ui-fg-subtle">Base de données:</Text>
              <Text className="font-medium">{status.database || "Non défini"}</Text>
            </div>
            <div className="flex justify-between">
              <Text className="text-ui-fg-subtle">Utilisateur:</Text>
              <Text className="font-medium">{status.username || "Non défini"}</Text>
            </div>
          </div>

          <div className="border-t pt-4">
            <Text className="text-ui-fg-subtle text-sm mb-4">
              Synchroniser manuellement les produits depuis Odoo vers Medusa.
              <br />
              <span className="text-xs">
                Note: La synchronisation automatique s'exécute tous les jours à minuit.
              </span>
            </Text>
            
            <Button
              onClick={handleSync}
              disabled={isLoading || !status.connected}
              className="w-full"
            >
              {isLoading ? "Synchronisation en cours..." : "Synchroniser maintenant"}
            </Button>
          </div>

          <div className="text-xs text-ui-fg-subtle bg-ui-bg-subtle p-3 rounded">
            <strong>💡 Astuce:</strong> La synchronisation peut prendre plusieurs minutes 
            selon le nombre de produits. Vous pouvez suivre la progression dans les logs.
          </div>
        </div>
      </Container>
    </>
  )
}

export const config = defineWidgetConfig({
  zone: "product.list.before",
})

export default OdooSyncWidget

