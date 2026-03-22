"use client"

import {
  getDisplayTaxEuros,
  getDisplayTotalTvacEuros,
  getItemsDisplayTotalEuros,
  getItemAdjustmentsEuros,
  getGiftCardDeductionEuros,
  isFreeShippingDiscount,
  isIntraCommunityExempt,
} from "@lib/util/cart-amounts"
import { formatAmount } from "@lib/util/money"
import React from "react"

type CartTotalsProps = {
  totals?: {
    total?: number | null
    item_total?: number | null
    item_tax_total?: number | null
    subtotal?: number | null
    tax_total?: number | null
    shipping_total?: number | null
    discount_total?: number | null
    gift_card_total?: number | null
    currency_code: string
    metadata?: Record<string, any> | null
    shipping_address?: { country_code?: string | null } | null
    promotions?: Array<{ code?: string | null }> | null
    items?: Array<{
      quantity?: number | null
      subtotal?: number | null
      unit_price?: number | null
      adjustments?: Array<{ code?: string | null; amount?: number | null }> | null
      metadata?: Record<string, unknown> | null
      product_title?: string | null
      title?: string | null
      variant_sku?: string | null
    }>
  } | null
}

const CartTotals: React.FC<CartTotalsProps> = ({ totals }) => {
  if (!totals) return null

  const {
    currency_code,
    item_total,
    item_tax_total,
    subtotal,
    tax_total,
    shipping_total,
    discount_total,
    gift_card_total,
    items,
    metadata,
    shipping_address,
  } = totals

  const cartInput = {
    item_total,
    item_tax_total,
    subtotal,
    tax_total,
    shipping_total,
    discount_total,
    gift_card_total,
    items,
    metadata,
    shipping_address,
  }

  const exempt = isIntraCommunityExempt(cartInput)

  const displayedSubtotal = getItemsDisplayTotalEuros(cartInput)

  // Regular discounts only (from item adjustments, no gift cards)
  let regularDiscountEuros = 0
  if (items && items.some(item => Array.isArray(item.adjustments))) {
    const adjTotal = getItemAdjustmentsEuros(cartInput)
    regularDiscountEuros = adjTotal ?? 0
  } else {
    const isFreeShip = isFreeShippingDiscount(shipping_total, discount_total)
    regularDiscountEuros = isFreeShip ? 0 : (discount_total ?? 0)
  }

  const shippingEuros = shipping_total ?? 0

  // TVA on total BEFORE gift card (GC is a payment method, not a tax reduction)
  const displayedTaxTotal = getDisplayTaxEuros(cartInput)

  // Gift card deduction from metadata (TTC, after TVA line)
  const gcDeduction = getGiftCardDeductionEuros(cartInput)

  // Final total = what the customer pays
  const displayedTotal = getDisplayTotalTvacEuros(cartInput)

  return (
    <div>
      <div className="flex flex-col gap-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">
            Sous-total (TVAC)
          </span>
          <span className="font-medium text-gray-900" data-testid="cart-subtotal" data-value={displayedSubtotal || 0}>
            {formatAmount(displayedSubtotal, currency_code)}
          </span>
        </div>

        {regularDiscountEuros > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Réduction</span>
            <span
              className="font-medium text-green-600"
              data-testid="cart-discount"
              data-value={regularDiscountEuros}
            >
              - {formatAmount(regularDiscountEuros, currency_code)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-gray-600">
            Livraison
            {shipping_total === 0 && (discount_total ?? 0) > 0 && (
              <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium ml-1.5">
                Gratuite
              </span>
            )}
          </span>
          <span className="font-medium text-gray-900" data-testid="cart-shipping" data-value={shippingEuros}>
            {shipping_total != null && (shipping_total > 0 || (discount_total ?? 0) > 0)
              ? formatAmount(shippingEuros, currency_code)
              : <span className="text-gray-400 italic text-xs">Calculé à l'étape suivante</span>
            }
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600 flex items-center gap-1">
            TVA
            {exempt && (
              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">
                Exonéré
              </span>
            )}
          </span>
          <span className={`font-medium ${exempt ? "text-emerald-600" : "text-gray-900"}`} data-testid="cart-taxes" data-value={displayedTaxTotal}>
            {formatAmount(displayedTaxTotal, currency_code)}
          </span>
        </div>

        {gcDeduction > 0 && (
          <>
            <div className="h-px w-full bg-gray-100 my-1" />
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9.375 3a1.875 1.875 0 000 3.75h1.875v4.5H3.375A1.875 1.875 0 011.5 9.375v-.75c0-1.036.84-1.875 1.875-1.875h3.193A3.375 3.375 0 019.375 3zM12.75 12h8.625c.621 0 1.125-.504 1.125-1.125v-.75a1.875 1.875 0 00-1.875-1.875h-3.193A3.375 3.375 0 0014.625 3a1.875 1.875 0 000 3.75h-1.875v4.5zm-1.5 0H1.5v6.75C1.5 19.993 2.507 21 3.75 21h6.75V12zm1.5 0V21h6.75c1.243 0 2.25-1.007 2.25-2.25V12h-9z" />
                </svg>
                Bon cadeau
              </span>
              <span
                className="font-medium text-green-600"
                data-testid="cart-gift-card-discount"
                data-value={gcDeduction}
              >
                - {formatAmount(gcDeduction, currency_code)}
              </span>
            </div>
          </>
        )}
      </div>

      {exempt && (
        <div className="mt-3 flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
          <svg className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <div className="text-[11px] text-emerald-700 leading-snug">
            <span className="font-semibold">Exonération TVA — Autoliquidation</span>
            <br />
            N° TVA : {(metadata as any)?.vat_number}. La TVA sera appliquée dans votre pays selon le mécanisme d'autoliquidation (art. 196 Directive 2006/112/CE).
          </div>
        </div>
      )}

      <div className="h-px w-full bg-gray-200 my-4" />

      <div className="flex items-center justify-between">
        <span className="text-base font-bold text-gray-900">
          Total
          {exempt && <span className="text-xs font-normal text-gray-500 ml-1">HT</span>}
        </span>
        <span
          className="text-xl font-bold text-gray-900"
          data-testid="cart-total"
          data-value={displayedTotal || 0}
        >
          {formatAmount(displayedTotal, currency_code)}
        </span>
      </div>

      {!exempt && (
        <p className="text-[11px] text-gray-400 mt-1 text-right">TVAC</p>
      )}
    </div>
  )
}

export default CartTotals
