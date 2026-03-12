"use client"

import { loadStripe } from "@stripe/stripe-js"
import React, { useMemo, useState } from "react"
import StripeWrapper from "./stripe-wrapper"
import { PayPalScriptProvider } from "@paypal/react-paypal-js"
import { createContext } from "react"
import { HttpTypes } from "@medusajs/types"
import { isPaypal, isStripe } from "@lib/constants"
import { getActivePaymentSession } from "@lib/util/payment-session"

type WrapperProps = {
  cart: HttpTypes.StoreCart
  children: React.ReactNode
}

export const StripeContext = createContext(false)
export const PaymentSessionsContext = createContext<{
  paymentSessions: HttpTypes.StorePaymentSession[]
  setPaymentSessions: React.Dispatch<
    React.SetStateAction<HttpTypes.StorePaymentSession[]>
  >
} | null>(null)

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_KEY
const stripePromise = stripeKey ? loadStripe(stripeKey) : null

const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

const Wrapper: React.FC<WrapperProps> = ({ cart, children }) => {
  const [paymentSessions, setPaymentSessions] = useState<
    HttpTypes.StorePaymentSession[]
  >(cart.payment_collection?.payment_sessions || [])

  const currentPaymentSessions = useMemo(
    () => paymentSessions.length
      ? paymentSessions
      : cart.payment_collection?.payment_sessions || [],
    [paymentSessions, cart.payment_collection?.payment_sessions]
  )

  const paymentSession = getActivePaymentSession(
    currentPaymentSessions
  )

  if (
    isStripe(paymentSession?.provider_id) &&
    paymentSession &&
    paymentSession?.data?.client_secret &&
    stripePromise
  ) {
    return (
      <PaymentSessionsContext.Provider
        value={{ paymentSessions: currentPaymentSessions, setPaymentSessions }}
      >
        <StripeContext.Provider value={true}>
          <StripeWrapper
            paymentSession={paymentSession}
            stripeKey={stripeKey}
            stripePromise={stripePromise}
          >
            {children}
          </StripeWrapper>
        </StripeContext.Provider>
      </PaymentSessionsContext.Provider>
    )
  }

  if (
    isPaypal(paymentSession?.provider_id) &&
    paypalClientId !== undefined &&
    cart
  ) {
    return (
      <PaymentSessionsContext.Provider
        value={{ paymentSessions: currentPaymentSessions, setPaymentSessions }}
      >
        <PayPalScriptProvider
          options={{
            "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "test",
            currency: cart?.currency_code.toUpperCase(),
            intent: "authorize",
            components: "buttons",
          }}
        >
          {children}
        </PayPalScriptProvider>
      </PaymentSessionsContext.Provider>
    )
  }

  return (
    <PaymentSessionsContext.Provider
      value={{ paymentSessions: currentPaymentSessions, setPaymentSessions }}
    >
      <div>{children}</div>
    </PaymentSessionsContext.Provider>
  )
}

export default Wrapper
