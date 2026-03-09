import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

/**
 * POST /store/custom/clear-shipping-metadata
 *
 * Nettoie les métadonnées de livraison du panier lors d'un changement de méthode.
 * Utilisé quand l'utilisateur passe de Point Relais à Domicile (ou inversement)
 * pour réinitialiser correctement le formulaire.
 *
 * Body: {
 *   cart_id: string,
 *   clear_bpost_pickup?: boolean,  // Supprime bpost_pickup_point
 *   clear_pickup_location?: boolean, // Supprime pickup_location (retrait magasin)
 *   reset_shipping_to_billing?: boolean // Remet shipping_address = billing_address (pour domicile)
 * }
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const body = req.body as any
    const cartId = body.cart_id || body.cartId
    const clearBpostPickup = body.clear_bpost_pickup !== false && body.clearBpostPickup !== false
    const clearPickupLocation = body.clear_pickup_location !== false && body.clearPickupLocation !== false
    const resetShippingToBilling = body.reset_shipping_to_billing === true || body.resetShippingToBilling === true

    if (!cartId) {
      return res.status(400).json({
        success: false,
        message: "cart_id est requis",
      })
    }

    const cartModuleService = req.scope.resolve(Modules.CART) as any
    const cart = await cartModuleService.retrieveCart(cartId, {
      relations: ["shipping_address", "billing_address"],
    })

    const updates: any = {}

    // 1. Nettoyer les metadata (préserver vat_number, etc.)
    if (clearBpostPickup || clearPickupLocation) {
      const newMetadata = { ...((cart.metadata as Record<string, unknown>) || {}) }
      if (clearBpostPickup) delete newMetadata.bpost_pickup_point
      if (clearPickupLocation) delete newMetadata.pickup_location
      updates.metadata = newMetadata
    }

    // 2. Réinitialiser shipping_address = billing_address (pour livraison domicile)
    if (resetShippingToBilling && cart.billing_address) {
      const billing = cart.billing_address as Record<string, unknown>
      updates.shipping_address = {
        first_name: billing.first_name || "",
        last_name: billing.last_name || "",
        address_1: billing.address_1 || "",
        address_2: billing.address_2 || "",
        city: billing.city || "",
        postal_code: billing.postal_code || "",
        country_code: billing.country_code || "BE",
        province: billing.province || "",
        phone: billing.phone || "",
        company: billing.company || "",
      }
    }

    if (Object.keys(updates).length > 0) {
      await cartModuleService.updateCarts([{ id: cartId, ...updates }])
    }

    return res.json({
      success: true,
      message: "Métadonnées de livraison réinitialisées",
    })
  } catch (e: any) {
    console.error("[clear-shipping-metadata] Erreur:", e)
    return res.status(500).json({
      success: false,
      message: e.message || "Erreur lors de la réinitialisation",
    })
  }
}
