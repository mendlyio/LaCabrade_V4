import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { GIFT_CARD_TRACKING_MODULE } from "../../../../modules/gift-card-tracking"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const giftCardService = req.scope.resolve(GIFT_CARD_TRACKING_MODULE) as any
    const { code } = req.query as { code?: string }

    if (!code) {
      return res.status(400).json({ message: "Le paramètre 'code' est requis" })
    }

    const [giftCards] = await giftCardService.listAndCountGiftCards(
      { code: code.toUpperCase().trim() },
      { take: 1 }
    )

    if (!giftCards.length) {
      return res.status(404).json({ message: "Bon cadeau introuvable" })
    }

    const gc = giftCards[0]

    return res.json({
      gift_card: {
        code: gc.code,
        original_amount: Number(gc.original_amount),
        balance: Number(gc.balance),
        status: gc.status,
      },
    })
  } catch (error: any) {
    console.error("[GiftCard Balance] Error:", error.message)
    return res.status(500).json({ message: error.message })
  }
}
