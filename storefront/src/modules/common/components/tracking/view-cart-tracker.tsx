"use client"

import { useEffect, useRef } from "react"
import { trackGA4ViewCart, cartToTrackingCart } from "@lib/tracking"
import { HttpTypes } from "@medusajs/types"

type ViewCartTrackerProps = {
  cart: HttpTypes.StoreCart | null
}

export default function ViewCartTracker({ cart }: ViewCartTrackerProps) {
  const fired = useRef(false)

  useEffect(() => {
    if (!cart?.items?.length || fired.current) return
    fired.current = true

    const trackingCart = cartToTrackingCart(
      cart.items as any,
      (cart as any).currency_code ?? "EUR",
      cart.subtotal ?? undefined
    )

    trackGA4ViewCart(trackingCart)
  }, [cart])

  return null
}
