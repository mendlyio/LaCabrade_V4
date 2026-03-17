import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { cartId } = req.params as { cartId?: string }

    if (!cartId) {
      return res.status(400).json({ message: "cart_id est requis" })
    }

    const orderService = req.scope.resolve(Modules.ORDER) as any

    let orders: any[] = []

    try {
      orders = await orderService.listOrders(
        { cart_id: cartId },
        {
          take: 1,
          order: { created_at: "DESC" },
          relations: ["shipping_address", "billing_address"],
        }
      )
    } catch {
      // Fallback compatible si le filtre cart_id n'est pas supporté
      const recentOrders = await orderService.listOrders(
        {},
        {
          take: 50,
          order: { created_at: "DESC" },
          relations: ["shipping_address", "billing_address"],
        }
      )

      orders = recentOrders.filter((order: any) => order.cart_id === cartId)
    }

    const order = orders?.[0]

    if (!order?.id) {
      return res.status(404).json({ message: "Commande introuvable pour ce panier" })
    }

    return res.status(200).json({
      order: {
        id: order.id,
        shipping_address: order.shipping_address ?? null,
        billing_address: order.billing_address ?? null,
      },
    })
  } catch (error: any) {
    console.error("[Store Custom] Error retrieving order by cart:", error)
    return res.status(500).json({
      message: error?.message || "Erreur lors de la récupération de la commande",
    })
  }
}
