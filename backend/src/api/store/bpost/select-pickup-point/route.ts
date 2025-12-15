import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    // Accepter snake_case et camelCase
    const body = req.body as any
    const cartId = body.cart_id || body.cartId
    const pickupPoint = body.pickup_point || body.pickupPoint
    
    if (!cartId || !pickupPoint) {
      return res.status(400).json({ 
        success: false, 
        message: "cart_id and pickup_point are required" 
      })
    }
    
    const cartService = req.scope.resolve(Modules.CART)
    const cart = await cartService.retrieveCart(cartId)
    
    // Mettre à jour le cart avec le point relais sélectionné
    const updated = await cartService.updateCarts([{ 
      id: cartId, 
      metadata: { 
        ...cart.metadata, 
        bpost_pickup_point: pickupPoint 
      } 
    }])
    
    console.log(`[Bpost] Point relais sélectionné pour cart ${cartId}: ${pickupPoint.Name || pickupPoint.Id}`)
    
    return res.json({ success: true, cart: updated[0] })
  } catch (e: any) {
    console.error("[Bpost] Erreur sélection point relais:", e)
    return res.status(500).json({ 
      success: false, 
      message: e.message || "Erreur lors de la sélection du point relais" 
    })
  }
}


