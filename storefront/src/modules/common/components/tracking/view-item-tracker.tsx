"use client"

import { useEffect, useRef } from "react"
import { trackGA4ViewItem, trackMetaViewContent } from "@lib/tracking"
import { HttpTypes } from "@medusajs/types"

type ViewItemTrackerProps = {
  product: HttpTypes.StoreProduct
  variant?: HttpTypes.StoreProductVariant
  listName?: string
}

export default function ViewItemTracker({
  product,
  variant,
  listName,
}: ViewItemTrackerProps) {
  const fired = useRef(false)

  useEffect(() => {
    if (!product?.id || fired.current) return

    const v = variant ?? product.variants?.[0]
    const amount = (v as any)?.calculated_price?.calculated_amount
    if (amount == null) return

    fired.current = true

    const price = amount / 100
    const category = (product as any).categories?.[0]?.name

    const item = {
      item_id: v?.id ?? product.id,
      item_name: product.title ?? "Produit",
      price,
      quantity: 1,
      item_variant: v?.title,
      item_category: category,
    }

    trackGA4ViewItem(item, listName)
    trackMetaViewContent(item, listName)
  }, [product, variant, listName])

  return null
}
