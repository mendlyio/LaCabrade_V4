"use client"

import { Heading, Text, clx } from "@medusajs/ui"
import { HttpTypes } from "@medusajs/types"

import PaymentButton from "../payment-button"
import LastChanceUpsell from "../last-chance-upsell"
import { useSearchParams } from "next/navigation"

const Review = ({
  cart,
  lastChanceProducts = [],
}: {
  cart: any
  lastChanceProducts?: HttpTypes.StoreProduct[]
}) => {
  const searchParams = useSearchParams()

  const isOpen = searchParams.get("step") === "review"

  const paidByGiftcard =
    cart?.gift_cards && cart?.gift_cards?.length > 0 && cart?.total === 0

  const previousStepsCompleted =
    cart.shipping_address &&
    cart.shipping_methods.length > 0 &&
    (cart.payment_collection || paidByGiftcard)

  return (
    <div className="bg-white">
      {/* Step header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            isOpen
              ? "bg-amber-600 text-white"
              : "bg-gray-100 text-gray-400"
          }`}>
            4
          </div>
          <Heading
            level="h2"
            className={clx("text-base font-bold", {
              "text-gray-900": isOpen,
              "text-gray-400": !isOpen,
            })}
          >
            Vérification et validation
          </Heading>
        </div>
      </div>

      {isOpen && previousStepsCompleted && (
        <div className="space-y-5">
          {/* Last chance — juste avant le bouton payer */}
          {lastChanceProducts.length > 0 && (
            <LastChanceUpsell
              products={lastChanceProducts}
              cartItems={cart.items}
              currencyCode={cart.currency_code}
            />
          )}

          {/* Message CGV */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center mt-0.5">
                <svg className="w-3.5 h-3.5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <Text className="text-sm text-gray-700 leading-relaxed">
                En cliquant sur <strong>&quot;Valider la commande&quot;</strong>, vous confirmez avoir lu et accepté nos{" "}
                <a href="#" className="text-amber-600 hover:text-amber-700 underline">Conditions Générales de Vente</a>,{" "}
                notre <a href="#" className="text-amber-600 hover:text-amber-700 underline">Politique de Retour</a> et{" "}
                notre <a href="#" className="text-amber-600 hover:text-amber-700 underline">Politique de Confidentialité</a>.
              </Text>
            </div>
          </div>

          {/* Bouton payer */}
          <PaymentButton cart={cart} data-testid="submit-order-button" />
        </div>
      )}
    </div>
  )
}

export default Review
