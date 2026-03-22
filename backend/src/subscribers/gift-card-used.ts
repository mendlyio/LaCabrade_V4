import { Modules } from "@medusajs/framework/utils"
import { IOrderModuleService } from "@medusajs/framework/types"
import { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa"
import { GIFT_CARD_TRACKING_MODULE } from "../modules/gift-card-tracking/constants"

type AppliedGiftCard = { code: string; balance: number }

/**
 * Debits gift card balances when an order is placed.
 * Reads applied gift cards from order.metadata.applied_gift_cards
 * (transferred from cart metadata by transfer-cart-metadata subscriber).
 *
 * Each gift card covers up to its balance of the order total (TTC).
 * Multiple gift cards are applied in order: first GC covers as much as
 * possible, then the next one covers the remainder, etc.
 */
export default async function giftCardUsedHandler({
  event: { data },
  container,
}: SubscriberArgs<any>) {
  let giftCardTrackingService: any
  try {
    giftCardTrackingService = container.resolve(GIFT_CARD_TRACKING_MODULE)
  } catch {
    return
  }

  const orderModuleService: IOrderModuleService = container.resolve(Modules.ORDER)
  const promotionModuleService = container.resolve(Modules.PROMOTION) as any

  try {
    const order = await orderModuleService.retrieveOrder(data.id, {
      relations: ["items"],
    })

    const appliedGiftCards: AppliedGiftCard[] =
      (order.metadata as any)?.applied_gift_cards ?? []

    if (appliedGiftCards.length === 0) {
      return
    }

    console.log(
      `[GiftCard Used] Bon(s) cadeau(x) dans commande ${order.id}:`,
      appliedGiftCards.map((g) => g.code)
    )

    // Compute order total in euros (items are in euros for Odoo products).
    // shipping_total, discount_total are also in euros.
    const itemTotalEuros = (order.items || []).reduce((sum, item: any) => {
      const isGC = !!(item.metadata as any)?.is_gift_card
      const unitPrice = Number(item.unit_price ?? 0)
      const price = isGC ? unitPrice / 100 : unitPrice
      return sum + price * (item.quantity ?? 1)
    }, 0)

    const shippingEuros = Number((order as any).shipping_total ?? 0)
    const discountEuros = Number((order as any).discount_total ?? 0)
    let remainingTotal = Math.max(0, itemTotalEuros + shippingEuros - discountEuros)

    for (const applied of appliedGiftCards) {
      if (remainingTotal <= 0) break

      try {
        const [giftCards] = await giftCardTrackingService.listAndCountGiftCards(
          { code: applied.code },
          { take: 1 }
        )

        if (!giftCards.length) {
          console.warn(`[GiftCard Used] Code ${applied.code} non trouvé dans le tracking`)
          continue
        }

        const gc = giftCards[0]
        if (gc.status === "disabled" || gc.status === "depleted") {
          continue
        }

        const currentBalance = Number(gc.balance)
        const deducted = Math.min(currentBalance, remainingTotal)
        remainingTotal -= deducted

        const newBalance = Math.max(0, currentBalance - deducted)
        const newStatus = newBalance <= 0 ? "depleted" : "active"

        await giftCardTrackingService.updateGiftCards([
          { id: gc.id, balance: newBalance, status: newStatus },
        ])

        console.log(
          `[GiftCard Used] ${applied.code}: -${deducted}€, solde: ${newBalance}€ (${newStatus})`
        )

        if (newBalance > 0 && gc.promotion_id) {
          try {
            await promotionModuleService.updatePromotions([
              { id: gc.promotion_id, application_method: { value: newBalance } },
            ])
          } catch (e: any) {
            console.warn(
              `[GiftCard Used] Could not update promotion value for ${applied.code}:`,
              e.message
            )
          }
        }

        if (newStatus === "depleted" && gc.promotion_id) {
          try {
            await promotionModuleService.updatePromotions([
              { id: gc.promotion_id, status: "disabled" },
            ])
          } catch (e: any) {
            console.warn(
              `[GiftCard Used] Could not disable promotion for depleted ${applied.code}:`,
              e.message
            )
          }
        }
      } catch (e: any) {
        console.error(`[GiftCard Used] Error processing code ${applied.code}:`, e.message)
      }
    }
  } catch (error: any) {
    console.error("[GiftCard Used] General error:", error.message)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
