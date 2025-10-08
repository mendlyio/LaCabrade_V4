import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { cart_id, pickup_point } = req.body as { cart_id: string; pickup_point: any }
    const cartService = req.scope.resolve(Modules.CART)
    const cart = await cartService.retrieveCart(cart_id)
    const updated = await cartService.updateCarts([{ id: cart_id, metadata: { ...cart.metadata, bpost_pickup_point: pickup_point } }])
    return res.json({ success: true, cart: updated })
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message })
  }
}


