import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { ICartModuleService } from "@medusajs/framework/types"

const DISCOUNT_PERCENT = 10

/**
 * POST /store/custom/last-chance-add
 * 
 * Ajoute un produit au panier avec -10% appliqué directement sur le line item.
 * Le prix original est conservé dans compare_at_unit_price (affiché barré).
 * 
 * Body: { cart_id: string, variant_id: string }
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const { cart_id, variant_id } = req.body as {
      cart_id: string
      variant_id: string
    }

    if (!cart_id || !variant_id) {
      res.status(400).json({
        message: "cart_id et variant_id sont requis",
      })
      return
    }

    const workflowEngine = req.scope.resolve(Modules.WORKFLOW_ENGINE) as any
    const cartModuleService: ICartModuleService = req.scope.resolve(Modules.CART)

    // 1. Ajouter l'article au panier via le workflow standard
    await workflowEngine.run("add-to-cart", {
      input: {
        cart_id,
        items: [{ variant_id, quantity: 1 }],
      },
      transactionId: `last-chance-add-${cart_id}-${Date.now()}`,
    })

    // 2. Récupérer le panier mis à jour pour trouver le line item
    const cart = await cartModuleService.retrieveCart(cart_id, {
      relations: ["items"],
    })

    // 3. Trouver le line item qui correspond au variant ajouté
    const lineItem = cart.items?.find(
      (item: any) => item.variant_id === variant_id
    )

    if (!lineItem) {
      // L'article a été ajouté mais on ne le retrouve pas — on retourne quand même succès
      res.status(200).json({ success: true, discount_applied: false })
      return
    }

    // 4. Calculer le prix réduit
    const originalPrice = Number(lineItem.unit_price)
    const discountedPrice = Math.round(
      originalPrice * (1 - DISCOUNT_PERCENT / 100)
    )

    // 5. Mettre à jour le line item avec le prix réduit + prix barré
    await cartModuleService.updateLineItems(lineItem.id, {
      unit_price: discountedPrice,
      compare_at_unit_price: originalPrice,
      metadata: {
        ...((lineItem.metadata as Record<string, unknown>) || {}),
        last_chance_discount: true,
        last_chance_original_price: originalPrice,
        last_chance_discount_percent: DISCOUNT_PERCENT,
      },
    })

    console.log(
      `[LastChance] ✅ Variant ${variant_id} ajouté au cart ${cart_id} à ${discountedPrice} (original: ${originalPrice}, -${DISCOUNT_PERCENT}%)`
    )

    res.status(200).json({
      success: true,
      discount_applied: true,
      original_price: originalPrice,
      discounted_price: discountedPrice,
      discount_percent: DISCOUNT_PERCENT,
    })
  } catch (error: any) {
    console.error("[LastChance] ❌ Erreur:", error)
    res.status(500).json({
      message: error.message || "Erreur lors de l'ajout last chance",
    })
  }
}
