import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BPOST_MODULE } from "../../../../../modules/bpost"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { id } = req.params
    const svc = req.scope.resolve(BPOST_MODULE)
    const { labelUrl } = await svc.getLabel(id)
    return res.json({ label_url: labelUrl })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}


