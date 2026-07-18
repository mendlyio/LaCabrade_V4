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

/**
 * POST /admin/gift-cards/:id
 * Met à jour le solde restant (ex. dépense partielle en magasin).
 * Body: { balance: number }
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const giftCardService = req.scope.resolve(GIFT_CARD_TRACKING_MODULE) as any
    const promotionModuleService = req.scope.resolve(Modules.PROMOTION) as any
    const { id } = req.params
    const { balance } = (req.body || {}) as { balance?: number }

    if (balance === undefined || balance === null || Number.isNaN(Number(balance))) {
      return res.status(400).json({ message: "Le champ 'balance' (nombre) est requis" })
    }

    const newBalance = Math.round(Number(balance) * 100) / 100
    if (newBalance < 0) {
      return res.status(400).json({ message: "Le solde ne peut pas être négatif" })
    }

    const gc = await giftCardService.retrieveGiftCard(id)
    const original = Number(gc.original_amount)
    if (newBalance > original) {
      return res.status(400).json({
        message: `Le solde ne peut pas dépasser le montant initial (${original}€)`,
      })
    }

    const newStatus =
      newBalance <= 0
        ? "depleted"
        : gc.status === "disabled"
          ? "disabled"
          : "active"

    await giftCardService.updateGiftCards([
      { id: gc.id, balance: newBalance, status: newStatus },
    ])

    if (gc.promotion_id) {
      try {
        if (newStatus === "depleted" || newStatus === "disabled") {
          await promotionModuleService.updatePromotions([
            { id: gc.promotion_id, status: "inactive" },
          ])
        } else {
          await promotionModuleService.updatePromotions([
            {
              id: gc.promotion_id,
              status: "active",
              application_method: { value: newBalance },
            },
          ])
        }
      } catch (e: any) {
        console.warn(
          `[GiftCard Admin] Could not sync promotion ${gc.promotion_id}:`,
          e.message
        )
      }
    }

    const updated = await giftCardService.retrieveGiftCard(id)

    return res.json({
      gift_card: {
        id: updated.id,
        code: updated.code,
        original_amount: Number(updated.original_amount),
        balance: Number(updated.balance),
        spent: Number(updated.original_amount) - Number(updated.balance),
        recipient_email: updated.recipient_email,
        recipient_name: updated.recipient_name,
        sender_name: updated.sender_name,
        message: updated.message,
        order_id: updated.order_id,
        promotion_id: updated.promotion_id,
        status: updated.status,
        created_at: updated.created_at,
        updated_at: updated.updated_at,
      },
    })
  } catch (error: any) {
    console.error("[GiftCard Admin] Error updating gift card:", error.message)
    return res.status(500).json({ message: error.message })
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
          { id: gc.promotion_id, status: "inactive" },
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
