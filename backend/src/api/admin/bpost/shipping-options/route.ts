import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const fulfillment: any = req.scope.resolve(Modules.FULFILLMENT)
    // Liste toutes les options et filtre côté serveur pour Bpost
    const options = await fulfillment.listShippingOptions?.({})
    const bpost = (Array.isArray(options) ? options : []).filter((o: any) =>
      (o?.provider_id || "").toLowerCase().includes("bpost")
    )
    return res.json({ shipping_options: bpost })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}


