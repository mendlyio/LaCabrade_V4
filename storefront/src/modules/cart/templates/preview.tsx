"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { lineItemAmountToEuros, adjustmentHtToTtc } from "@lib/util/cart-amounts"
import { convertToLocale } from "@lib/util/money"
import { deleteLineItem } from "@lib/data/cart"
import repeat from "@lib/util/repeat"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "@modules/products/components/thumbnail"

type ItemsTemplateProps = {
  items?: HttpTypes.StoreCartLineItem[]
}

const ItemsPreviewTemplate = ({ items }: ItemsTemplateProps) => {
  const router = useRouter()
  const [removingId, setRemovingId] = useState<string | null>(null)

  const handleRemove = async (item: HttpTypes.StoreCartLineItem) => {
    if (removingId) return
    setRemovingId(item.id)
    try {
      // Dernier article : retour au panier (évite un checkout vide)
      const isLast = (items?.length ?? 0) <= 1
      await deleteLineItem(item.id)
      if (isLast) {
        router.push("/cart")
      } else {
        router.refresh()
      }
    } catch {
      setRemovingId(null)
    }
  }

  if (!items) {
    return (
      <div className="space-y-3">
        {repeat(3).map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-3 bg-gray-100 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const sortedItems = [...items].sort((a, b) =>
    (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
  )

  return (
    <div className="space-y-0 divide-y divide-gray-100" data-testid="items-table">
      {sortedItems.map((item) => {
        const { handle } = item.variant?.product ?? {}
        const currency_code = (item as any).currency_code || "eur"
        const isGiftCard =
          !!(item.metadata as any)?.is_gift_card ||
          String(item.product_title || "").toLowerCase().includes("bon cadeau") ||
          (item.variant?.product as any)?.handle === "bon-cadeau"

        const unitPrice = lineItemAmountToEuros(item.unit_price)
        const compareAtRaw =
          (item as any).compare_at_unit_price ?? (item.metadata as any)?.outlet_original_price
        const comparePrice = lineItemAmountToEuros(compareAtRaw)
        // !! pour éviter que `0` (number) ne soit rendu tel quel par React
        const hasDiscount = !!comparePrice && comparePrice > unitPrice + 0.01
        const lineTotal = unitPrice * item.quantity

        // Articles outlet : remise déjà dans unit_price → ne pas déduire les adjustments
        const isOutletItem =
          !!(item.metadata as any)?.outlet_discount ||
          (hasDiscount === true)
        // Adjustments Medusa v2 sont en HT ; convertir en TTC
        const adjustmentsHtSum = isOutletItem
          ? 0
          : (item.adjustments || []).reduce(
              (acc, adj) => acc + lineItemAmountToEuros(adj.amount, isGiftCard),
              0
            )
        const adjustmentsSum = Math.round(adjustmentHtToTtc(adjustmentsHtSum, isGiftCard) * 100) / 100
        const finalTotal = lineTotal - adjustmentsSum

        // Options du variant
        const options = item.variant?.options
          ?.map((o: any) => o.value)
          .filter(Boolean)
          .join(" / ")

        return (
          <div
            key={item.id}
            className="flex gap-3 py-3 first:pt-0 last:pb-0"
            data-testid="product-row"
          >
            {/* Thumbnail */}
            <LocalizedClientLink
              href={`/products/${handle}`}
              className="relative flex-shrink-0 w-[60px] h-[60px] rounded-lg overflow-hidden bg-gray-50 border border-gray-100 hover:border-amber-200 transition-colors"
            >
              <Thumbnail
                thumbnail={item.variant?.product?.thumbnail || item.thumbnail}
                images={item.variant?.product?.images}
                size="square"
                alt={item.product_title ?? "Produit"}
              />
              {/* Badge quantité */}
              {item.quantity > 1 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gray-900 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                  {item.quantity}
                </span>
              )}
            </LocalizedClientLink>

            {/* Infos */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <p
                className="text-sm font-medium text-gray-900 truncate leading-tight"
                data-testid="product-title"
              >
                {item.product_title}
              </p>
              {options && (
                <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                  {options}
                </p>
              )}
              {item.quantity === 1 ? null : (
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {item.quantity} × {convertToLocale({ amount: unitPrice, currency_code })}
                </p>
              )}
            </div>

            {/* Prix */}
            <div className="flex flex-col items-end justify-center flex-shrink-0">
              {/* Prix barré : outlet → compare_at × qty ; promo normale → unit_price × qty */}
              {hasDiscount && (
                <span className="text-[10px] text-gray-400 line-through">
                  {convertToLocale({ amount: comparePrice * item.quantity, currency_code })}
                </span>
              )}
              {!hasDiscount && adjustmentsSum > 0 && (
                <span className="text-[10px] text-gray-400 line-through">
                  {convertToLocale({ amount: lineTotal, currency_code })}
                </span>
              )}
              <span
                className={`text-sm font-semibold ${
                  hasDiscount || adjustmentsSum > 0 ? "text-amber-700" : "text-gray-900"
                }`}
                data-testid="product-price"
              >
                {convertToLocale({ amount: finalTotal, currency_code })}
              </span>
            </div>

            {/* Supprimer l'article */}
            <div className="flex items-center flex-shrink-0">
              <button
                type="button"
                onClick={() => handleRemove(item)}
                disabled={removingId === item.id}
                aria-label="Supprimer l'article"
                title="Supprimer l'article"
                data-testid="cart-item-remove-button"
                className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-wait"
              >
                {removingId === item.id ? (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ItemsPreviewTemplate
