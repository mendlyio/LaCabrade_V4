import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { GIFT_CARD_TRACKING_MODULE } from "../../../modules/gift-card-tracking/constants"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const giftCardService = req.scope.resolve(GIFT_CARD_TRACKING_MODULE) as any

    const { q, status, offset, limit } = req.query as {
      q?: string
      status?: string
      offset?: string
      limit?: string
    }

    const take = Math.min(parseInt(limit || "50", 10), 100)
    const skip = parseInt(offset || "0", 10)

    const filters: Record<string, any> = {}

    if (status && ["active", "depleted", "disabled"].includes(status)) {
      filters.status = status
    }

    const [giftCards, count] = await giftCardService.listAndCountGiftCards(
      filters,
      {
        order: { created_at: "DESC" },
        skip,
        take,
      }
    )

    let results = giftCards
    if (q) {
      const search = q.toLowerCase()
      results = giftCards.filter(
        (gc: any) =>
          gc.code.toLowerCase().includes(search) ||
          gc.recipient_email.toLowerCase().includes(search) ||
          gc.recipient_name.toLowerCase().includes(search) ||
          (gc.sender_name && gc.sender_name.toLowerCase().includes(search))
      )
    }

    return res.json({
      gift_cards: results.map((gc: any) => ({
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
      })),
      count: q ? results.length : count,
      offset: skip,
      limit: take,
    })
  } catch (error: any) {
    console.error("[GiftCard Admin] Error listing gift cards:", error.message)
    return res.status(500).json({ message: error.message })
  }
}
