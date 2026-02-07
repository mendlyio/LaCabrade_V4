"use client"

import { convertToLocale } from "@lib/util/money"
import React from "react"

type CartTotalsProps = {
  totals: {
    total?: number | null
    subtotal?: number | null
    tax_total?: number | null
    shipping_total?: number | null
    discount_total?: number | null
    gift_card_total?: number | null
    currency_code: string
    items?: Array<{
      quantity?: number | null
      subtotal?: number | null
      unit_price?: number | null
    }>
  }
}

const CartTotals: React.FC<CartTotalsProps> = ({ totals }) => {
  const {
    currency_code,
    total,
    subtotal,
    tax_total,
    shipping_total,
    discount_total,
    gift_card_total,
    items,
  } = totals

  const itemsSubtotal =
    Array.isArray(items) && items.length
      ? items.reduce((acc, item) => {
          const lineSubtotal =
            typeof item.subtotal === "number"
              ? item.subtotal
              : typeof item.unit_price === "number"
                ? (item.unit_price || 0) * (item.quantity || 0)
                : 0
          return acc + (lineSubtotal || 0)
        }, 0)
      : null

  const displayedSubtotal = itemsSubtotal ?? subtotal ?? 0

  return (
    <div>
      <div className="flex flex-col gap-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Sous-total</span>
          <span className="font-medium text-gray-900" data-testid="cart-subtotal" data-value={displayedSubtotal || 0}>
            {convertToLocale({ amount: displayedSubtotal, currency_code })}
          </span>
        </div>

        {!!discount_total && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Réduction</span>
            <span
              className="font-medium text-green-600"
              data-testid="cart-discount"
              data-value={discount_total || 0}
            >
              - {convertToLocale({ amount: discount_total ?? 0, currency_code })}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-gray-600">Livraison</span>
          <span className="font-medium text-gray-900" data-testid="cart-shipping" data-value={shipping_total || 0}>
            {shipping_total
              ? convertToLocale({ amount: shipping_total, currency_code })
              : <span className="text-gray-400 italic text-xs">Calculé à l'étape suivante</span>
            }
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600">Taxes</span>
          <span className="font-medium text-gray-900" data-testid="cart-taxes" data-value={tax_total || 0}>
            {convertToLocale({ amount: tax_total ?? 0, currency_code })}
          </span>
        </div>

        {!!gift_card_total && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Carte cadeau</span>
            <span
              className="font-medium text-green-600"
              data-testid="cart-gift-card-amount"
              data-value={gift_card_total || 0}
            >
              - {convertToLocale({ amount: gift_card_total ?? 0, currency_code })}
            </span>
          </div>
        )}
      </div>

      <div className="h-px w-full bg-gray-200 my-4" />

      <div className="flex items-center justify-between">
        <span className="text-base font-bold text-gray-900">Total</span>
        <span
          className="text-xl font-bold text-gray-900"
          data-testid="cart-total"
          data-value={total || 0}
        >
          {convertToLocale({ amount: total ?? 0, currency_code })}
        </span>
      </div>
    </div>
  )
}

export default CartTotals
