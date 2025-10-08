import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BPOST_MODULE } from "../../../../modules/bpost"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const svc = req.scope.resolve(BPOST_MODULE)
    const status = await svc.ping()
    return res.json({ configured: true, connected: status.ok, accountId: status.accountId })
  } catch (e: any) {
    return res.json({ configured: false, connected: false, error: e.message })
  }
}


