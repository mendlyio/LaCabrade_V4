import { HttpTypes } from "@medusajs/types"
import { getPercentageDiff } from "./get-precentage-diff"
import { convertToLocale } from "./money"

/**
 * Les produits Odoo sont stockés en EUROS (ex: 50 pour 50€).
 * Le bon cadeau (produit + custom) utilise les centimes.
 */
function isGiftCardVariant(variant: any): boolean {
  return (variant?.product as any)?.handle === "bon-cadeau"
}

/**
 * @param variant - Le variant du produit
 * @param lineItemUnitPrice - Prix unitaire du line item (panier/commande). Pour bon cadeau custom, prioritaire car unit_price peut différer du variant.
 */
export const getPricesForVariant = (variant: any, lineItemUnitPrice?: number) => {
  const isGiftCard = isGiftCardVariant(variant)
  const cp = variant?.calculated_price

  // Bon cadeau custom : utiliser unit_price du line item (stocké en centimes)
  if (isGiftCard && lineItemUnitPrice != null && Number.isFinite(lineItemUnitPrice)) {
    const amount = lineItemUnitPrice / 100
    return {
      calculated_price_number: amount,
      calculated_price: convertToLocale({
        amount,
        currency_code: cp?.currency_code ?? "eur",
      }),
      original_price_number: amount,
      original_price: convertToLocale({
        amount,
        currency_code: cp?.currency_code ?? "eur",
      }),
      currency_code: cp?.currency_code ?? "eur",
      price_type: undefined,
      percentage_diff: 0,
    }
  }

  const rawAmount = cp?.calculated_amount ?? cp?.original_amount
  if (rawAmount == null || !Number.isFinite(rawAmount)) {
    return null
  }
  const divisor = isGiftCard ? 100 : 1
  const amount = rawAmount / divisor
  const originalAmount = cp.original_amount != null ? cp.original_amount / divisor : amount

  return {
    calculated_price_number: amount,
    calculated_price: convertToLocale({
      amount,
      currency_code: cp.currency_code,
    }),
    original_price_number: originalAmount,
    original_price: convertToLocale({
      amount: originalAmount,
      currency_code: cp.currency_code,
    }),
    currency_code: cp.currency_code,
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

    const getAmount = (v: any) =>
      v?.calculated_price?.calculated_amount ?? v?.calculated_price?.original_amount ?? Infinity

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
