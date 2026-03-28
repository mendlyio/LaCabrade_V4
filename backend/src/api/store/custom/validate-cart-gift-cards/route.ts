import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import type { ICartModuleService } from "@medusajs/framework/types"
import { GIFT_CARD_TRACKING_MODULE } from "../../../../modules/gift-card-tracking/constants"

type AppliedGiftCard = { code: string; balance: number }

/**
 * POST /store/custom/validate-cart-gift-cards
 *
 * Re-validates all gift cards stored in cart.metadata.applied_gift_cards
 * against the current status in the gift-card-tracking module.
 * Removes disabled/depleted codes and refreshes balances.
 * Called before payment amount computation to prevent using disabled GCs.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { cart_id } = req.body as { cart_id?: string }

    if (!cart_id) {
      return res.status(400).json({ message: "cart_id est requis" })
    }

    const cartModuleService = req.scope.resolve(Modules.CART) as ICartModuleService
    const giftCardService = req.scope.resolve(GIFT_CARD_TRACKING_MODULE) as any

    const cart = await cartModuleService.retrieveCart(cart_id, {
      select: ["id", "metadata"],
    })

    const existing: AppliedGiftCard[] =
      (cart.metadata as any)?.applied_gift_cards ?? []

    if (existing.length === 0) {
      return res.json({ applied_gift_cards: [] })
    }

    const validated: AppliedGiftCard[] = []
    const removed: string[] = []

    for (const applied of existing) {
      try {
        const [giftCards] = await giftCardService.listAndCountGiftCards(
          { code: applied.code },
          { take: 1 }
        )

        if (!giftCards.length) {
          removed.push(applied.code)
          continue
        }

        const gc = giftCards[0]

        if (gc.status === "disabled" || gc.status === "depleted") {
          removed.push(applied.code)
          continue
        }

        const currentBalance = Number(gc.balance)
        if (currentBalance <= 0) {
          removed.push(applied.code)
          continue
        }

        validated.push({ code: applied.code, balance: currentBalance })
      } catch {
        // On ne retire pas en cas d'erreur réseau/service pour éviter les faux positifs
        validated.push(applied)
      }
    }

    if (removed.length > 0) {
      await cartModuleService.updateCarts([
        {
          id: cart_id,
          metadata: {
            ...(cart.metadata ?? {}),
            applied_gift_cards: validated,
          },
        },
      ])

      console.log(
        `[validate-cart-gift-cards] Panier ${cart_id}: retiré ${removed.join(", ")} (désactivé/épuisé)`
      )
    }

    return res.json({
      applied_gift_cards: validated,
      removed,
    })
  } catch (error: any) {
    console.error("[validate-cart-gift-cards] Error:", error.message)
    return res.status(500).json({ message: error.message })
  }
}
