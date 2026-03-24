import { clx } from "@medusajs/ui"

import { isGiftCardItem, lineItemAmountToEuros, adjustmentHtToTtc } from "@lib/util/cart-amounts"
import { getPercentageDiff } from "@lib/util/get-precentage-diff"
import { getPricesForVariant } from "@lib/util/get-product-price"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type LineItemPriceProps = {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
  style?: "default" | "tight"
}

const LineItemPrice = ({ item, style = "default" }: LineItemPriceProps) => {
  const compareAt =
    (item as any).compare_at_unit_price ??
    (item.metadata as any)?.outlet_original_price
  const { currency_code, calculated_price_number, original_price_number } =
    getPricesForVariant(item.variant, item.unit_price, compareAt) ?? {}

  const isGiftCard = isGiftCardItem(item as any)
  const adjustmentsHtSum = (item.adjustments || []).reduce(
    (acc, adjustment) => acc + lineItemAmountToEuros(adjustment.amount, isGiftCard),
    0
  )
  const adjustmentsSum = Math.round(adjustmentHtToTtc(adjustmentsHtSum, isGiftCard) * 100) / 100

  const originalPrice = original_price_number * item.quantity
  const currentPrice = calculated_price_number * item.quantity - adjustmentsSum
  const hasReducedPrice = currentPrice < originalPrice

  return (
    <div className="flex flex-col gap-x-2 text-ui-fg-subtle items-end">
      <div className="text-left">
        {hasReducedPrice && (
          <>
            <p>
              {style === "default" && (
                <span className="text-ui-fg-subtle">Original: </span>
              )}
              <span
                className="line-through text-ui-fg-muted"
                data-testid="product-original-price"
              >
                {convertToLocale({
                  amount: originalPrice,
                  currency_code,
                })}
              </span>
            </p>
            {style === "default" && (
              <span className="text-ui-fg-interactive">
                -{getPercentageDiff(originalPrice, currentPrice || 0)}%
              </span>
            )}
          </>
        )}
        <span
          className={clx("text-base-regular", {
            "text-ui-fg-interactive": hasReducedPrice,
          })}
          data-testid="product-price"
        >
          {convertToLocale({
            amount: currentPrice,
            currency_code,
          })}
        </span>
      </div>
    </div>
  )
}

export default LineItemPrice
