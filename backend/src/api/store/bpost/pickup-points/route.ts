import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BPOST_MODULE } from "../../../../modules/bpost"
import BpostModuleService from "../../../../modules/bpost/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    // Accepter postal_code ou postalCode
    const { postal_code, postalCode, country = "BE", limit = "20", offset = "0", q = "" } = req.query as any
    const svc = req.scope.resolve(BPOST_MODULE) as BpostModuleService
    const lim = parseInt(limit)
    const off = parseInt(offset)

    // Validation minimale pour éviter les erreurs de l'API Bpost
    const cc = String(country || "BE").toUpperCase()
    const pc = String(postal_code || postalCode || "").trim()
    
    console.log("[Bpost API] Recherche points relais - postal_code:", pc, "country:", cc)
    
    if (!pc) {
      return res.json({ points: [], total: 0, limit: lim, offset: off, q, error: "Code postal requis" })
    }
    if (cc === "BE" && !/^\d{4}$/.test(pc)) {
      return res.json({ points: [], total: 0, limit: lim, offset: off, q, error: "Code postal belge invalide (4 chiffres requis)" })
    }

    const { points, total } = await svc.listPickupPoints({ postalCode: pc, country: cc, limit: lim, offset: off, q })
    console.log("[Bpost API] Résultat:", points?.length || 0, "points trouvés")
    return res.json({ points, total, limit: parseInt(limit), offset: parseInt(offset), q })
  } catch (e: any) {
    console.error("[Bpost API] Erreur:", e.message)
    return res.status(500).json({ error: e.message, points: [], total: 0 })
  }
}


