"use client"

import { useState } from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Text } from "@medusajs/ui"

const LabelIcon = (props: React.SVGAttributes<SVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    {...props}
  >
    <path
      fillRule="evenodd"
      d="M5.25 2.25a3 3 0 00-3 3v4.318a3 3 0 00.879 2.121l9.58 9.581c.92.92 2.409.92 3.328 0l5.318-5.318a2.25 2.25 0 000-3.182l-9.58-9.58A3 3 0 0014.682 2.25H5.25zM11.25 8.25a1.125 1.125 0 11-2.25 0 1.125 1.125 0 012.25 0z"
      clipRule="evenodd"
    />
  </svg>
)

const BpostFulfillmentWidget = ({ data: order }: { data: any }) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [metadataLabel, setMetadataLabel] = useState<string | null>(
    (order?.metadata as any)?.bpost_label_url || null
  )

  // Commande avec livraison Bpost (méthode de livraison ou point relais)
  const hasBpostShipping =
    (order?.shipping_methods || []).some(
      (m: any) =>
        (m?.shipping_option?.provider_id || m?.provider_id || "")
          .toString()
          .toLowerCase()
          .includes("bpost")
    ) ||
    (order?.shipping_methods || []).some(
      (m: any) => (m?.name || "").toLowerCase().includes("bpost")
    ) ||
    !!(order?.metadata as any)?.bpost_pickup_point

  // Fulfillments Bpost (provider_id peut être "bpost" ou "bpost_xxx")
  const bpostFulfillments = (order?.fulfillments || []).filter((f: any) =>
    (f.provider_id || "").toString().toLowerCase().includes("bpost")
  )

  // Étiquette déjà dans les métadonnées (créée via API admin)
  const labelFromMetadata = metadataLabel || (order?.metadata as any)?.bpost_label_url
  const trackingFromMetadata = (order?.metadata as any)?.bpost_tracking

  const hasLabel =
    bpostFulfillments.some((f: any) => f.data?.label_url) ||
    !!labelFromMetadata

  const hasAnyBpost = hasBpostShipping || bpostFulfillments.length > 0 || !!labelFromMetadata

  if (!hasAnyBpost) {
    return null
  }

  const handleGenerateLabel = async () => {
    if (!order?.id) return
    setIsGenerating(true)
    setError(null)
    try {
      const res = await fetch("/admin/bpost/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ order_id: order.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.message || data?.error || "Erreur lors de la génération")
      }
      if (data?.shipment?.labelUrl) {
        setMetadataLabel(data.shipment.labelUrl)
      }
      if (data?.order?.metadata?.bpost_label_url) {
        setMetadataLabel(data.order.metadata.bpost_label_url)
      }
      // Rafraîchir la page pour mettre à jour les données
      window.location.reload()
    } catch (e: any) {
      setError(e?.message || "Erreur inconnue")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Container className="divide-y divide-gray-200 dark:divide-gray-700 p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-x-2">
          <LabelIcon className="text-gray-500 w-5 h-5" />
          <Heading level="h2" className="text-base-semi">
            Étiquettes Bpost
          </Heading>
        </div>
      </div>

      <div className="px-6 py-4 flex flex-col gap-4">
        {/* Bouton Générer l'étiquette si pas encore d'étiquette */}
        {!hasLabel && hasBpostShipping && (
          <div className="flex flex-col gap-2">
            <Button
              variant="primary"
              size="base"
              onClick={handleGenerateLabel}
              disabled={isGenerating}
            >
              {isGenerating ? "Génération en cours..." : "Générer l'étiquette Bpost"}
            </Button>
            {error && (
              <Text className="text-red-600 text-sm">{error}</Text>
            )}
          </div>
        )}

        {/* Étiquette depuis métadonnées (créée via API) */}
        {labelFromMetadata && (
          <div className="flex items-center justify-between border border-gray-200 rounded-lg p-3 bg-gray-50">
            <div className="flex flex-col">
              <Text className="font-medium">Expédition Bpost</Text>
              <Text className="text-ui-fg-subtle text-small-regular">
                Suivi: {trackingFromMetadata || "Non disponible"}
              </Text>
            </div>
            <div className="flex gap-2">
              {trackingFromMetadata && (
                <a
                  href={`https://track.bpost.cloud/btr/web/#/search?itemCode=${trackingFromMetadata}&lang=fr`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="secondary" size="small">
                    Suivre
                  </Button>
                </a>
              )}
              <a href={labelFromMetadata} target="_blank" rel="noreferrer">
                <Button variant="primary" size="small">
                  Télécharger l'étiquette
                </Button>
              </a>
            </div>
          </div>
        )}

        {/* Fulfillments Bpost */}
        {bpostFulfillments.map((fulfillment: any) => {
          const labelUrl = fulfillment.data?.label_url
          const trackingUrl = fulfillment.data?.public_tracking_url
          const trackingNumber =
            fulfillment.data?.trackingNumber || fulfillment.tracking_numbers?.[0]

          return (
            <div
              key={fulfillment.id}
              className="flex items-center justify-between border border-gray-200 rounded-lg p-3 bg-gray-50"
            >
              <div className="flex flex-col">
                <Text className="font-medium">
                  Expédition #{fulfillment.id.slice(-4)}
                </Text>
                <Text className="text-ui-fg-subtle text-small-regular">
                  Suivi: {trackingNumber || "Non disponible"}
                </Text>
              </div>
              <div className="flex gap-2">
                {trackingUrl && (
                  <a href={trackingUrl} target="_blank" rel="noreferrer">
                    <Button variant="secondary" size="small">
                      Suivre
                    </Button>
                  </a>
                )}
                {labelUrl ? (
                  <a href={labelUrl} target="_blank" rel="noreferrer">
                    <Button variant="primary" size="small">
                      Télécharger l'étiquette
                    </Button>
                  </a>
                ) : (
                  <Button disabled size="small" variant="secondary">
                    Pas d'étiquette
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.after",
})

export default BpostFulfillmentWidget
