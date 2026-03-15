import { formatAmount } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { Heading, Text } from "@medusajs/ui"

type ShippingDetailsProps = {
  order: HttpTypes.StoreOrder
}

const ShippingDetails = ({ order }: ShippingDetailsProps) => {
  return (
    <div>
      <Heading level="h2" className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Livraison
      </Heading>
      <div className="space-y-4">
        <div data-testid="shipping-address-summary">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Adresse de livraison
          </p>
          <Text className="text-sm text-gray-900 font-medium">
            {order.shipping_address?.first_name}{" "}
            {order.shipping_address?.last_name}
          </Text>
          <Text className="text-sm text-gray-600">
            {order.shipping_address?.address_1}
            {order.shipping_address?.address_2 ? `, ${order.shipping_address.address_2}` : ""}
          </Text>
          <Text className="text-sm text-gray-600">
            {order.shipping_address?.postal_code}{" "}
            {order.shipping_address?.city}
          </Text>
          <Text className="text-sm text-gray-600">
            {order.shipping_address?.country_code?.toUpperCase()}
          </Text>
        </div>

        <div data-testid="shipping-contact-summary" className="pt-3 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Contact
          </p>
          {order.shipping_address?.phone && (
            <Text className="text-sm text-gray-600">{order.shipping_address.phone}</Text>
          )}
          <Text className="text-sm text-gray-600">{order.email}</Text>
        </div>

        <div data-testid="shipping-method-summary" className="pt-3 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Mode de livraison
          </p>
          <Text className="text-sm text-gray-600">
            {(order as any).shipping_methods?.[0]?.name ?? "Standard"}
            {order.shipping_methods?.[0]?.total != null && (
              <> ({formatAmount(
                order.shipping_methods[0].total,
                order.currency_code
              )})</>
            )}
          </Text>
        </div>
      </div>
    </div>
  )
}

export default ShippingDetails
