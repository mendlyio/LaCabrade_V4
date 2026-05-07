import { isGiftCardItem, lineItemAmountToEuros, adjustmentHtToTtc } from "@lib/util/cart-amounts"
import { getPricesForVariant } from "@lib/util/get-product-price"
import { getPercentageDiff } from "@lib/util/get-precentage-diff"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"

type LineItemUnitPriceProps = {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
  style?: "default" | "tight"
}

const LineItemUnitPrice = ({
  item,
  style = "default",
}: LineItemUnitPriceProps) => {
  const compareAt =
    (item as any).compare_at_unit_price ??
    (item.metadata as any)?.outlet_original_price

  const {
    currency_code,
    original_price_number,
    calculated_price_number,
  } = getPricesForVariant(item.variant, item.unit_price, compareAt) ?? {}

  const isGiftCard = isGiftCardItem(item as any)
  // Les articles outlet ont leur remise dans unit_price → ne pas déduire les adjustments
  const isOutlet =
    !!(item.metadata as any)?.outlet_discount ||
    (original_price_number > calculated_price_number + 0.01)

  const adjustmentsHtSum = isOutlet
    ? 0
    : (item.adjustments || []).reduce(
        (acc, adj) => acc + lineItemAmountToEuros(adj.amount, isGiftCard),
        0
      )
  const adjustmentsSum = Math.round(adjustmentHtToTtc(adjustmentsHtSum, isGiftCard) * 100) / 100

  // Prix unitaire affiché : prix calculé − réduction par unité (hors qty)
  const adjustmentPerUnit = item.quantity > 0 ? adjustmentsSum / item.quantity : 0
  const displayUnitPrice = calculated_price_number - adjustmentPerUnit

  // Prix barré : compare_at pour outlet, unit_price pour promo normale
  const originalUnitPrice = original_price_number
  const hasReducedPrice =
    calculated_price_number < original_price_number || adjustmentsSum > 0

  const currencyCode = currency_code ?? "eur"
  const percentageDiff = hasReducedPrice
    ? getPercentageDiff(originalUnitPrice, displayUnitPrice)
    : 0

  return (
    <div className="flex flex-col text-ui-fg-muted justify-center h-full">
      {hasReducedPrice && (
        <>
          <p>
            {style === "default" && (
              <span className="text-ui-fg-muted">Original: </span>
            )}
            <span
              className="line-through"
              data-testid="product-unit-original-price"
            >
              {convertToLocale({ amount: originalUnitPrice, currency_code: currencyCode })}
            </span>
          </p>
          {style === "default" && (
            <span className="text-ui-fg-interactive">-{percentageDiff}%</span>
          )}
        </>
      )}
      <span
        className={clx("text-base-regular", {
          "text-ui-fg-interactive": hasReducedPrice,
        })}
        data-testid="product-unit-price"
      >
        {convertToLocale({ amount: displayUnitPrice, currency_code: currencyCode })}
      </span>
    </div>
  )
}

export default LineItemUnitPrice
