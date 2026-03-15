import { Container, Heading, Text } from "@medusajs/ui"

import { isStripe, paymentInfoMap } from "@lib/constants"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type PaymentDetailsProps = {
  order: HttpTypes.StoreOrder
}

const PaymentDetails = ({ order }: PaymentDetailsProps) => {
  const payment = order.payment_collections?.[0]?.payments?.[0]
  const paymentInfo = payment ? paymentInfoMap[payment.provider_id] : null

  return (
    <div>
      <Heading level="h2" className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        Paiement
      </Heading>
      <div className="space-y-4">
        {payment ? (
          <>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Moyen de paiement
              </p>
              <div className="flex items-center gap-2">
                <Container className="flex items-center h-7 w-fit p-2 bg-gray-100 border border-gray-200 rounded">
                  {paymentInfo?.icon ?? null}
                </Container>
                <Text
                  className="text-sm font-medium text-gray-900"
                  data-testid="payment-method"
                >
                  {paymentInfo?.title ?? payment.provider_id}
                </Text>
              </div>
            </div>
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Détails
              </p>
              <Text className="text-sm text-gray-600" data-testid="payment-amount">
                {isStripe(payment.provider_id) && payment.data?.card_last4
                  ? `Carte se terminant par ${payment.data.card_last4}`
                  : `${convertToLocale({
                      amount: payment.amount,
                      currency_code: order.currency_code,
                    })} payé le ${new Date(
                      payment.created_at ?? ""
                    ).toLocaleDateString("fr-BE", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`}
              </Text>
            </div>
          </>
        ) : (
          <Text className="text-sm text-gray-500">Aucune information de paiement disponible.</Text>
        )}
      </div>
    </div>
  )
}

export default PaymentDetails
