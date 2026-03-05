"use client"

import { useEffect, useRef } from "react"
import {
  trackGA4BeginCheckout,
  trackMetaInitiateCheckout,
  cartToTrackingCart,
} from "@lib/tracking"
import { HttpTypes } from "@medusajs/types"

type CheckoutTrackerProps = {
  cart: HttpTypes.StoreCart | null
}

export default function CheckoutTracker({ cart }: CheckoutTrackerProps) {
  const fired = useRef(false)

  useEffect(() => {
    if (!cart?.items?.length || fired.current) return
    fired.current = true

    const trackingCart = cartToTrackingCart(
      cart.items,
      (cart as any).currency_code ?? "EUR",
      cart.subtotal ?? undefined
    )

    trackGA4BeginCheckout(trackingCart)
    trackMetaInitiateCheckout(trackingCart)
  }, [cart])

  return null
}
