import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BPOST_MODULE } from "../../../../modules/bpost"
import BpostModuleService from "../../../../modules/bpost/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const svc = req.scope.resolve(BPOST_MODULE) as BpostModuleService
    const status = await svc.ping()
    return res.json({ configured: true, connected: status.ok })
  } catch (e: any) {
    return res.json({ configured: false, connected: false, error: e.message })
  }
}


