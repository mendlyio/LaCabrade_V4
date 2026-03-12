"use client"

import { useCallback, useContext, useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { RadioGroup } from "@headlessui/react"
import ErrorMessage from "@modules/checkout/components/error-message"
import { CheckCircleSolid, CreditCard } from "@medusajs/icons"
import { Button, Container, Heading, Text, clx } from "@medusajs/ui"
import { PaymentElement } from "@stripe/react-stripe-js"

import PaymentContainer from "@modules/checkout/components/payment-container"
import {
  getPaymentInfo,
  getStripePaymentMethodType,
  isStripe as isStripeFunc,
  paymentInfoMap,
  sortPaymentProviders,
} from "@lib/constants"
import {
  PaymentSessionsContext,
  StripeContext,
} from "@modules/checkout/components/payment-wrapper"
import { initiatePaymentSession } from "@lib/data/cart"
import { getActivePaymentSession } from "@lib/util/payment-session"

const Payment = ({
  cart,
  availablePaymentMethods,
}: {
  cart: any
  availablePaymentMethods: any[]
}) => {
  const paymentSessionsContext = useContext(PaymentSessionsContext)
  const paymentSessions =
    paymentSessionsContext?.paymentSessions ||
    cart.payment_collection?.payment_sessions

  const activeSession = getActivePaymentSession(
    paymentSessions
  )

  const [isLoading, setIsLoading] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentElementReady, setPaymentElementReady] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    activeSession?.provider_id ?? ""
  )
  const pendingProviderId = useRef<string | null>(null)

  const visiblePaymentMethods = availablePaymentMethods ?? []

  const selectedOrActiveProviderId =
    selectedPaymentMethod || activeSession?.provider_id || ""

  const selectedSession = getActivePaymentSession(
    paymentSessions,
    selectedOrActiveProviderId || undefined
  )

  // Réinitialiser paymentElementReady quand la session change (nouveau Payment Element)
  useEffect(() => {
    setPaymentElementReady(false)
  }, [selectedSession?.id, selectedPaymentMethod])

  // Quand le cart serveur a bien basculé sur le provider demandé, on lève l'état de switching
  useEffect(() => {
    if (
      pendingProviderId.current &&
      activeSession?.provider_id === pendingProviderId.current
    ) {
      pendingProviderId.current = null
      setIsSwitching(false)
    }
  }, [activeSession?.provider_id])

  // Synchroniser la sélection quand la session du panier change hors changement manuel
  useEffect(() => {
    if (
      !pendingProviderId.current &&
      activeSession?.provider_id &&
      activeSession.provider_id !== selectedPaymentMethod
    ) {
      setSelectedPaymentMethod(activeSession.provider_id)
    }
  }, [activeSession?.provider_id, selectedPaymentMethod])

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const isOpen = searchParams.get("step") === "payment"

  const isStripe = isStripeFunc(selectedOrActiveProviderId)
  const stripeReady = useContext(StripeContext)
  const stripeMethodType = getStripePaymentMethodType(selectedOrActiveProviderId)
  const paymentInfo = getPaymentInfo(selectedOrActiveProviderId)
  const isStripeSessionReady =
    !!selectedSession &&
    selectedSession.provider_id === selectedOrActiveProviderId &&
    !!selectedSession.data?.client_secret
  const shouldRenderStripeElement =
    isStripe &&
    stripeReady &&
    isStripeSessionReady &&
    !isSwitching

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
      setSelectedPaymentMethod(newProviderId)
      pendingProviderId.current = newProviderId
      try {
        const updatedPaymentCollection = await initiatePaymentSession(cart, {
          provider_id: newProviderId,
        })
        paymentSessionsContext?.setPaymentSessions(
          updatedPaymentCollection?.payment_collection?.payment_sessions || []
        )
        router.refresh()
      } catch (err: any) {
        setError(err?.message ?? "Impossible de changer de moyen de paiement. Réessayez.")
        pendingProviderId.current = null
        setSelectedPaymentMethod(activeSession?.provider_id ?? "")
        setIsSwitching(false)
      }
    },
    [cart, activeSession?.provider_id, paymentSessionsContext, router]
  )

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const needNewSession =
        !selectedSession || selectedSession.provider_id !== selectedPaymentMethod

      if (needNewSession) {
        const updatedPaymentCollection = await initiatePaymentSession(cart, {
          provider_id: selectedPaymentMethod,
        })
        paymentSessionsContext?.setPaymentSessions(
          updatedPaymentCollection?.payment_collection?.payment_sessions || []
        )
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
                  {sortPaymentProviders(
                    visiblePaymentMethods.map((paymentMethod) => paymentMethod.id)
                  )
                    .map((paymentProviderId) =>
                      visiblePaymentMethods.find(
                        (paymentMethod) => paymentMethod.id === paymentProviderId
                      )
                    )
                    .filter(Boolean)
                    .map((paymentMethod) => {
                      return (
                        <PaymentContainer
                          paymentInfoMap={paymentInfoMap}
                          paymentProviderId={paymentMethod!.id}
                          key={paymentMethod!.id}
                          selectedPaymentOptionId={selectedPaymentMethod}
                          disabled={isSwitching}
                        />
                      )
                    })}
                </div>
              </RadioGroup>

              {shouldRenderStripeElement && (
                <div className="mt-5 transition-all duration-150 ease-in-out">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 mb-4">
                    <p className="text-sm font-medium text-gray-900">
                      {paymentInfo.title}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Carte bancaire, Apple Pay, Google Pay, Klarna, Alma, Bancontact et autres moyens activés sur Stripe.
                    </p>
                  </div>
                  <PaymentElement
                    key={selectedSession?.id}
                    options={{
                      layout: {
                        type: "accordion",
                        defaultCollapsed: false,
                        radios: true,
                      },
                      wallets: { applePay: "auto", googlePay: "auto" },
                      defaultValues: (() => {
                        const addr = cart?.shipping_address
                        const country =
                          addr?.country_code?.toUpperCase() ||
                          cart?.region?.countries?.[0]?.iso_2?.toUpperCase() ||
                          "BE"
                        return {
                          billingDetails: {
                            address: {
                              country,
                              line1: addr?.address_1 || "",
                              line2: addr?.address_2 || undefined,
                              city: addr?.city || undefined,
                              state: addr?.province || undefined,
                              postal_code: addr?.postal_code || undefined,
                            },
                          },
                        }
                      })(),
                    }}
                    onReady={() => setPaymentElementReady(true)}
                    onChange={(e) => setError(e.error?.message || null)}
                  />
                </div>
              )}

              {isStripe && !shouldRenderStripeElement && selectedPaymentMethod && !isSwitching && (
                <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm text-gray-700">
                    Préparation du formulaire de paiement {paymentInfo.title.toLowerCase()}...
                  </p>
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
                    {paymentInfo.icon || (
                      <CreditCard />
                    )}
                  </Container>
                  <Text>
                    {isStripeFunc(selectedPaymentMethod)
                      ? paymentInfo.title
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
