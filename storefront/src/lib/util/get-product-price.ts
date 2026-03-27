import { HttpTypes } from "@medusajs/types"
import { lineItemAmountToEuros } from "./cart-amounts"
import { getPercentageDiff } from "./get-precentage-diff"
import { convertToLocale } from "./money"

/**
 * Tous les produits (Odoo, bon cadeau) sont en TVAC.
 */
function isGiftCardVariant(variant: any): boolean {
  return (variant?.product as any)?.handle === "bon-cadeau"
}

/**
 * Retourne le prix en euros pour affichage.
 * Les unit_price des line items sont tous en euros.
 * Les calculated_amount du pricing module restent en centimes pour les bons cadeaux.
 */
export const getPricesForVariant = (
  variant: any,
  lineItemUnitPrice?: number,
  lineItemCompareAtUnitPrice?: number
) => {
  const isGiftCard = isGiftCardVariant(variant)
  const cp = variant?.calculated_price

  // Line item (panier) : tous les unit_price sont en euros
  if (lineItemUnitPrice != null && Number.isFinite(lineItemUnitPrice)) {
    const amount = lineItemAmountToEuros(lineItemUnitPrice)
    const compareAt = lineItemCompareAtUnitPrice != null && Number.isFinite(lineItemCompareAtUnitPrice)
      ? lineItemAmountToEuros(lineItemCompareAtUnitPrice)
      : amount
    const hasReduction = compareAt > amount
    const originalAmount = hasReduction ? compareAt : amount
    const currencyCode = cp?.currency_code ?? "eur"
    return {
      calculated_price_number: amount,
      calculated_price: convertToLocale({ amount, currency_code: currencyCode }),
      original_price_number: originalAmount,
      original_price: convertToLocale({ amount: originalAmount, currency_code: currencyCode }),
      currency_code: currencyCode,
      price_type: undefined,
      percentage_diff: hasReduction ? getPercentageDiff(originalAmount, amount) : 0,
    }
  }

  let rawAmount = cp?.calculated_amount ?? cp?.original_amount
  let currencyCode = cp?.currency_code ?? "eur"
  let amount: number
  let originalAmount: number

  // Variant prices (du pricing module Medusa) : centimes pour GC, euros pour Odoo
  if ((rawAmount == null || !Number.isFinite(rawAmount)) && variant?.prices?.length) {
    const firstPrice = variant.prices[0] as { amount?: number; currency_code?: string } | undefined
    const pAmount = firstPrice?.amount
    if (pAmount != null && Number.isFinite(pAmount) && pAmount > 0) {
      amount = isGiftCard ? pAmount / 100 : lineItemAmountToEuros(pAmount)
      originalAmount = amount
      currencyCode = (firstPrice?.currency_code || "eur").toLowerCase()
    } else {
      return null
    }
  } else if (rawAmount != null && Number.isFinite(rawAmount)) {
    // calculated_amount du pricing module : centimes pour GC, euros pour Odoo
    const divisor = isGiftCard ? 100 : 1
    amount = rawAmount / divisor
    originalAmount = cp?.original_amount != null ? cp.original_amount / divisor : amount
  } else {
    return null
  }

  return {
    calculated_price_number: amount,
    calculated_price: convertToLocale({ amount, currency_code: currencyCode }),
    original_price_number: originalAmount,
    original_price: convertToLocale({ amount: originalAmount, currency_code: currencyCode }),
    currency_code: currencyCode,
    price_type: (variant?.calculated_price as any)?.calculated_price?.price_list_type,
    percentage_diff: getPercentageDiff(originalAmount, amount),
  }
}

export function getProductPrice({
  product,
  variantId,
}: {
  product: HttpTypes.StoreProduct
  variantId?: string
}) {
  if (!product || !product.id) {
    throw new Error("No product provided")
  }

  const cheapestPrice = () => {
    if (!product || !product.variants?.length) {
      return null
    }

    const getAmount = (v: any) => {
      const cp = v?.calculated_price?.calculated_amount ?? v?.calculated_price?.original_amount
      if (cp != null && Number.isFinite(cp)) return cp
      const p = v?.prices?.[0]?.amount
      if (p != null && Number.isFinite(p) && p > 0) {
        return isGiftCardVariant(v) ? p / 100 : lineItemAmountToEuros(p)
      }
      return Infinity
    }

    const cheapestVariant: any = product.variants
      .filter((v: any) => {
        const amt = getAmount(v)
        return amt != null && amt !== Infinity && Number.isFinite(amt)
      })
      .sort((a: any, b: any) => getAmount(a) - getAmount(b))[0]

    return getPricesForVariant(cheapestVariant)
  }

  const variantPrice = () => {
    if (!product || !variantId) {
      return null
    }

    const variant: any = product.variants?.find(
      (v) => v.id === variantId || v.sku === variantId
    )

    if (!variant) {
      return null
    }

    return getPricesForVariant(variant)
  }

  return {
    product,
    cheapestPrice: cheapestPrice(),
    variantPrice: variantPrice(),
  }
}
