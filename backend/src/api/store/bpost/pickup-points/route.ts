import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { BPOST_MODULE } from "../../../../modules/bpost"
import BpostModuleService from "../../../../modules/bpost/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    // Accepter postal_code ou postalCode (+ city/street/cart_id optionnels)
    const { postal_code, postalCode, country = "BE", limit = "20", offset = "0", q = "", city, street, cart_id, cartId } =
      req.query as any
    const svc = req.scope.resolve(BPOST_MODULE) as BpostModuleService
    const cartService = req.scope.resolve(Modules.CART)
    const lim = parseInt(limit)
    const off = parseInt(offset)

    // Validation minimale
    const cc = String(country || "BE").toUpperCase()
    const pc = String(postal_code || postalCode || "").trim()

    // Récupérer ville/rue depuis le cart si fourni
    let cityFromCart = city || ""
    let streetFromCart = street || ""
    const cartIdToUse = cart_id || cartId
    if (cartIdToUse) {
      try {
        const cart = await cartService.retrieveCart(cartIdToUse)
        cityFromCart = cart?.shipping_address?.city || cityFromCart
        streetFromCart = cart?.shipping_address?.address_1 || streetFromCart
      } catch (e) {
        // ignore
      }
    }

    console.log(
      "[Bpost API] Recherche points relais - postal_code:",
      pc,
      "country:",
      cc,
      "city:",
      cityFromCart,
      "street:",
      streetFromCart
    )
    
    if (!pc) {
      return res.status(200).json({ points: [], total: 0, limit: lim, offset: off, q, error: "Code postal requis" })
    }
    if (cc === "BE" && !/^\d{4}$/.test(pc)) {
      return res.status(200).json({ points: [], total: 0, limit: lim, offset: off, q, error: "Code postal belge invalide (4 chiffres requis)" })
    }

    const result = await svc.listPickupPoints({
      postalCode: pc,
      country: cc,
      limit: lim,
      offset: off,
      q,
      city: cityFromCart,
      street: streetFromCart,
    })
    console.log("[Bpost API] Résultat:", result.points?.length || 0, "points trouvés")
    
    // Transformer les points au format attendu par le frontend
    const transformedPoints = (result.points || []).map((point: any) => ({
      Id: point.PointId || point.Id,
      Name: point.Information?.Name || point.Name || "Point relais",
      Address: {
        Streetname1: point.Information?.Address || point.Address?.Streetname1 || "",
        Streetname2: point.Address?.Streetname2 || "",
        PostalCode: point.Information?.ZipCode || point.Address?.PostalCode || "",
        City: point.Information?.City || point.Address?.City || "",
        Country: point.Information?.Country || point.Address?.Country || cc,
      },
      Location: {
        Latitude: point.Lat || point.Location?.Latitude || "",
        Longitude: point.Long || point.Location?.Longitude || "",
      },
      Distance: point.Distance || "",
      Type: point.Type || 1,
    }))
    
    // Toujours retourner 200 avec les données ou l'erreur
    return res.status(200).json({ 
      points: transformedPoints, 
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


