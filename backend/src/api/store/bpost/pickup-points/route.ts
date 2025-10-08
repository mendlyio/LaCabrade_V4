import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BPOST_MODULE } from "../../../../modules/bpost"
import BpostModuleService from "../../../../modules/bpost/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { postal_code, country = "BE", limit = "20", offset = "0", q = "" } = req.query as any
    const svc = req.scope.resolve(BPOST_MODULE) as BpostModuleService
    const lim = parseInt(limit)
    const off = parseInt(offset)

    // Validation minimale pour éviter les erreurs de l'API Bpost
    const cc = String(country || "BE").toUpperCase()
    const pc = String(postal_code || "").trim()
    if (!pc) {
      return res.json({ points: [], total: 0, limit: lim, offset: off, q })
    }
    if (cc === "BE" && !/^\d{4}$/.test(pc)) {
      return res.json({ points: [], total: 0, limit: lim, offset: off, q })
    }

    const { points, total } = await svc.listPickupPoints({ postalCode: pc, country: cc, limit: lim, offset: off, q })
    return res.json({ points, total, limit: parseInt(limit), offset: parseInt(offset), q })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}


