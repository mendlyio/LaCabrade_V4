"use client"

import { formatAmount, formatAmountFromCents } from "@lib/util/money"
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
    subtotal,
    tax_total,
    shipping_total,
    discount_total,
    gift_card_total,
    items,
    metadata,
    shipping_address,
  } = totals

  const isGiftCardItem = (i: any) =>
    !!i?.metadata?.is_gift_card ||
    ((i?.product_title || "").toLowerCase().includes("bon cadeau")) ||
    ((i?.title || "").toLowerCase().includes("bon cadeau")) ||
    ((i?.variant_title || "").toLowerCase().includes("bon cadeau")) ||
    ((i?.variant_sku || "").startsWith("GC-")) ||
    (i?.variant?.product as any)?.handle === "bon-cadeau"

  const itemsSubtotal =
    Array.isArray(items) && items.length
      ? items.reduce((acc, item) => {
          const lineSubtotal =
            typeof item.subtotal === "number"
              ? item.subtotal
              : typeof item.unit_price === "number"
                ? (item.unit_price || 0) * (item.quantity || 0)
                : 0
          const isGiftCard = isGiftCardItem(item)
          const value = isGiftCard ? (lineSubtotal || 0) / 100 : (lineSubtotal || 0)
          return acc + value
        }, 0)
      : null

  const hasGiftCardInItems =
    Array.isArray(items) && items.some((i: any) => isGiftCardItem(i))

  // Quand le panier contient un bon cadeau : Medusa retourne total/subtotal en centimes
  const toEuros = (cents: number | null | undefined) => (cents ?? 0) / 100
  const displayedSubtotal =
    itemsSubtotal ?? (hasGiftCardInItems && subtotal != null ? toEuros(subtotal) : (subtotal ?? 0))

  // Vérifier si le client bénéficie de l'exonération TVA intracommunautaire
  const vatNumber = (metadata as any)?.vat_number || null
  const customerCountry = shipping_address?.country_code?.toLowerCase()
  const isIntraCommunityExempt = !!(vatNumber && customerCountry && customerCountry !== "be")

  const giftCardDeduction = gift_card_total != null ? gift_card_total / 100 : 0

  // TVA par défaut 21% quand tax_total n'est pas encore calculé (ex: avant adresse de livraison)
  const DEFAULT_VAT_RATE = 0.21
  const taxFromApi = hasGiftCardInItems ? toEuros(tax_total) : (tax_total ?? 0)
  const hasTaxFromApi = taxFromApi != null && taxFromApi > 0
  const baseForVat = displayedSubtotal - (hasGiftCardInItems ? toEuros(discount_total) : (discount_total ?? 0))
  const defaultVat = baseForVat * DEFAULT_VAT_RATE

  const displayedTaxTotal =
    isIntraCommunityExempt ? 0 : (hasTaxFromApi ? taxFromApi : defaultVat)
  const vatDeduction = isIntraCommunityExempt ? (hasGiftCardInItems ? toEuros(tax_total) : (tax_total ?? 0)) : 0

  // Recalculer le total si panier mixte (produits en euros + bon cadeau en centimes)
  // Quand hasGiftCardInItems : discount, shipping, tax, total de l'API sont en centimes
  const effectiveTaxForTotal = isIntraCommunityExempt ? 0 : (hasTaxFromApi ? taxFromApi : defaultVat)
  const displayedTotal =
    hasGiftCardInItems && itemsSubtotal != null
      ? itemsSubtotal -
        toEuros(discount_total) +
        toEuros(shipping_total) +
        effectiveTaxForTotal -
        giftCardDeduction
      : hasGiftCardInItems && total != null
        ? toEuros(total) - (isIntraCommunityExempt ? toEuros(tax_total) : 0) + (!isIntraCommunityExempt && !hasTaxFromApi ? effectiveTaxForTotal : 0)
        : isIntraCommunityExempt
          ? (total ?? 0) - vatDeduction
          : hasTaxFromApi
            ? (total ?? 0)
            : displayedSubtotal - (hasGiftCardInItems ? toEuros(discount_total) : (discount_total ?? 0)) + (hasGiftCardInItems ? toEuros(shipping_total) : (shipping_total ?? 0)) + effectiveTaxForTotal - giftCardDeduction

  return (
    <div>
      <div className="flex flex-col gap-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Sous-total</span>
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
              data-value={hasGiftCardInItems ? toEuros(discount_total) : (discount_total || 0)}
            >
              - {formatAmount(hasGiftCardInItems ? toEuros(discount_total) : (discount_total ?? 0), currency_code)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-gray-600">Livraison</span>
          <span className="font-medium text-gray-900" data-testid="cart-shipping" data-value={hasGiftCardInItems ? toEuros(shipping_total) : (shipping_total || 0)}>
            {shipping_total
              ? formatAmount(hasGiftCardInItems ? toEuros(shipping_total) : shipping_total, currency_code)
              : <span className="text-gray-400 italic text-xs">Calculé à l'étape suivante</span>
            }
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600 flex items-center gap-1">
            TVA {!hasTaxFromApi && !isIntraCommunityExempt && (
              <span className="text-[10px] text-gray-400 font-normal">(21% par défaut)</span>
            )}
            {isIntraCommunityExempt && (
              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">
                Exonéré
              </span>
            )}
          </span>
          <span className={`font-medium ${isIntraCommunityExempt ? "text-emerald-600" : "text-gray-900"}`} data-testid="cart-taxes" data-value={displayedTaxTotal}>
            {isIntraCommunityExempt ? (
              <span className="flex items-center gap-1.5">
                <span className="line-through text-gray-400 text-xs">
                  {formatAmount(hasGiftCardInItems ? toEuros(tax_total) : (tax_total ?? 0), currency_code)}
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

      {/* Info exonération TVA intracommunautaire */}
      {isIntraCommunityExempt && (
        <div className="mt-3 flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
          <svg className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <div className="text-[11px] text-emerald-700 leading-snug">
            <span className="font-semibold">Exonération TVA — Autoliquidation</span>
            <br />
            N° TVA : {vatNumber}. La TVA sera appliquée dans votre pays selon le mécanisme d'autoliquidation (art. 196 Directive 2006/112/CE).
          </div>
        </div>
      )}

      <div className="h-px w-full bg-gray-200 my-4" />

      <div className="flex items-center justify-between">
        <span className="text-base font-bold text-gray-900">
          Total
          {isIntraCommunityExempt && <span className="text-xs font-normal text-gray-500 ml-1">HT</span>}
        </span>
        <span
          className="text-xl font-bold text-gray-900"
          data-testid="cart-total"
          data-value={displayedTotal || 0}
        >
          {formatAmount(displayedTotal, currency_code)}
        </span>
      </div>

      {/* Info TVA pour les clients B2C (sans numéro de TVA) */}
      {!isIntraCommunityExempt && (
        <p className="text-[11px] text-gray-400 mt-1 text-right">TVA incluse</p>
      )}
    </div>
  )
}

export default CartTotals
