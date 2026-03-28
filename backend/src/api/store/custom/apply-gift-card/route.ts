import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import type { ICartModuleService } from "@medusajs/framework/types"
import { GIFT_CARD_TRACKING_MODULE } from "../../../../modules/gift-card-tracking/constants"

type AppliedGiftCard = { code: string; balance: number }

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { cart_id, code } = req.body as { cart_id?: string; code?: string }

    if (!cart_id || !code) {
      return res.status(400).json({ message: "cart_id et code sont requis" })
    }

    const normalizedCode = code.toUpperCase().trim()
    // Accepte les nouveaux codes LC-XXXX-XXXX-XXXX ET les codes importés XXXX-XXXX-XXXX-XXXX
    const gcPattern = /^(LC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}|[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4})$/
    if (!gcPattern.test(normalizedCode)) {
      return res.status(400).json({ message: "Format de code invalide" })
    }

    const giftCardService = req.scope.resolve(GIFT_CARD_TRACKING_MODULE) as any
    const [giftCards] = await giftCardService.listAndCountGiftCards(
      { code: normalizedCode },
      { take: 1 }
    )

    if (!giftCards.length) {
      return res.status(404).json({ message: "Bon cadeau introuvable" })
    }

    const gc = giftCards[0]
    if (gc.status === "depleted" || gc.status === "disabled") {
      return res.status(400).json({ message: "Ce bon cadeau a déjà été entièrement utilisé" })
    }

    const balance = Number(gc.balance)
    if (balance <= 0) {
      return res.status(400).json({ message: "Ce bon cadeau n'a plus de solde" })
    }

    const cartModuleService = req.scope.resolve(Modules.CART) as ICartModuleService
    const cart = await cartModuleService.retrieveCart(cart_id, { select: ["id", "metadata"] })

    const existing: AppliedGiftCard[] =
      (cart.metadata as any)?.applied_gift_cards ?? []

    if (existing.some((g) => g.code === normalizedCode)) {
      return res.status(400).json({ message: "Ce bon cadeau est déjà appliqué" })
    }

    const updated = [...existing, { code: normalizedCode, balance }]

    await cartModuleService.updateCarts([
      {
        id: cart_id,
        metadata: { ...(cart.metadata ?? {}), applied_gift_cards: updated },
      },
    ])

    return res.json({
      gift_card: {
        code: normalizedCode,
        original_amount: Number(gc.original_amount),
        balance,
        status: gc.status,
      },
    })
  } catch (error: any) {
    console.error("[apply-gift-card] Error:", error.message)
    return res.status(500).json({ message: error.message })
  }
}
