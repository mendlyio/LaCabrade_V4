import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BPOST_MODULE } from "../../../../modules/bpost"
import BpostModuleService from "../../../../modules/bpost/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { postal_code, country = "BE", limit = "20", offset = "0", q = "" } = req.query as any
    const svc = req.scope.resolve(BPOST_MODULE) as BpostModuleService
    const { points, total } = await svc.listPickupPoints({ postalCode: postal_code, country, limit: parseInt(limit), offset: parseInt(offset), q })
    return res.json({ points, total, limit: parseInt(limit), offset: parseInt(offset), q })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}


