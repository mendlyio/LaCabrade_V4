"use client"

import { Stripe, StripeElementsOptions } from "@stripe/stripe-js"
import { Elements } from "@stripe/react-stripe-js"
import { HttpTypes } from "@medusajs/types"

type StripeWrapperProps = {
  paymentSession: HttpTypes.StorePaymentSession
  stripeKey?: string
  stripePromise: Promise<Stripe | null> | null
  cart?: HttpTypes.StoreCart | null
  children: React.ReactNode
}

const StripeWrapper: React.FC<StripeWrapperProps> = ({
  paymentSession,
  stripeKey,
  stripePromise,
  cart,
  children,
}) => {
  if (!stripeKey || !stripePromise) {
    return <div>{children}</div>
  }

  const clientSecret = paymentSession?.data?.client_secret as string | undefined
  if (!clientSecret) {
    return <div>{children}</div>
  }

  const options: StripeElementsOptions = {
    clientSecret,
    locale: "fr",
    appearance: {
      theme: "stripe",
      variables: {
        borderRadius: "8px",
        colorPrimary: "#d97706",
      },
    },
  }

  return (
    <Elements key={clientSecret} options={options} stripe={stripePromise}>
      {children}
    </Elements>
  )
}

export default StripeWrapper
