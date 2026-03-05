"use client"

import { useEffect, useRef } from "react"
import { trackGA4ViewItemList } from "@lib/tracking"
import { HttpTypes } from "@medusajs/types"

type ViewItemListTrackerProps = {
  products: HttpTypes.StoreProduct[]
  listName: string
}

export default function ViewItemListTracker({
  products,
  listName,
}: ViewItemListTrackerProps) {
  const fired = useRef(false)

  useEffect(() => {
    if (!products?.length || fired.current) return

    const items = products.slice(0, 20).map((p, idx) => {
      const v = p.variants?.[0]
      const amount = (v as any)?.calculated_price?.calculated_amount ?? 0
      const price = amount
      const category = (p as any).categories?.[0]?.name

      return {
        item_id: v?.id ?? p.id,
        item_name: p.title ?? "Produit",
        price,
        quantity: 1,
        item_variant: v?.title,
        item_category: category,
        index: idx,
      }
    })

    fired.current = true
    trackGA4ViewItemList(items, listName)
  }, [products, listName])

  return null
}
