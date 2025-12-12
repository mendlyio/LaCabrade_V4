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

    // Validation minimale
    const cc = String(country || "BE").toUpperCase()
    const pc = String(postal_code || postalCode || "").trim()
    
    console.log("[Bpost API] Recherche points relais - postal_code:", pc, "country:", cc)
    
    if (!pc) {
      return res.status(200).json({ points: [], total: 0, limit: lim, offset: off, q, error: "Code postal requis" })
    }
    if (cc === "BE" && !/^\d{4}$/.test(pc)) {
      return res.status(200).json({ points: [], total: 0, limit: lim, offset: off, q, error: "Code postal belge invalide (4 chiffres requis)" })
    }

    const result = await svc.listPickupPoints({ postalCode: pc, country: cc, limit: lim, offset: off, q })
    console.log("[Bpost API] Résultat:", result.points?.length || 0, "points trouvés")
    
    // Toujours retourner 200 avec les données ou l'erreur
    return res.status(200).json({ 
      points: result.points || [], 
      total: result.total || 0, 
      limit: lim, 
      offset: off, 
      q,
      error: (result as any).error || null
    })
  } catch (e: any) {
    console.error("[Bpost API] Erreur:", e.message)
    // Retourner 200 avec message d'erreur pour éviter les erreurs frontend
    return res.status(200).json({ 
      error: e.message || "Erreur lors de la recherche de points relais", 
      points: [], 
      total: 0 
    })
  }
}


