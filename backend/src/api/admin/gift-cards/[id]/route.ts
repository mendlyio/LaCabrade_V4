import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { GIFT_CARD_TRACKING_MODULE } from "../../../../modules/gift-card-tracking/constants"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const giftCardService = req.scope.resolve(GIFT_CARD_TRACKING_MODULE) as any
    const { id } = req.params

    const gc = await giftCardService.retrieveGiftCard(id)

    return res.json({
      gift_card: {
        id: gc.id,
        code: gc.code,
        original_amount: Number(gc.original_amount),
        balance: Number(gc.balance),
        spent: Number(gc.original_amount) - Number(gc.balance),
        recipient_email: gc.recipient_email,
        recipient_name: gc.recipient_name,
        sender_name: gc.sender_name,
        message: gc.message,
        order_id: gc.order_id,
        promotion_id: gc.promotion_id,
        status: gc.status,
        created_at: gc.created_at,
        updated_at: gc.updated_at,
      },
    })
  } catch (error: any) {
    console.error("[GiftCard Admin] Error retrieving gift card:", error.message)
    return res.status(404).json({ message: "Bon cadeau introuvable" })
  }
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const giftCardService = req.scope.resolve(GIFT_CARD_TRACKING_MODULE) as any
    const promotionModuleService = req.scope.resolve(Modules.PROMOTION) as any
    const { id } = req.params

    const gc = await giftCardService.retrieveGiftCard(id)

    if (gc.promotion_id) {
      try {
        await promotionModuleService.updatePromotions([
          { id: gc.promotion_id, status: "disabled" },
        ])
      } catch (e: any) {
        console.warn(
          `[GiftCard Admin] Could not disable promotion ${gc.promotion_id}:`,
          e.message
        )
      }
    }

    await giftCardService.updateGiftCards([
      { id: gc.id, status: "disabled", balance: 0 },
    ])

    return res.json({
      id: gc.id,
      object: "gift_card",
      deleted: true,
    })
  } catch (error: any) {
    console.error("[GiftCard Admin] Error deleting gift card:", error.message)
    return res.status(500).json({ message: error.message })
  }
}
