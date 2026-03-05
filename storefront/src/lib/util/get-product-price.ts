import { HttpTypes } from "@medusajs/types"
import { getPercentageDiff } from "./get-precentage-diff"
import { convertToLocale } from "./money"

export const getPricesForVariant = (variant: any) => {
  const cp = variant?.calculated_price
  const rawAmount = cp?.calculated_amount ?? cp?.original_amount
  if (rawAmount == null || !Number.isFinite(rawAmount)) {
    return null
  }
  // Medusa renvoie les montants en centimes
  const amount = rawAmount / 100

  return {
    calculated_price_number: amount,
    calculated_price: convertToLocale({
      amount,
      currency_code: cp.currency_code,
    }),
    original_price_number: cp.original_amount != null ? cp.original_amount / 100 : undefined,
    original_price: convertToLocale({
      amount: cp.original_amount != null ? cp.original_amount / 100 : amount,
      currency_code: cp.currency_code,
    }),
    currency_code: cp.currency_code,
    price_type: (variant?.calculated_price as any)?.calculated_price?.price_list_type,
    percentage_diff: getPercentageDiff(
      cp.original_amount != null ? cp.original_amount / 100 : amount,
      amount
    ),
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
