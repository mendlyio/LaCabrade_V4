"use client"

import {
  centsToEuros,
  getDisplayTotalTvacEuros,
  getItemsDisplayTotalEuros,
  isIntraCommunityExempt,
} from "@lib/util/cart-amounts"
import { formatAmount, formatAmountFromCents } from "@lib/util/money"
import React from "react"

type CartTotalsProps = {
  totals: {
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
    total,
    metadata,
    shipping_address,
  }

  const exempt = isIntraCommunityExempt(cartInput)
  const toEuros = centsToEuros

  // Tous les montants API sont en centimes. Sous-total articles TVAC (ou HT si exempt).
  const displayedSubtotal = getItemsDisplayTotalEuros(cartInput)

  // Livraison, réduction, carte cadeau : centimes → euros
  const shippingEuros = toEuros(shipping_total)
  const discountEuros = toEuros(discount_total)
  const giftCardDeduction = toEuros(gift_card_total)

  // TVA affichée : 0 si exempt, sinon tax_total
  const displayedTaxTotal = exempt ? 0 : toEuros(tax_total ?? 0)

  // Total TVAC (ou HT si exempt)
  const displayedTotal = getDisplayTotalTvacEuros(cartInput)

  return (
    <div>
      <div className="flex flex-col gap-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">
            Sous-total {exempt ? "(HT)" : "(TVAC)"}
          </span>
          <span className="font-medium text-gray-900" data-testid="cart-subtotal" data-value={displayedSubtotal || 0}>
            {formatAmount(displayedSubtotal, currency_code)}
          </span>
        </div>

        {!!discount_total && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Réduction</span>
            <span
              className="font-medium text-green-600"
              data-testid="cart-discount"
              data-value={discountEuros}
            >
              - {formatAmount(discountEuros, currency_code)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-gray-600">Livraison</span>
          <span className="font-medium text-gray-900" data-testid="cart-shipping" data-value={shippingEuros}>
            {shipping_total
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
            {exempt ? (
              <span className="flex items-center gap-1.5">
                <span className="line-through text-gray-400 text-xs">
                  {formatAmount(toEuros(tax_total), currency_code)}
                </span>
                <span>{formatAmount(0, currency_code)}</span>
              </span>
            ) : (
              formatAmount(displayedTaxTotal, currency_code)
            )}
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
              - {formatAmountFromCents(gift_card_total ?? 0, currency_code)}
            </span>
          </div>
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
