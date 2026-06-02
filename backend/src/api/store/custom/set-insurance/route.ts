import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import {
  getInsurableGoodsEuros,
  getInsuranceTier,
} from "../../../../utils/cart-amounts"

/**
 * POST /store/custom/set-insurance
 *
 * Active ou désactive l'assurance colis (Bpost) sur un panier.
 * Le montant (palier) est calculé CÔTÉ SERVEUR à partir de la valeur assurable
 * des articles → autoritaire, non manipulable depuis le frontend.
 *
 * Règles:
 *  - Disponible uniquement si la méthode de livraison sélectionnée est Bpost.
 *  - Indisponible au-delà de 5 000 € (à gérer manuellement / nous contacter).
 *
 * Body: { cart_id: string, enabled: boolean }
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const body = req.body as any
    const cartId = body.cart_id || body.cartId
    const enabled = body.enabled === true

    if (!cartId) {
      return res.status(400).json({ success: false, message: "cart_id est requis" })
    }

    const cartModuleService = req.scope.resolve(Modules.CART) as any
    const cart = await cartModuleService.retrieveCart(cartId, {
      relations: ["items", "shipping_methods"],
    })

    const baseMetadata = { ...((cart.metadata as Record<string, unknown>) || {}) }

    // Désactivation : retirer l'assurance des metadata
    if (!enabled) {
      delete baseMetadata.insurance
      await cartModuleService.updateCarts([{ id: cartId, metadata: baseMetadata }])
      return res.json({ success: true, enabled: false, insurance: null })
    }

    // Activation : vérifier que la livraison est bien Bpost
    const methods = (cart.shipping_methods ?? []) as Array<any>
    const isBpost = methods.some((m) => {
      const provider = String(m?.shipping_option?.provider_id || m?.provider_id || "").toLowerCase()
      const name = String(m?.name || "").toLowerCase()
      return provider.includes("bpost") || name.includes("bpost")
    })

    if (!isBpost) {
      return res.status(400).json({
        success: false,
        message: "L'assurance colis n'est disponible que pour les envois Bpost.",
      })
    }

    // Calcul du palier d'après la valeur assurable (articles TTC hors bons cadeau)
    const goodsEuros = getInsurableGoodsEuros(cart)
    const tier = getInsuranceTier(goodsEuros)

    if (!tier.available) {
      return res.status(400).json({
        success: false,
        code: "above_max",
        message:
          "La valeur du panier dépasse 5 000 €. Contactez-nous pour assurer ce colis.",
      })
    }

    const insurance = {
      enabled: true,
      amount: tier.amount,
      tier: tier.label,
      goods_value: goodsEuros,
      label: `Assurance colis (${tier.label})`,
    }

    await cartModuleService.updateCarts([
      { id: cartId, metadata: { ...baseMetadata, insurance } },
    ])

    return res.json({ success: true, enabled: true, insurance })
  } catch (e: any) {
    console.error("[set-insurance] Erreur:", e)
    return res.status(500).json({
      success: false,
      message: e.message || "Erreur lors de l'ajout de l'assurance",
    })
  }
}
