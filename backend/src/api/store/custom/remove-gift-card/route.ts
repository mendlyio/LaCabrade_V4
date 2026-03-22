import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import type { ICartModuleService } from "@medusajs/framework/types"

type AppliedGiftCard = { code: string; balance: number }

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { cart_id, code } = req.body as { cart_id?: string; code?: string }

    if (!cart_id || !code) {
      return res.status(400).json({ message: "cart_id et code sont requis" })
    }

    const normalizedCode = code.toUpperCase().trim()

    const cartModuleService = req.scope.resolve(Modules.CART) as ICartModuleService
    const cart = await cartModuleService.retrieveCart(cart_id, { select: ["id", "metadata"] })

    const existing: AppliedGiftCard[] =
      (cart.metadata as any)?.applied_gift_cards ?? []

    const updated = existing.filter((g) => g.code !== normalizedCode)

    await cartModuleService.updateCarts([
      {
        id: cart_id,
        metadata: { ...(cart.metadata ?? {}), applied_gift_cards: updated },
      },
    ])

    return res.json({ success: true })
  } catch (error: any) {
    console.error("[remove-gift-card] Error:", error.message)
    return res.status(500).json({ message: error.message })
  }
}
