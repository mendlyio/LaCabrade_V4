"use client"

import { useEffect, useRef } from "react"
import {
  trackGA4Purchase,
  trackGoogleAdsPurchase,
  trackMetaPurchase,
  lineItemToTrackingItem,
  hasConsent,
  type TrackingCart,
} from "@lib/tracking"
import {
  getDisplayTotalTvacEuros,
  getDisplayTaxEuros,
  isGiftCardItem,
} from "@lib/util/cart-amounts"
import { HttpTypes } from "@medusajs/types"

type PurchaseTrackerProps = {
  order: HttpTypes.StoreOrder
}

export default function PurchaseTracker({ order }: PurchaseTrackerProps) {
  const fired = useRef(false)

  useEffect(() => {
    if (!order?.id || fired.current) return
    fired.current = true

    const items = order.items ?? []
    const currency = order.currency_code?.toUpperCase() ?? "EUR"

    // Shipping from shipping_methods (amounts in euros, same as Odoo products)
    const shippingEuros = (order as any).shipping_methods
      ? ((order as any).shipping_methods as any[]).reduce(
          (acc: number, m: any) => acc + (Number(m.amount) || 0),
          0
        )
      : Number((order as any).shipping_total ?? 0)

    // Build cart-amounts-compatible input to reuse exact same calculation
    // as the checkout display (handles GC metadata deduction, free shipping, etc.)
    const orderAsCartInput = {
      items: items.map((item: any) => ({
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        quantity: item.quantity,
        adjustments: item.adjustments,
        metadata: item.metadata,
        product_title: item.product_title ?? (item as any).title,
        title: item.title,
        variant_sku: item.variant_sku ?? (item.variant as any)?.sku,
      })),
      shipping_total: shippingEuros,
      discount_total: Number((order as any).discount_total ?? 0),
      metadata: order.metadata,
      shipping_address: order.shipping_address,
    }

    // Total réellement payé (= ce que getDisplayTotalTvacEuros affiche au checkout)
    const purchaseValue = getDisplayTotalTvacEuros(orderAsCartInput)
    // TVA incluse dans le total (21% sur base avant bon cadeau)
    const taxEuros = getDisplayTaxEuros(orderAsCartInput)

    // Build tracking items (exclude gift card items from product list)
    const trackingItems = items
      .filter((item: any) => !isGiftCardItem(item))
      .map((item: any, idx: number) => {
        const t = lineItemToTrackingItem(
          item,
          item.product_title ?? (item.variant as any)?.product?.title,
          undefined
        )
        return { ...t, index: idx }
      })

    const trackingCart: TrackingCart = {
      currency,
      value: purchaseValue,
      items: trackingItems,
    }

    trackGA4Purchase(order.id, trackingCart, taxEuros, shippingEuros)
    trackGoogleAdsPurchase(order.id, purchaseValue, currency)
    trackMetaPurchase(order.id, trackingCart, taxEuros, shippingEuros)

    // CAPI (server-side) - uniquement si consentement cookies
    if (hasConsent()) {
      fetch("/api/track-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          value: purchaseValue,
          currency,
          items: trackingCart.items,
          tax: taxEuros,
          shipping: shippingEuros,
        }),
      }).catch(() => {})
    }
  }, [order])

  return null
}
