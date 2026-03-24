import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text } from "@medusajs/ui"

const TruckIcon = (props: React.SVGAttributes<SVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M3.375 4.5C2.339 4.5 1.5 5.34 1.5 6.375V13.5h12V6.375c0-1.036-.84-1.875-1.875-1.875H3.375zM13.5 15h-12v2.625c0 1.035.84 1.875 1.875 1.875h.375a3 3 0 116 0h3a3 3 0 116 0h.375c1.035 0 1.875-.84 1.875-1.875V15z" />
    <path d="M8.25 19.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15.75 19.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    <path d="M19.5 19.5h-.75V4.875c0-.621-.504-1.125-1.125-1.125H18.75L8.25 9v10.5h11.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-.75V19.5z" />
  </svg>
)

const OrderShippingWidget = ({ data: order }: { data: any }) => {
  try {
    const shippingMethods = Array.isArray(order?.shipping_methods) ? order.shipping_methods : []
    const pickupLocation = order?.metadata?.pickup_location as { id?: string; name?: string; address?: string } | undefined
    const bpostPickup = order?.metadata?.bpost_pickup_point as Record<string, any> | undefined
    const shippingAddress = order?.shipping_address

    if (shippingMethods.length === 0 && !pickupLocation && !shippingAddress) {
      return null
    }

    const method = shippingMethods[0]

    // Point relais : soit retrait magasin (pickup_location), soit Bpost (bpost_pickup_point)
    const isPickup = !!(pickupLocation || bpostPickup)
    const pickupName = pickupLocation?.name || bpostPickup?.Name || bpostPickup?.name
    const pickupAddr = pickupLocation?.address || bpostPickup?.Address || bpostPickup?.address
    const pickupZip = bpostPickup?.ZipCode || bpostPickup?.PostalCode || bpostPickup?.zipCode || ""
    const pickupCity = bpostPickup?.City || bpostPickup?.city || ""

    const countryCode = (shippingAddress?.country_code || "").toUpperCase()

    return (
      <Container className="divide-y divide-gray-200 dark:divide-gray-700 p-0">
        <div className="flex items-center gap-x-2 px-6 py-4">
          <TruckIcon className="text-gray-500 w-5 h-5" />
          <Heading level="h2" className="text-base-semi">Livraison</Heading>
        </div>

        <div className="px-6 py-4 flex flex-col gap-4">

          {/* Méthode */}
          {method && (
            <div>
              <Text className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Méthode</Text>
              <div className="flex items-center gap-2">
                <Text className="font-medium">{(method as any).name}</Text>
                {(method as any).amount !== undefined && (method as any).amount > 0 && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                    {(method as any).amount} €
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Point relais Bpost */}
          {bpostPickup && (pickupName || pickupAddr) && (
            <div>
              <Text className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Point relais Bpost</Text>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 flex flex-col gap-0.5">
                {pickupName && <Text className="font-semibold text-sm text-amber-900">{pickupName}</Text>}
                {pickupAddr && <Text className="text-xs text-amber-700">{pickupAddr}</Text>}
                {(pickupZip || pickupCity) && (
                  <Text className="text-xs text-amber-700">{pickupZip} {pickupCity}</Text>
                )}
              </div>
            </div>
          )}

          {/* Point de retrait magasin */}
          {pickupLocation && (pickupLocation.name || pickupLocation.address) && (
            <div>
              <Text className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Point de retrait</Text>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 flex flex-col gap-0.5">
                {pickupLocation.name && <Text className="font-semibold text-sm text-amber-900">{pickupLocation.name}</Text>}
                {pickupLocation.address && <Text className="text-xs text-amber-700">{pickupLocation.address}</Text>}
              </div>
            </div>
          )}

          {/* Adresse de livraison domicile */}
          {shippingAddress && !isPickup && (
            <div>
              <Text className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Adresse de livraison</Text>
              <div className="flex flex-col gap-0.5">
                <Text className="font-semibold text-sm">
                  {shippingAddress.first_name} {shippingAddress.last_name}
                  {shippingAddress.company && <span className="font-normal text-gray-500"> — {shippingAddress.company}</span>}
                </Text>
                <Text className="text-sm text-gray-600">{shippingAddress.address_1}</Text>
                {shippingAddress.address_2 && (
                  <Text className="text-sm text-gray-600">{shippingAddress.address_2}</Text>
                )}
                <Text className="text-sm text-gray-600">
                  {shippingAddress.postal_code} {shippingAddress.city}
                  {shippingAddress.province && `, ${shippingAddress.province}`}
                  {countryCode && ` — ${countryCode}`}
                </Text>
                {shippingAddress.phone && (
                  <Text className="text-xs text-gray-500 mt-0.5">📞 {shippingAddress.phone}</Text>
                )}
              </div>
            </div>
          )}

          {/* Adresse de livraison pour point relais (destinataire) */}
          {shippingAddress && isPickup && (
            <div>
              <Text className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Destinataire</Text>
              <Text className="text-sm font-medium">
                {shippingAddress.first_name} {shippingAddress.last_name}
              </Text>
              {shippingAddress.phone && (
                <Text className="text-xs text-gray-500">📞 {shippingAddress.phone}</Text>
              )}
            </div>
          )}

        </div>
      </Container>
    )
  } catch {
    return null
  }
}

export const config = defineWidgetConfig({
  zone: "order.details.before",
})

export default OrderShippingWidget
