import { Modules } from "@medusajs/framework/utils"
import { IOrderModuleService } from "@medusajs/framework/types"
import { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa"
import { GIFT_CARD_TRACKING_MODULE } from "../modules/gift-card-tracking/constants"

/**
 * Detects when a gift card promotion (LC-XXXX-XXXX-XXXX) is used in an order
 * and updates the balance in the gift-card-tracking module.
 *
 * Triggered on `order.placed` - runs after gift-card-ordered but targets
 * orders that *use* a gift card code (not orders that *sell* one).
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

    // Look for applied promotions with LC- pattern (gift card codes)
    const adjustments = (order.items || []).flatMap(
      (item: any) => item.adjustments || []
    )

    const gcCodePattern = /^LC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/
    const usedCodes = new Set<string>()

    for (const adj of adjustments) {
      if (adj.code && gcCodePattern.test(adj.code)) {
        usedCodes.add(adj.code)
      }
    }

    if (usedCodes.size === 0) {
      return
    }

    console.log(
      `[GiftCard Used] Bon(s) cadeau(x) utilisé(s) dans commande ${order.id}:`,
      [...usedCodes]
    )

    for (const code of usedCodes) {
      try {
        const [giftCards] = await giftCardTrackingService.listAndCountGiftCards(
          { code },
          { take: 1 }
        )

        if (!giftCards.length) {
          console.warn(`[GiftCard Used] Code ${code} non trouvé dans le tracking`)
          continue
        }

        const gc = giftCards[0]
        if (gc.status === "disabled") {
          continue
        }

        // Calculate the total discount applied by this code
        const totalDeducted = adjustments
          .filter((adj: any) => adj.code === code)
          .reduce((sum: number, adj: any) => sum + Math.abs(Number(adj.amount || 0)), 0)

        // Amount deducted is in the same unit as order amounts (Medusa internal)
        // Promotions with target_type "order" store amounts in cents
        const deductedEuros = totalDeducted / 100

        const newBalance = Math.max(0, Number(gc.balance) - deductedEuros)
        const newStatus = newBalance <= 0 ? "depleted" : "active"

        await giftCardTrackingService.updateGiftCards([
          {
            id: gc.id,
            balance: newBalance,
            status: newStatus,
          },
        ])

        console.log(
          `[GiftCard Used] ${code}: -${deductedEuros}€, solde: ${newBalance}€ (${newStatus})`
        )

        // Also update the promotion's application_method value to the remaining balance
        // so the next use only applies the remaining amount
        if (newBalance > 0 && gc.promotion_id) {
          try {
            const newValueCents = Math.round(newBalance * 100)
            await promotionModuleService.updatePromotions([
              {
                id: gc.promotion_id,
                application_method: {
                  value: newValueCents,
                },
              },
            ])
          } catch (e: any) {
            console.warn(
              `[GiftCard Used] Could not update promotion value for ${code}:`,
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
              `[GiftCard Used] Could not disable promotion for depleted ${code}:`,
              e.message
            )
          }
        }
      } catch (e: any) {
        console.error(`[GiftCard Used] Error processing code ${code}:`, e.message)
      }
    }
  } catch (error: any) {
    console.error("[GiftCard Used] General error:", error.message)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
