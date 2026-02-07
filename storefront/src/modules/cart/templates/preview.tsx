"use client"

import { convertToLocale } from "@lib/util/money"
import repeat from "@lib/util/repeat"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "@modules/products/components/thumbnail"

type ItemsTemplateProps = {
  items?: HttpTypes.StoreCartLineItem[]
}

const ItemsPreviewTemplate = ({ items }: ItemsTemplateProps) => {
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

        // Prix
        const unitPrice = item.unit_price ?? 0
        const comparePrice = (item as any).compare_at_unit_price
        const hasDiscount = comparePrice && comparePrice > unitPrice
        const lineTotal = item.subtotal ?? unitPrice * item.quantity

        // Adjustments (promotions, etc.)
        const adjustmentsSum = (item.adjustments || []).reduce(
          (acc, adj) => adj.amount + acc,
          0
        )
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
              {hasDiscount && (
                <span className="text-[10px] text-gray-400 line-through">
                  {convertToLocale({ amount: comparePrice * item.quantity, currency_code })}
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
          </div>
        )
      })}
    </div>
  )
}

export default ItemsPreviewTemplate
