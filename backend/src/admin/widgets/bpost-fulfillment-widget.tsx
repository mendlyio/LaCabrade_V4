import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Text, clx } from "@medusajs/ui"
import { Truck } from "@medusajs/icons"

// Ce widget s'affiche sur la page de détail d'une commande
const BpostFulfillmentWidget = ({ 
  data: order 
}: { 
  data: any 
}) => {
  // Trouver les fulfillments Bpost
  const bpostFulfillments = (order.fulfillments || []).filter(
    (f: any) => f.provider_id === "bpost"
  )

  if (bpostFulfillments.length === 0) {
    return null
  }

  return (
    <Container className="divide-y divide-gray-200 dark:divide-gray-700 p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-x-2">
            <Truck className="text-gray-500" />
            <Heading level="h2" className="text-base-semi">Étiquettes Bpost</Heading>
        </div>
      </div>
      
      <div className="px-6 py-4 flex flex-col gap-4">
        {bpostFulfillments.map((fulfillment: any) => {
            const labelUrl = fulfillment.data?.label_url
            const trackingUrl = fulfillment.data?.public_tracking_url
            const trackingNumber = fulfillment.data?.trackingNumber || fulfillment.tracking_numbers?.[0]

            return (
                <div key={fulfillment.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <div className="flex flex-col">
                        <Text className="font-medium">Expédition #{fulfillment.id.slice(-4)}</Text>
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

