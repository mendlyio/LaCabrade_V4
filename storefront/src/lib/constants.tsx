import React from "react"
import { CreditCard } from "@medusajs/icons"

import Ideal from "@modules/common/icons/ideal"
import Bancontact from "@modules/common/icons/bancontact"
import PayPal from "@modules/common/icons/paypal"

/* Map of payment provider_id to their title and icon. Add in any payment providers you want to use. */
export const paymentInfoMap: Record<
  string,
  { title: string; icon: React.JSX.Element }
> = {
  pp_stripe_stripe: {
    title: "Carte bancaire",
    icon: <CreditCard />,
  },
  "pp_stripe-ideal_stripe": {
    title: "iDeal",
    icon: <Ideal />,
  },
  "pp_stripe-bancontact_stripe": {
    title: "Bancontact",
    icon: <Bancontact />,
  },
  "pp_stripe-klarna_stripe-klarna-alma": {
    title: "Klarna",
    icon: <CreditCard />,
  },
  "pp_stripe-alma_stripe-klarna-alma": {
    title: "Alma",
    icon: <CreditCard />,
  },
  pp_paypal_paypal: {
    title: "PayPal",
    icon: <PayPal />,
  },
  pp_system_default: {
    title: "Paiement manuel",
    icon: <CreditCard />,
  },
  // Add more payment providers here
}

// Inclut tous les providers Stripe : carte, Klarna, Alma, etc. (Payment Element)
export const isStripe = (providerId?: string) => {
  return providerId?.startsWith("pp_stripe")
}
export const isPaypal = (providerId?: string) => {
  return providerId?.startsWith("pp_paypal")
}
export const isManual = (providerId?: string) => {
  return providerId?.startsWith("pp_system_default")
}

export const getStripePaymentMethodType = (providerId?: string) => {
  if (!providerId) {
    return undefined
  }

  if (providerId.includes("bancontact")) {
    return "bancontact"
  }

  if (providerId.includes("ideal")) {
    return "ideal"
  }

  if (providerId.includes("klarna")) {
    return "klarna"
  }

  if (providerId.includes("alma")) {
    return "alma"
  }

  if (providerId === "pp_stripe_stripe") {
    return "card"
  }

  return undefined
}

export const getPaymentInfo = (providerId?: string) => {
  if (!providerId) {
    return {
      title: "Paiement",
      icon: <CreditCard />,
    }
  }

  const mapped = paymentInfoMap[providerId]

  if (mapped) {
    return mapped
  }

  if (providerId.includes("alma")) {
    return { title: "Alma", icon: <CreditCard /> }
  }

  if (providerId.includes("klarna")) {
    return { title: "Klarna", icon: <CreditCard /> }
  }

  if (providerId.includes("bancontact")) {
    return { title: "Bancontact", icon: <Bancontact /> }
  }

  if (providerId.includes("ideal")) {
    return { title: "iDeal", icon: <Ideal /> }
  }

  return {
    title: providerId,
    icon: <CreditCard />,
  }
}

export const sortPaymentProviders = (providerIds: string[]) => {
  const order = [
    "pp_stripe_stripe",
    "pp_stripe-bancontact_stripe",
    "pp_stripe-klarna_stripe-klarna-alma",
    "pp_stripe-alma_stripe-klarna-alma",
    "pp_stripe-ideal_stripe",
    "pp_paypal_paypal",
    "pp_system_default",
  ]

  return [...providerIds].sort((a, b) => {
    const aIndex = order.indexOf(a)
    const bIndex = order.indexOf(b)

    if (aIndex === -1 && bIndex === -1) {
      return a.localeCompare(b)
    }

    if (aIndex === -1) {
      return 1
    }

    if (bIndex === -1) {
      return -1
    }

    return aIndex - bIndex
  })
}

// Add currencies that don't need to be divided by 100
export const noDivisionCurrencies = [
  "krw",
  "jpy",
  "vnd",
  "clp",
  "pyg",
  "xaf",
  "xof",
  "bif",
  "djf",
  "gnf",
  "kmf",
  "mga",
  "rwf",
  "xpf",
  "htg",
  "vuv",
  "xag",
  "xdr",
  "xau",
]
