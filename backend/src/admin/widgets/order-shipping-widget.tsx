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
  const shippingMethods = order?.shipping_methods || []
  const pickupLocation = order?.metadata?.pickup_location as { id?: string; name?: string; address?: string } | undefined

  if (shippingMethods.length === 0 && !pickupLocation) {
    return null
  }

  const method = shippingMethods[0]

  return (
    <Container className="divide-y divide-gray-200 dark:divide-gray-700 p-0">
      <div className="flex items-center gap-x-2 px-6 py-4">
        <TruckIcon className="text-gray-500 w-5 h-5" />
        <Heading level="h2" className="text-base-semi">Livraison</Heading>
      </div>
      <div className="px-6 py-4 flex flex-col gap-3">
        {method && (
          <div>
            <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Méthode</Text>
            <Text className="font-medium">{(method as any).name}</Text>
            {(method as any).amount !== undefined && (method as any).amount > 0 && (
              <Text className="text-xs text-gray-600 dark:text-gray-300">{(method as any).amount} €</Text>
            )}
          </div>
        )}
        {pickupLocation && (pickupLocation.name || pickupLocation.address) && (
          <div>
            <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Point de retrait</Text>
            <Text className="font-medium">{pickupLocation.name || "—"}</Text>
            {pickupLocation.address && (
              <Text className="text-sm text-gray-600 dark:text-gray-300">{pickupLocation.address}</Text>
            )}
          </div>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.before",
})

export default OrderShippingWidget
