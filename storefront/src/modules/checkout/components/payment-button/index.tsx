"use client"

import { Button } from "@medusajs/ui"
import { OnApproveActions, OnApproveData } from "@paypal/paypal-js"
import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js"
import { useElements, useStripe } from "@stripe/react-stripe-js"
import React, { useCallback, useContext, useRef, useState } from "react"
import ErrorMessage from "../error-message"
import Spinner from "@modules/common/icons/spinner"
import { placeOrder } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { isManual, isPaypal, isStripe } from "@lib/constants"
import { getActivePaymentSession } from "@lib/util/payment-session"
import { PaymentSessionsContext } from "@modules/checkout/components/payment-wrapper"

type PaymentButtonProps = {
  cart: HttpTypes.StoreCart
  "data-testid": string
}

const STRIPE_ERROR_MESSAGES: Record<string, string> = {
  card_declined: "Votre carte a été refusée. Veuillez essayer une autre carte.",
  expired_card: "Votre carte est expirée. Veuillez utiliser une autre carte.",
  incorrect_cvc: "Le code CVC est incorrect. Vérifiez et réessayez.",
  insufficient_funds: "Fonds insuffisants. Essayez une autre carte.",
  processing_error: "Erreur de traitement. Veuillez réessayer dans quelques instants.",
  incorrect_number: "Le numéro de carte est incorrect.",
  authentication_required: "Authentification requise. Veuillez valider le paiement via votre banque.",
}

function translateStripeError(error: { decline_code?: string; message?: string }): string {
  if (error.decline_code && STRIPE_ERROR_MESSAGES[error.decline_code]) {
    return STRIPE_ERROR_MESSAGES[error.decline_code]
  }
  return error.message ?? "Une erreur est survenue lors du paiement. Veuillez réessayer."
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  cart,
  "data-testid": dataTestId,
}) => {
  const paymentSessionsContext = useContext(PaymentSessionsContext)
  const paymentSessions =
    paymentSessionsContext?.paymentSessions ||
    cart.payment_collection?.payment_sessions

  const notReady =
    !cart ||
    !cart.shipping_address ||
    !cart.billing_address ||
    !cart.email ||
    (cart.shipping_methods?.length ?? 0) < 1

  const hasGiftCardPromotion = (cart?.promotions || []).some(
    (p: any) => p?.code && /^LC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(p.code)
  )
  const paidByGiftcard =
    hasGiftCardPromotion && cart?.total !== undefined && cart?.total !== null && cart.total === 0

  if (paidByGiftcard) {
    return <GiftCardPaymentButton />
  }

  const paymentSession = getActivePaymentSession(
    paymentSessions
  )

  switch (true) {
    case isStripe(paymentSession?.provider_id):
      return (
        <StripePaymentButton
          notReady={notReady}
          cart={cart}
          data-testid={dataTestId}
        />
      )
    case isManual(paymentSession?.provider_id):
      return (
        <ManualTestPaymentButton notReady={notReady} data-testid={dataTestId} />
      )
    case isPaypal(paymentSession?.provider_id):
      return (
        <PayPalPaymentButton
          notReady={notReady}
          cart={cart}
          data-testid={dataTestId}
        />
      )
    default:
      return <Button disabled>Sélectionnez un moyen de paiement</Button>
  }
}

const GiftCardPaymentButton = () => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const submitGuard = useRef(false)

  const handleOrder = async () => {
    if (submitGuard.current) return
    submitGuard.current = true
    setSubmitting(true)
    setErrorMessage(null)
    try {
      await placeOrder()
    } catch (err: any) {
      setErrorMessage(err?.message ?? "Erreur lors de la validation de la commande.")
      submitGuard.current = false
      setSubmitting(false)
    }
  }

  return (
    <>
      <Button
        onClick={handleOrder}
        isLoading={submitting}
        disabled={submitting}
        data-testid="submit-order-button"
        className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-4 px-8 rounded-lg transition-colors w-full text-lg"
      >
        Valider la commande
      </Button>
      <ErrorMessage error={errorMessage} data-testid="gift-card-payment-error-message" />
    </>
  )
}

const StripePaymentButton = ({
  cart,
  notReady,
  "data-testid": dataTestId,
}: {
  cart: HttpTypes.StoreCart
  notReady: boolean
  "data-testid"?: string
}) => {
  const paymentSessionsContext = useContext(PaymentSessionsContext)
  const paymentSessions =
    paymentSessionsContext?.paymentSessions ||
    cart.payment_collection?.payment_sessions

  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const submitGuard = useRef(false)

  const onPaymentCompleted = useCallback(async () => {
    try {
      await placeOrder()
    } catch (err: any) {
      if (err?.digest?.includes?.("NEXT_REDIRECT")) {
        return
      }
      setErrorMessage(err?.message ?? "Erreur lors de la finalisation de la commande.")
    } finally {
      setSubmitting(false)
      submitGuard.current = false
    }
  }, [])

  const stripe = useStripe()
  const elements = useElements()

  const session = getActivePaymentSession(
    paymentSessions
  )

  const disabled = !stripe || !elements

  const handlePayment = async () => {
    if (submitGuard.current) return
    submitGuard.current = true
    setSubmitting(true)
    setErrorMessage(null)

    if (!stripe || !elements || !session?.data?.client_secret || !cart) {
      setSubmitting(false)
      submitGuard.current = false
      return
    }

    const returnUrl = typeof window !== "undefined"
      ? (() => {
          const url = new URL(window.location.href)
          url.searchParams.set("step", "review")
          url.searchParams.set("cart_id", cart.id)
          return url.toString()
        })()
      : ""

    const billingName =
      [cart.billing_address?.first_name, cart.billing_address?.last_name]
        .filter(Boolean)
        .join(" ")
        .trim() || cart.email || "Client"

    const confirmParams: Record<string, unknown> = { return_url: returnUrl }
    const billingDetails: Record<string, unknown> = {
      name: billingName,
      ...(cart.email && { email: cart.email }),
      ...(cart.billing_address?.phone && { phone: cart.billing_address.phone }),
      ...(cart.billing_address?.address_1 && {
        address: {
          line1: cart.billing_address.address_1,
          line2: cart.billing_address.address_2 || undefined,
          city: cart.billing_address.city,
          postal_code: cart.billing_address.postal_code,
          country: cart.billing_address.country_code,
          state: cart.billing_address.province || undefined,
        },
      }),
    }
    confirmParams.payment_method_data = { billing_details: billingDetails }

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams,
        redirect: "if_required",
      })
      if (error) {
        setErrorMessage(translateStripeError(error as any))
        submitGuard.current = false
      } else {
        await onPaymentCompleted()
      }
    } catch (err: any) {
      setErrorMessage(err?.message ?? "Une erreur est survenue lors du paiement. Veuillez réessayer.")
      submitGuard.current = false
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Button
        disabled={disabled || notReady || submitting}
        onClick={handlePayment}
        size="large"
        isLoading={submitting}
        data-testid={dataTestId}
        className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-4 px-8 rounded-lg transition-colors w-full text-lg"
      >
        Valider la commande
      </Button>
      {submitting && (
        <p className="text-xs text-amber-600 text-center mt-2 animate-pulse">
          Traitement du paiement en cours, veuillez patienter...
        </p>
      )}
      <ErrorMessage
        error={errorMessage}
        data-testid="stripe-payment-error-message"
      />
    </>
  )
}

const PayPalPaymentButton = ({
  cart,
  notReady,
  "data-testid": dataTestId,
}: {
  cart: HttpTypes.StoreCart
  notReady: boolean
  "data-testid"?: string
}) => {
  const paymentSessionsContext = useContext(PaymentSessionsContext)
  const paymentSessions =
    paymentSessionsContext?.paymentSessions ||
    cart.payment_collection?.payment_sessions

  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const onPaymentCompleted = async () => {
    await placeOrder()
      .catch((err) => {
        setErrorMessage(err.message)
      })
      .finally(() => {
        setSubmitting(false)
      })
  }

  const session = getActivePaymentSession(
    paymentSessions
  )

  const handlePayment = async (
    _data: OnApproveData,
    actions: OnApproveActions
  ) => {
    actions?.order
      ?.authorize()
      .then((authorization) => {
        if (authorization.status !== "COMPLETED") {
          setErrorMessage(`Une erreur est survenue, statut : ${authorization.status}`)
          return
        }
        onPaymentCompleted()
      })
      .catch(() => {
        setErrorMessage(`Une erreur inconnue est survenue, veuillez réessayer.`)
        setSubmitting(false)
      })
  }

  const [{ isPending, isResolved }] = usePayPalScriptReducer()

  if (isPending) {
    return <Spinner />
  }

  if (isResolved) {
    return (
      <>
        <PayPalButtons
          style={{ layout: "horizontal" }}
          createOrder={async () => session?.data.id as string}
          onApprove={handlePayment}
          disabled={notReady || submitting || isPending}
          data-testid={dataTestId}
        />
        <ErrorMessage
          error={errorMessage}
          data-testid="paypal-payment-error-message"
        />
      </>
    )
  }
}

const ManualTestPaymentButton = ({ notReady }: { notReady: boolean }) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const submitGuard = useRef(false)

  const handlePayment = async () => {
    if (submitGuard.current) return
    submitGuard.current = true
    setSubmitting(true)
    setErrorMessage(null)
    try {
      await placeOrder()
    } catch (err: any) {
      setErrorMessage(err?.message ?? "Erreur lors de la validation.")
      submitGuard.current = false
      setSubmitting(false)
    }
  }

  return (
    <>
      <Button
        disabled={notReady || submitting}
        isLoading={submitting}
        onClick={handlePayment}
        size="large"
        data-testid="submit-order-button"
        className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-4 px-8 rounded-lg transition-colors w-full text-lg"
      >
        Valider la commande
      </Button>
      <ErrorMessage
        error={errorMessage}
        data-testid="manual-payment-error-message"
      />
    </>
  )
}

export default PaymentButton
