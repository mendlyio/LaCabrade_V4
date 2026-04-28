"use client"

/**
 * Tracking e-commerce : GA4 + Meta Pixel
 * Les montants sont en euros (Medusa stocke en centimes, on divise par 100 avant envoi).
 */

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID
const GOOGLE_ADS_PURCHASE_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL

export function hasConsent(): boolean {
  if (typeof document === "undefined") return false
  const consent = document.cookie
    .split("; ")
    .find((row) => row.startsWith("cookie_consent="))
    ?.split("=")[1]
  return consent === "true"
}

function toEuros(cents: number): number {
  return Math.round((cents / 100) * 100) / 100
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface TrackingItem {
  item_id: string
  item_name: string
  price: number
  quantity: number
  item_variant?: string
  item_category?: string
  index?: number
}

export interface TrackingCart {
  currency: string
  value: number
  items: TrackingItem[]
}

// ── GA4 ─────────────────────────────────────────────────────────────────────

export function trackGA4AddToCart(item: TrackingItem, currency = "EUR") {
  if (!GA_ID || !hasConsent()) return
  const gtag = (window as any).gtag
  if (!gtag) return

  gtag("event", "add_to_cart", {
    currency,
    value: item.price * item.quantity,
    items: [
      {
        item_id: item.item_id,
        item_name: item.item_name,
        price: item.price,
        quantity: item.quantity,
        item_variant: item.item_variant,
        item_category: item.item_category,
      },
    ],
  })
}

export function trackGA4BeginCheckout(cart: TrackingCart) {
  if (!GA_ID || !hasConsent()) return
  const gtag = (window as any).gtag
  if (!gtag) return

  gtag("event", "begin_checkout", {
    currency: cart.currency,
    value: cart.value,
    items: cart.items.map((i, idx) => ({
      item_id: i.item_id,
      item_name: i.item_name,
      price: i.price,
      quantity: i.quantity,
      item_variant: i.item_variant,
      item_category: i.item_category,
      index: idx,
    })),
  })
}

export function trackGA4Purchase(
  transactionId: string,
  cart: TrackingCart,
  tax?: number,
  shipping?: number
) {
  if (!GA_ID || !hasConsent()) return
  const gtag = (window as any).gtag
  if (!gtag) return

  gtag("event", "purchase", {
    transaction_id: transactionId,
    currency: cart.currency,
    value: cart.value,
    tax: tax ?? 0,
    shipping: shipping ?? 0,
    items: cart.items.map((i, idx) => ({
      item_id: i.item_id,
      item_name: i.item_name,
      price: i.price,
      quantity: i.quantity,
      item_variant: i.item_variant,
      item_category: i.item_category,
      index: idx,
    })),
  })
}

export function trackGA4ViewItem(
  item: TrackingItem,
  itemListName?: string,
  currency = "EUR"
) {
  if (!GA_ID || !hasConsent()) return
  const gtag = (window as any).gtag
  if (!gtag) return

  gtag("event", "view_item", {
    currency,
    value: item.price * item.quantity,
    items: [
      {
        item_id: item.item_id,
        item_name: item.item_name,
        price: item.price,
        quantity: item.quantity,
        item_variant: item.item_variant,
        item_category: item.item_category,
        item_list_name: itemListName,
      },
    ],
  })
}

export function trackGA4ViewItemList(
  items: TrackingItem[],
  itemListName: string,
  currency = "EUR"
) {
  if (!GA_ID || !hasConsent()) return
  const gtag = (window as any).gtag
  if (!gtag) return

  const value = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  gtag("event", "view_item_list", {
    item_list_name: itemListName,
    currency,
    value,
    items: items.map((i, idx) => ({
      item_id: i.item_id,
      item_name: i.item_name,
      price: i.price,
      quantity: i.quantity,
      item_variant: i.item_variant,
      item_category: i.item_category,
      index: idx,
    })),
  })
}

export function trackGA4RemoveFromCart(item: TrackingItem, currency = "EUR") {
  if (!GA_ID || !hasConsent()) return
  const gtag = (window as any).gtag
  if (!gtag) return

  gtag("event", "remove_from_cart", {
    currency,
    value: item.price * item.quantity,
    items: [
      {
        item_id: item.item_id,
        item_name: item.item_name,
        price: item.price,
        quantity: item.quantity,
        item_variant: item.item_variant,
        item_category: item.item_category,
      },
    ],
  })
}

export function trackGA4ViewCart(cart: TrackingCart) {
  if (!GA_ID || !hasConsent()) return
  const gtag = (window as any).gtag
  if (!gtag) return

  gtag("event", "view_cart", {
    currency: cart.currency,
    value: cart.value,
    items: cart.items.map((i, idx) => ({
      item_id: i.item_id,
      item_name: i.item_name,
      price: i.price,
      quantity: i.quantity,
      item_variant: i.item_variant,
      item_category: i.item_category,
      index: idx,
    })),
  })
}

export function trackGA4AddShippingInfo(
  cart: TrackingCart,
  shippingTier: string
) {
  if (!GA_ID || !hasConsent()) return
  const gtag = (window as any).gtag
  if (!gtag) return

  gtag("event", "add_shipping_info", {
    currency: cart.currency,
    value: cart.value,
    shipping_tier: shippingTier,
    items: cart.items.map((i, idx) => ({
      item_id: i.item_id,
      item_name: i.item_name,
      price: i.price,
      quantity: i.quantity,
      item_variant: i.item_variant,
      item_category: i.item_category,
      index: idx,
    })),
  })
}

export function trackGA4AddPaymentInfo(
  cart: TrackingCart,
  paymentType: string
) {
  if (!GA_ID || !hasConsent()) return
  const gtag = (window as any).gtag
  if (!gtag) return

  gtag("event", "add_payment_info", {
    currency: cart.currency,
    value: cart.value,
    payment_type: paymentType,
    items: cart.items.map((i, idx) => ({
      item_id: i.item_id,
      item_name: i.item_name,
      price: i.price,
      quantity: i.quantity,
      item_variant: i.item_variant,
      item_category: i.item_category,
      index: idx,
    })),
  })
}

// ── Google Ads ───────────────────────────────────────────────────────────────

export function trackGoogleAdsPurchase(
  transactionId: string,
  value: number,
  currency = "EUR"
) {
  if (!GOOGLE_ADS_ID || !GOOGLE_ADS_PURCHASE_LABEL || !hasConsent()) return
  const gtag = (window as any).gtag
  if (!gtag) return

  gtag("event", "conversion", {
    send_to: `${GOOGLE_ADS_ID}/${GOOGLE_ADS_PURCHASE_LABEL}`,
    transaction_id: transactionId,
    value,
    currency,
  })
}

// ── Meta Pixel ───────────────────────────────────────────────────────────────

export function trackMetaAddToCart(item: TrackingItem, currency = "EUR") {
  if (!META_PIXEL_ID || !hasConsent()) return
  const fbq = (window as any).fbq
  if (!fbq) return

  fbq("track", "AddToCart", {
    content_ids: [item.item_id],
    content_name: item.item_name,
    content_type: "product",
    value: item.price * item.quantity,
    currency,
    num_items: item.quantity,
  })
}

export function trackMetaInitiateCheckout(cart: TrackingCart) {
  if (!META_PIXEL_ID || !hasConsent()) return
  const fbq = (window as any).fbq
  if (!fbq) return

  fbq("track", "InitiateCheckout", {
    content_ids: cart.items.map((i) => i.item_id),
    content_type: "product",
    num_items: cart.items.reduce((s, i) => s + i.quantity, 0),
    value: cart.value,
    currency: cart.currency,
  })
}

export function trackMetaPurchase(
  transactionId: string,
  cart: TrackingCart,
  tax?: number,
  shipping?: number,
  eventId?: string
) {
  if (!META_PIXEL_ID || !hasConsent()) return
  const fbq = (window as any).fbq
  if (!fbq) return

  fbq(
    "track",
    "Purchase",
    {
      content_ids: cart.items.map((i) => i.item_id),
      content_type: "product",
      num_items: cart.items.reduce((s, i) => s + i.quantity, 0),
      value: cart.value,
      currency: cart.currency,
      order_id: transactionId,
      ...(tax != null && { tax }),
      ...(shipping != null && { shipping }),
    },
    // eventID passé en 4e argument pour la déduplication Pixel/CAPI
    eventId ? { eventID: eventId } : undefined
  )
}

export function trackMetaViewContent(
  item: TrackingItem,
  itemListName?: string,
  currency = "EUR"
) {
  if (!META_PIXEL_ID || !hasConsent()) return
  const fbq = (window as any).fbq
  if (!fbq) return

  fbq("track", "ViewContent", {
    content_ids: [item.item_id],
    content_name: item.item_name,
    content_type: "product",
    value: item.price * item.quantity,
    currency,
    num_items: item.quantity,
    ...(itemListName && { content_category: itemListName }),
  })
}

// ── Helpers pour formater les données Medusa ────────────────────────────────

export function lineItemToTrackingItem(
  item: {
    id?: string
    variant_id?: string
    product_id?: string
    title?: string
    variant_title?: string
    unit_price?: number
    quantity?: number
    subtotal?: number
    metadata?: Record<string, unknown>
  },
  productTitle?: string,
  categoryName?: string
): TrackingItem {
  const unitPrice = item.unit_price ?? 0
  const qty = item.quantity ?? 1
  const price = unitPrice
  const name = productTitle || item.title || item.variant_title || "Produit"

  return {
    item_id: item.variant_id || item.product_id || item.id || "",
    item_name: name,
    price,
    quantity: qty,
    item_variant: item.variant_title || undefined,
    item_category: categoryName,
  }
}

export function cartToTrackingCart(
  items: Array<{
    id?: string
    variant_id?: string
    product_id?: string
    title?: string
    variant_title?: string
    unit_price?: number
    quantity?: number
    subtotal?: number
    metadata?: Record<string, unknown>
    variant?: { product?: { title?: string } }
  }>,
  currency = "EUR",
  subtotal?: number
): TrackingCart {
  const trackingItems: TrackingItem[] = items.map((item) => {
    const productTitle = (item as any).variant?.product?.title
    return lineItemToTrackingItem(item, productTitle)
  })

  const hasGiftCard = items.some(
    (i) =>
      (i.metadata as any)?.is_gift_card ||
      ((i as any).product_title || "").toLowerCase().includes("bon cadeau") ||
      ((i as any).variant?.product as any)?.handle === "bon-cadeau"
  )
  const value =
    subtotal != null && !hasGiftCard
      ? subtotal
      : trackingItems.reduce((s, i) => s + i.price * i.quantity, 0)

  return {
    currency,
    value,
    items: trackingItems,
  }
}

export function orderToTrackingCart(
  order: {
    items?: Array<{
      id?: string
      variant_id?: string
      product_id?: string
      title?: string
      variant_title?: string
      unit_price?: number
      quantity?: number
      subtotal?: number
      variant?: { product?: { title?: string } }
    }>
    subtotal?: number
    currency_code?: string
  }
): TrackingCart {
  const items = order.items ?? []
  return cartToTrackingCart(
    items,
    order.currency_code ?? "EUR",
    order.subtotal
  )
}
