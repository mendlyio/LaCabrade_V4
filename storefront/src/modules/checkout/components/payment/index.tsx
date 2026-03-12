"use client"

import { useCallback, useContext, useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { RadioGroup } from "@headlessui/react"
import ErrorMessage from "@modules/checkout/components/error-message"
import { CheckCircleSolid, CreditCard } from "@medusajs/icons"
import { Button, Container, Heading, Text, clx } from "@medusajs/ui"
import { PaymentElement } from "@stripe/react-stripe-js"

import PaymentContainer from "@modules/checkout/components/payment-container"
import { isStripe as isStripeFunc, paymentInfoMap } from "@lib/constants"
import { StripeContext } from "@modules/checkout/components/payment-wrapper"
import { initiatePaymentSession } from "@lib/data/cart"

const Payment = ({
  cart,
  availablePaymentMethods,
}: {
  cart: any
  availablePaymentMethods: any[]
}) => {
  const activeSession = cart.payment_collection?.payment_sessions?.find(
    (paymentSession: any) => paymentSession.status === "pending"
  )

  const [isLoading, setIsLoading] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentElementReady, setPaymentElementReady] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    activeSession?.provider_id ?? ""
  )

  // Réinitialiser paymentElementReady quand la session change (nouveau Payment Element)
  useEffect(() => {
    setPaymentElementReady(false)
  }, [activeSession?.id])

  // Synchroniser la sélection quand la session du panier change (ex: retour arrière, refresh)
  // Ne pas écraser pendant un changement en cours (isSwitching)
  useEffect(() => {
    if (!isSwitching && activeSession?.provider_id && activeSession.provider_id !== selectedPaymentMethod) {
      setSelectedPaymentMethod(activeSession.provider_id)
    }
  }, [activeSession?.provider_id, isSwitching, selectedPaymentMethod])

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "payment"

  const isStripe = isStripeFunc(activeSession?.provider_id)
  const stripeReady = useContext(StripeContext)

  const paidByGiftcard =
    cart?.gift_cards && cart?.gift_cards?.length > 0 && cart?.total === 0

  const paymentReady =
    (activeSession && cart?.shipping_methods.length !== 0) || paidByGiftcard

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams)
      params.set(name, value)

      return params.toString()
    },
    [searchParams]
  )

  const handleEdit = () => {
    router.push(pathname + "?" + createQueryString("step", "payment"), {
      scroll: false,
    })
  }

  const handlePaymentMethodChange = useCallback(
    async (newProviderId: string) => {
      if (newProviderId === activeSession?.provider_id) {
        setSelectedPaymentMethod(newProviderId)
        return
      }
      setError(null)
      setIsSwitching(true)
      const previousProviderId = activeSession?.provider_id ?? ""
      setSelectedPaymentMethod(newProviderId)
      try {
        await initiatePaymentSession(cart, { provider_id: newProviderId })
        await router.refresh()
      } catch (err: any) {
        setError(err?.message ?? "Impossible de changer de moyen de paiement. Réessayez.")
        setSelectedPaymentMethod(previousProviderId)
      } finally {
        setIsSwitching(false)
      }
    },
    [cart, activeSession?.provider_id, router]
  )

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const needNewSession = !activeSession || activeSession.provider_id !== selectedPaymentMethod

      if (needNewSession) {
        await initiatePaymentSession(cart, {
          provider_id: selectedPaymentMethod,
        })
        router.refresh()
      }

      return router.push(
        pathname + "?" + createQueryString("step", "review"),
        { scroll: false }
      )
    } catch (err: any) {
      setError(err?.message ?? "Une erreur est survenue. Réessayez.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setError(null)
  }, [isOpen])

  return (
    <div className="bg-white">
      {/* Step header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            !isOpen && paymentReady
              ? "bg-green-100 text-green-600"
              : isOpen
                ? "bg-amber-600 text-white"
                : "bg-gray-100 text-gray-400"
          }`}>
            {!isOpen && paymentReady ? (
              <CheckCircleSolid className="w-5 h-5" />
            ) : (
              "4"
            )}
          </div>
          <div>
            <Heading
              level="h2"
              className={clx("text-base font-bold", {
                "text-gray-900": isOpen || paymentReady,
                "text-gray-400": !isOpen && !paymentReady,
              })}
            >
              Paiement
            </Heading>
            {!isOpen && paymentReady && (
              <p className="text-xs text-gray-500 mt-0.5">Étape complétée</p>
            )}
          </div>
        </div>
        {!isOpen && paymentReady && (
          <button
            onClick={handleEdit}
            className="text-sm text-amber-600 hover:text-amber-700 font-medium transition-colors"
            data-testid="edit-payment-button"
          >
            Modifier
          </button>
        )}
      </div>

      <div>
        <div className={isOpen ? "block" : "hidden"}>
          {!paidByGiftcard && availablePaymentMethods?.length && (
            <>
              <RadioGroup
                value={selectedPaymentMethod}
                onChange={handlePaymentMethodChange}
              >
                <div className="space-y-3">
                  {availablePaymentMethods
                    .sort((a, b) => {
                      return (a.id ?? a.provider_id ?? "") > (b.id ?? b.provider_id ?? "") ? 1 : -1
                    })
                    .map((paymentMethod) => {
                      return (
                        <PaymentContainer
                          paymentInfoMap={paymentInfoMap}
                          paymentProviderId={paymentMethod.id}
                          key={paymentMethod.id}
                          selectedPaymentOptionId={selectedPaymentMethod}
                          disabled={isSwitching}
                        />
                      )
                    })}
                </div>
              </RadioGroup>

              {isStripe && stripeReady && (
                <div className="mt-5 transition-all duration-150 ease-in-out">
                  <PaymentElement
                    options={{
                      layout: "tabs",
                      wallets: { applePay: "auto", googlePay: "auto" },
                    }}
                    onReady={() => setPaymentElementReady(true)}
                    onChange={(e) => setError(e.error?.message || null)}
                  />
                </div>
              )}
            </>
          )}

          {paidByGiftcard && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-medium text-green-800">
                Votre commande est entièrement couverte par une carte cadeau.
              </p>
            </div>
          )}

          <ErrorMessage
            error={error}
            data-testid="payment-method-error-message"
          />

          {isSwitching && (
            <p className="text-sm text-amber-600 mt-2">
              Changement de moyen de paiement en cours...
            </p>
          )}
          <Button
            size="large"
            className={`mt-6 w-full font-semibold py-3.5 px-6 rounded-lg transition-all duration-200 text-base ${
              (isStripe && !paymentElementReady) || (!selectedPaymentMethod && !paidByGiftcard) || isSwitching
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-amber-600 hover:bg-amber-700 text-white shadow-md hover:shadow-lg"
            }`}
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={
              (isStripe && !paymentElementReady) ||
              (!selectedPaymentMethod && !paidByGiftcard) ||
              isSwitching
            }
            data-testid="submit-payment-button"
          >
            Continuer vers la vérification
          </Button>
          {(isStripe && !paymentElementReady) && selectedPaymentMethod && (
            <p className="text-xs text-gray-500 text-center mt-2">
              Veuillez remplir les informations de paiement ci-dessus
            </p>
          )}
          {!selectedPaymentMethod && !paidByGiftcard && (
            <p className="text-xs text-gray-500 text-center mt-2">
              Sélectionnez un moyen de paiement ci-dessus
            </p>
          )}
        </div>

        <div className={isOpen ? "hidden" : "block"}>
          {cart && paymentReady && activeSession ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Méthode de paiement
                </p>
                <p
                  className="text-sm font-medium text-gray-900"
                  data-testid="payment-method-summary"
                >
                  {paymentInfoMap[selectedPaymentMethod]?.title ||
                    selectedPaymentMethod}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Détails
                </p>
                <div
                  className="flex gap-2 items-center text-sm text-gray-700"
                  data-testid="payment-details-summary"
                >
                  <Container className="flex items-center h-7 w-fit p-2 bg-white border border-gray-200 rounded">
                    {paymentInfoMap[selectedPaymentMethod]?.icon || (
                      <CreditCard />
                    )}
                  </Container>
                  <Text>
                    {isStripeFunc(selectedPaymentMethod)
                      ? "Carte / Klarna / Alma"
                      : "Prêt pour le paiement"}
                  </Text>
                </div>
              </div>
            </div>
          ) : paidByGiftcard ? (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Méthode de paiement
              </p>
              <p
                className="text-sm font-medium text-gray-900"
                data-testid="payment-method-summary"
              >
                Carte cadeau
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default Payment
