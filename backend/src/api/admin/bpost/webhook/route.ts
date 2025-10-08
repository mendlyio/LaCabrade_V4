import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { BPOST_MODULE } from "../../../../modules/bpost"
import BpostModuleService from "../../../../modules/bpost/service"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const rawBody = JSON.stringify(req.body)
    const signature = req.headers["x-bpost-signature"] as string
    const event = req.body as any

    // Validation de la signature webhook
    const svc = req.scope.resolve(BPOST_MODULE) as BpostModuleService
    if (signature) {
      const isValid = svc.validateWebhookSignature(rawBody, signature)
      if (!isValid) {
        console.error("[Bpost Webhook] Signature invalide")
        return res.status(401).json({ error: "Signature invalide" })
      }
    } else {
      console.warn("[Bpost Webhook] Signature manquante")
    }

    console.log("[Bpost Webhook] Reçu:", event)

    const orderService = req.scope.resolve(Modules.ORDER)

    if (event?.shipment_id && event?.status) {
      // AMÉLIORATION: Utiliser une table de mapping ou un index custom pour éviter de charger toutes les commandes
      // Pour l'instant, on scanne sans paramètre (compatibilité types)
      const orders = await orderService.listOrders({})
      const matched = orders.find((o: any) => o.metadata?.bpost_shipment_id === event.shipment_id)
      if (matched) {
        console.log(`[Bpost Webhook] Mise à jour commande ${matched.id}: ${event.status}`)
        await orderService.updateOrders([{
          id: matched.id,
          metadata: {
            ...matched.metadata,
            bpost_status: event.status,
            bpost_tracking: event.tracking_number || matched.metadata?.bpost_tracking
          }
        }])
      } else {
        console.warn(`[Bpost Webhook] Commande non trouvée pour shipment_id: ${event.shipment_id}`)
      }
    }

    return res.json({ received: true })
  } catch (e: any) {
    console.error("[Bpost Webhook] Erreur:", e)
    return res.status(500).json({ error: e.message })
  }
}


