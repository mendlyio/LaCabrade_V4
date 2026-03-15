import { HttpTypes } from "@medusajs/types"
import { Text } from "@medusajs/ui"

type OrderDetailsProps = {
  order: HttpTypes.StoreOrder
  showStatus?: boolean
}

const OrderDetails = ({ order, showStatus }: OrderDetailsProps) => {
  const formatStatus = (str: string) => {
    const formatted = str.split("_").join(" ")
    return formatted.slice(0, 1).toUpperCase() + formatted.slice(1)
  }

  const formatDate = (dateStr: string | Date) => {
    return new Date(dateStr).toLocaleDateString("fr-BE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="bg-gray-50 rounded-xl p-6 space-y-3">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <Text>
          Un e-mail de confirmation a été envoyé à{" "}
          <span
            className="font-semibold text-gray-900"
            data-testid="order-email"
          >
            {order.email}
          </span>
        </Text>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-gray-200">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Date de commande
          </p>
          <p className="text-sm font-medium text-gray-900" data-testid="order-date">
            {formatDate(order.created_at)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Numéro de commande
          </p>
          <p className="text-sm font-bold text-amber-600" data-testid="order-id">
            #{order.display_id}
          </p>
        </div>
      </div>

      {showStatus && (
        <div className="flex items-center gap-x-6 pt-3 border-t border-gray-200">
          <Text className="text-sm">
            Statut :{" "}
            <span className="text-gray-700 font-medium" data-testid="order-status">
            </span>
          </Text>
          <Text className="text-sm">
            Paiement :{" "}
            <span className="text-gray-700 font-medium" data-testid="order-payment-status">
            </span>
          </Text>
        </div>
      )}
    </div>
  )
}

export default OrderDetails
