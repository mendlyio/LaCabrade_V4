"use client"

import { useCallback, useContext, useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { RadioGroup } from "@headlessui/react"
import ErrorMessage from "@modules/checkout/components/error-message"
import { CheckCircleSolid, CreditCard } from "@medusajs/icons"
import { Button, Container, Heading, Text, clx } from "@medusajs/ui"
import { PaymentElement } from "@stripe/react-stripe-js"

import PaymentContainer from "@modules/checkout/components/payment-container"
import { cartToTrackingCart, trackGA4AddPaymentInfo } from "@lib/tracking"
import {
  getPaymentInfo,
  getStripePaymentMethodType,
  isManual,
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

const extractPaymentSessionsFromResponse = (
  payload: any
): any[] | null => {
  const candidates = [
    payload?.payment_collection?.payment_sessions,
    payload?.payment_sessions,
    payload?.cart?.payment_collection?.payment_sessions,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate
    }
  }

  return null
}

const Payment = ({
  cart,
  availablePaymentMethods,
}: {
  cart: any
  availablePaymentMethods: any[]
}) => {
  const paymentSessionsContext = useContext(PaymentSessionsContext)
  const contextPaymentSessions = paymentSessionsContext?.paymentSessions
  const paymentSessions =
    contextPaymentSessions && contextPaymentSessions.length > 0
      ? contextPaymentSessions
      : cart.payment_collection?.payment_sessions || []

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

  const visiblePaymentMethods = (availablePaymentMethods ?? []).filter(
    (method) => !isManual(method.id)
  )

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

  const hasGiftCardPromotion = (cart?.promotions || []).some(
    (p: any) => p?.code && /^LC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(p.code)
  )
  const paidByGiftcard =
    hasGiftCardPromotion && cart?.total !== undefined && cart?.total !== null && cart.total === 0

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
        const nextPaymentSessions = extractPaymentSessionsFromResponse(
          updatedPaymentCollection
        )

        if (nextPaymentSessions?.length) {
          paymentSessionsContext?.setPaymentSessions(nextPaymentSessions as any)
        }

        router.refresh()
      } catch (err: any) {
        setError(err?.message ?? "Impossible de changer de moyen de paiement. Réessayez.")
        pendingProviderId.current = null
        setSelectedPaymentMethod(activeSession?.provider_id ?? "")
        setIsSwitching(false)
      } finally {
        // Évite de rester bloqué en "switching" si la réponse API ne contient pas
        // immédiatement la session attendue.
        if (pendingProviderId.current === newProviderId) {
          pendingProviderId.current = null
          setIsSwitching(false)
        }
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
        const nextPaymentSessions = extractPaymentSessionsFromResponse(
          updatedPaymentCollection
        )
        if (nextPaymentSessions?.length) {
          paymentSessionsContext?.setPaymentSessions(nextPaymentSessions as any)
        }
        router.refresh()
      }

      if (cart?.items?.length) {
        const trackingCart = cartToTrackingCart(
          cart.items as any,
          cart.currency_code ?? "EUR",
          cart.subtotal ?? undefined
        )
        const paymentLabel =
          paymentInfoMap[selectedPaymentMethod]?.title ?? selectedPaymentMethod
        trackGA4AddPaymentInfo(trackingCart, paymentLabel)
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
                      Carte bancaire, Apple Pay, Google Pay, Klarna, Alma, Bancontact et plus.
                    </p>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-white border border-gray-200 rounded-full px-2 py-1 text-gray-700">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/></svg>
                        Visa/MC
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-white border border-gray-200 rounded-full px-2 py-1 text-gray-700">
                        Apple Pay
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-white border border-gray-200 rounded-full px-2 py-1 text-gray-700">
                        Google Pay
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-white border border-gray-200 rounded-full px-2 py-1 text-gray-700">
                        Bancontact
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-white border border-gray-200 rounded-full px-2 py-1 text-gray-700">
                        Klarna
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-white border border-gray-200 rounded-full px-2 py-1 text-gray-700">
                        Alma
                      </span>
                    </div>
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
                      fields: {
                        billingDetails: "auto",
                      },
                      defaultValues: (() => {
                        const addr = cart?.shipping_address
                        const billing = cart?.billing_address
                        const name = [
                          billing?.first_name || addr?.first_name,
                          billing?.last_name || addr?.last_name,
                        ].filter(Boolean).join(" ") || ""
                        const country =
                          billing?.country_code?.toUpperCase() ||
                          addr?.country_code?.toUpperCase() ||
                          cart?.region?.countries?.[0]?.iso_2?.toUpperCase() ||
                          "BE"
                        return {
                          billingDetails: {
                            name,
                            email: cart?.email || "",
                            phone: billing?.phone || addr?.phone || "",
                            address: {
                              country,
                              line1: billing?.address_1 || addr?.address_1 || "",
                              line2: billing?.address_2 || addr?.address_2 || undefined,
                              city: billing?.city || addr?.city || undefined,
                              state: billing?.province || addr?.province || undefined,
                              postal_code: billing?.postal_code || addr?.postal_code || undefined,
                            },
                          },
                        }
                      })(),
                    }}
                    onReady={() => setPaymentElementReady(true)}
                    onChange={(e) => setError((e as any).error?.message || null)}
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
