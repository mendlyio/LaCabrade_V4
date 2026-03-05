"use client"

import { useEffect, useRef } from "react"
import {
  trackGA4Purchase,
  trackMetaPurchase,
  orderToTrackingCart,
  hasConsent,
} from "@lib/tracking"
import { HttpTypes } from "@medusajs/types"

type PurchaseTrackerProps = {
  order: HttpTypes.StoreOrder
}

export default function PurchaseTracker({ order }: PurchaseTrackerProps) {
  const fired = useRef(false)

  useEffect(() => {
    if (!order?.id || fired.current) return
    fired.current = true

    const cart = orderToTrackingCart(order)
    const tax = order.tax_total != null ? order.tax_total / 100 : 0
    const shipping = order.shipping_total != null ? order.shipping_total / 100 : 0

    trackGA4Purchase(order.id, cart, tax, shipping)
    trackMetaPurchase(order.id, cart, tax, shipping)

    // CAPI (server-side) - uniquement si consentement cookies
    if (hasConsent()) {
      fetch("/api/track-purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: order.id,
        value: cart.value,
        currency: cart.currency,
        items: cart.items,
        tax,
        shipping,
      }),
    }).catch(() => {})
    }
  }, [order])

  return null
}
