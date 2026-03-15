import { Heading, Text } from "@medusajs/ui"
import { cookies } from "next/headers"

import CartTotals from "@modules/common/components/cart-totals"
import PurchaseTracker from "@modules/common/components/tracking/purchase-tracker"
import Help from "@modules/order/components/help"
import Items from "@modules/order/components/items"
import OnboardingCta from "@modules/order/components/onboarding-cta"
import OrderDetails from "@modules/order/components/order-details"
import ShippingDetails from "@modules/order/components/shipping-details"
import PaymentDetails from "@modules/order/components/payment-details"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type OrderCompletedTemplateProps = {
  order: HttpTypes.StoreOrder
}

export default async function OrderCompletedTemplate({
  order,
}: OrderCompletedTemplateProps) {
  const cookieStore = await cookies()
  const isOnboarding = cookieStore.get("_medusa_onboarding")?.value === "true"

  return (
    <div className="py-8 sm:py-12 min-h-[calc(100vh-64px)] bg-gray-50">
      <PurchaseTracker order={order} />
      <div className="content-container flex flex-col justify-center items-center max-w-3xl w-full mx-auto px-4">
        {isOnboarding && <OnboardingCta orderId={order.id} />}
        <div
          className="flex flex-col w-full"
          data-testid="order-complete-container"
        >
          {/* Hero section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 text-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <Heading
              level="h1"
              className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3"
            >
              Merci pour votre commande !
            </Heading>
            <Text className="text-gray-600 text-base sm:text-lg max-w-md mx-auto">
              Votre commande a été enregistrée avec succès. Vous recevrez bientôt un e-mail de confirmation.
            </Text>
          </div>

          {/* Détails de commande */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
            <OrderDetails order={order} />
          </div>

          {/* Récapitulatif des articles */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
            <Heading level="h2" className="text-lg font-bold text-gray-900 mb-4">
              Récapitulatif de la commande
            </Heading>
            <Items items={order.items} />
            <div className="mt-6 pt-4 border-t border-gray-100">
              <CartTotals totals={order as any} />
            </div>
          </div>

          {/* Livraison & Paiement */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <ShippingDetails order={order} />
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <PaymentDetails order={order} />
            </div>
          </div>

          {/* Prochaines étapes */}
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6 sm:p-8 mb-6">
            <Heading level="h2" className="text-lg font-bold text-amber-900 mb-4">
              Et maintenant ?
            </Heading>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-amber-700 text-xs font-bold">1</span>
                </div>
                <Text className="text-sm text-amber-800">
                  <strong>Confirmation par e-mail</strong> — Vous allez recevoir un e-mail récapitulatif à {order.email}.
                </Text>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-amber-700 text-xs font-bold">2</span>
                </div>
                <Text className="text-sm text-amber-800">
                  <strong>Préparation</strong> — Nous préparons votre colis avec soin dans nos locaux.
                </Text>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-amber-700 text-xs font-bold">3</span>
                </div>
                <Text className="text-sm text-amber-800">
                  <strong>Expédition</strong> — Un e-mail de suivi vous sera envoyé dès l'expédition.
                </Text>
              </div>
            </div>
          </div>

          {/* Help + CTA */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
            <Help />
            <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
              <LocalizedClientLink
                href="/store"
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-center text-sm"
              >
                Continuer mes achats
              </LocalizedClientLink>
              <LocalizedClientLink
                href="/account/orders"
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors text-center text-sm"
              >
                Voir mes commandes
              </LocalizedClientLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
