"use client"

import { Heading, Text, clx } from "@medusajs/ui"
import { HttpTypes } from "@medusajs/types"
import { useEffect, useRef, useState } from "react"

import PaymentButton from "../payment-button"
import LastChanceUpsell from "../last-chance-upsell"
import { useSearchParams } from "next/navigation"
import { placeOrder } from "@lib/data/cart"

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000

const Review = ({
  cart,
  lastChanceProducts = [],
}: {
  cart: any
  lastChanceProducts?: HttpTypes.StoreProduct[]
}) => {
  const searchParams = useSearchParams()
  const hasHandledReturn = useRef(false)
  const retryCount = useRef(0)
  const [redirecting, setRedirecting] = useState(false)
  const [redirectError, setRedirectError] = useState<string | null>(null)

  const isOpen = searchParams.get("step") === "review"

  useEffect(() => {
    if (hasHandledReturn.current) return
    const redirectStatus = searchParams.get("redirect_status")
    const paymentIntent = searchParams.get("payment_intent")

    if (redirectStatus === "failed") {
      setRedirectError("Le paiement a échoué. Veuillez réessayer avec un autre moyen de paiement.")
      return
    }

    if ((redirectStatus === "succeeded" || redirectStatus === "processing") && paymentIntent) {
      hasHandledReturn.current = true
      setRedirecting(true)
      setRedirectError(null)

      const attemptPlaceOrder = () => {
        placeOrder()
          .then(() => {
            // redirect() inside placeOrder will navigate away
          })
          .catch((err) => {
            if (err?.digest?.includes?.("NEXT_REDIRECT")) {
              return
            }

            if (retryCount.current < MAX_RETRIES) {
              retryCount.current++
              setTimeout(attemptPlaceOrder, RETRY_DELAY_MS)
              return
            }

            hasHandledReturn.current = false
            setRedirecting(false)
            setRedirectError(
              err?.message ?? "Erreur lors de la finalisation. Veuillez réessayer."
            )
          })
      }

      attemptPlaceOrder()
    }
  }, [searchParams])

  const hasGiftCardPromotion = (cart?.promotions || []).some(
    (p: any) => p?.code && /^LC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(p.code)
  )
  const paidByGiftcard =
    hasGiftCardPromotion && cart?.total !== undefined && cart?.total !== null && cart.total === 0

  const previousStepsCompleted =
    cart.shipping_address &&
    cart.shipping_methods.length > 0 &&
    (cart.payment_collection || paidByGiftcard)

  return (
    <div className="bg-white">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            isOpen
              ? "bg-amber-600 text-white"
              : "bg-gray-100 text-gray-400"
          }`}>
            5
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

      {redirecting && (
        <div className="flex items-center justify-center gap-3 py-8">
          <div className="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-amber-700 font-medium">
            Paiement validé, finalisation de votre commande en cours...
          </p>
        </div>
      )}

      {redirectError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <p className="text-sm text-red-700 font-medium">{redirectError}</p>
        </div>
      )}

      {isOpen && previousStepsCompleted && !redirecting && (
        <div className="space-y-5">
          {lastChanceProducts.length > 0 && (
            <LastChanceUpsell
              products={lastChanceProducts}
              cartItems={cart.items}
              currencyCode={cart.currency_code}
            />
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center mt-0.5">
                <svg className="w-3.5 h-3.5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <Text className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                En cliquant sur <strong>&quot;Valider la commande&quot;</strong>, vous confirmez avoir lu et accepté nos{" "}
                <a href="/conditions-generales-de-vente" target="_blank" className="text-amber-600 hover:text-amber-700 underline">Conditions Générales de Vente</a>,{" "}
                notre <a href="/politique-de-retour" target="_blank" className="text-amber-600 hover:text-amber-700 underline">Politique de Retour</a> et{" "}
                notre <a href="/politique-de-confidentialite" target="_blank" className="text-amber-600 hover:text-amber-700 underline">Politique de Confidentialité</a>.
              </Text>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <p className="text-xs text-green-700">
                <strong>Paiement 100% sécurisé</strong> — Vos données sont protégées par un chiffrement SSL de bout en bout.
              </p>
            </div>
          </div>

          <PaymentButton cart={cart} data-testid="submit-order-button" />
        </div>
      )}
    </div>
  )
}

export default Review
