import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BPOST_MODULE } from "../../../../modules/bpost"
import BpostModuleService from "../../../../modules/bpost/service"
import { Modules } from "@medusajs/framework/utils"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { order_id, pickup_point_id, weight_grams, reference } = req.body as any
    const orderService = req.scope.resolve(Modules.ORDER)
    const order = await orderService.retrieveOrder(order_id)

    const svc = req.scope.resolve(BPOST_MODULE) as BpostModuleService
    // Récupérer éventuellement le point relais depuis les métadonnées de la commande
    const pickupFromMetadata = (order.metadata as any)?.bpost_pickup_point
    const inferredPickupId = pickup_point_id || pickupFromMetadata?.Id || pickupFromMetadata?.id

    const result = await svc.createShipment({
      orderId: order_id,
      recipient: {
        name: `${order.shipping_address?.first_name || ""} ${order.shipping_address?.last_name || ""}`.trim(),
        email: order.email,
        phone: order.shipping_address?.phone,
        address: {
          address_1: order.shipping_address?.address_1 || "",
          address_2: order.shipping_address?.address_2 || "",
          postal_code: order.shipping_address?.postal_code || "",
          city: order.shipping_address?.city || "",
          country_code: order.shipping_address?.country_code || "BE",
        },
      },
      pickupPointId: inferredPickupId,
      weightGrams: weight_grams,
      reference,
    })

    // Save metadata on order
    const updated = await orderService.updateOrders([{
      id: order_id,
      metadata: {
        ...order.metadata,
        bpost_shipment_id: result.shipmentId,
        bpost_tracking: result.trackingNumber,
        bpost_label_url: result.labelUrl,
      }
    }])

    return res.json({ success: true, shipment: result, order: updated })
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message })
  }
}


