import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { BPOST_WEBHOOK_SECRET } from "../../../../lib/constants"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    // Optionally verify signature using BPOST_WEBHOOK_SECRET
    const event = req.body
    const orderService = req.scope.resolve(Modules.ORDER)

    if (event?.shipment_id && event?.status) {
      // Find order(s) by metadata bpost_shipment_id and update tracking/status
      // NOTE: listOrders does not filter by metadata; fetch and scan (or store mapping separately)
      const orders = await orderService.listOrders({})
      const matched = orders.find((o: any) => o.metadata?.bpost_shipment_id === event.shipment_id)
      if (matched) {
        await orderService.updateOrders([{ id: matched.id, metadata: { ...matched.metadata, bpost_status: event.status, bpost_tracking: event.tracking_number || matched.metadata?.bpost_tracking } }])
      }
    }

    return res.json({ received: true })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}


