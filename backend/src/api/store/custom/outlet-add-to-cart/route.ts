import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { ICartModuleService } from "@medusajs/framework/types"

const OUTLET_HANDLES = ["outlet", "outlet-727"]

// ─── Remise outlet ────────────────────────────────────────────────────────────
// Pendant les Portes Ouvertes 2026 (1–9 mai, heure belge = UTC+2) : -60%
// Le reste de l'année : -50% (valeur par défaut)
const PO_START = new Date("2026-04-30T22:00:00.000Z") // 1 mai 00:00 BEL
const PO_END = new Date("2026-05-09T21:59:59.000Z")   // 9 mai 23:59 BEL

function getOutletDiscountPercent(): number {
  const now = new Date()
  if (now >= PO_START && now <= PO_END) return 60
  return 50
}

/** IDs des catégories outlet (racine + sous-catégories) */
function getOutletCategoryIds(
  categoryId: string,
  byId: Map<string, { id: string; parent_category_id?: string | null }>
): string[] {
  const ids: string[] = [categoryId]
  for (const [cid, cat] of byId) {
    if (cat.parent_category_id === categoryId) {
      ids.push(...getOutletCategoryIds(cid, byId))
    }
  }
  return ids
}

/**
 * POST /store/custom/outlet-add-to-cart
 *
 * Ajoute un produit outlet au panier avec -50% appliqué directement sur le line item.
 * Vérifie côté serveur que le produit appartient bien à la catégorie outlet (ou sous-catégorie).
 *
 * Body: { cart_id: string, variant_id: string, quantity?: number }
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const { cart_id, variant_id, quantity: qty = 1 } = req.body as {
      cart_id: string
      variant_id: string
      quantity?: number
    }

    if (!cart_id || !variant_id) {
      res.status(400).json({
        message: "cart_id et variant_id sont requis",
      })
      return
    }

    const quantity = Math.max(1, Math.floor(Number(qty) || 1))

    const productModuleService = req.scope.resolve(Modules.PRODUCT) as any
    const workflowEngine = req.scope.resolve(Modules.WORKFLOW_ENGINE) as any
    const cartModuleService: ICartModuleService = req.scope.resolve(Modules.CART)

    // 1. Vérifier que le produit est bien en catégorie outlet
    const variant = await productModuleService.retrieveProductVariant(variant_id, {
      relations: ["product"],
    })

    if (!variant?.product_id) {
      res.status(404).json({
        message: "Variante ou produit introuvable",
      })
      return
    }

    const product = await productModuleService.retrieveProduct(variant.product_id, {
      relations: ["categories"],
    })

    // Récupérer outlet + toutes les sous-catégories (comme seed-outlet-promotion)
    const allCategories = await productModuleService.listProductCategories(
      {},
      { select: ["id", "handle", "parent_category_id"], take: 500 }
    )
    type Cat = { id: string; parent_category_id?: string | null }
    const byId = new Map<string, Cat>(allCategories.map((c: any) => [c.id, c as Cat]))
    const outletIds = new Set<string>()
    for (const h of OUTLET_HANDLES) {
      const cat = allCategories.find((c: any) => (c.handle || "").toLowerCase() === h)
      if (cat) {
        getOutletCategoryIds(cat.id, byId).forEach((id) => outletIds.add(id))
      }
    }

    const categories = (product as any).categories || []
    const isOutlet = categories.some((c: any) => outletIds.has(c.id))

    if (!isOutlet) {
      res.status(400).json({
        message: "Ce produit n'est pas éligible à la promotion outlet",
      })
      return
    }

    // 2. Ajouter l'article au panier via le workflow standard
    await workflowEngine.run("add-to-cart", {
      input: {
        cart_id,
        items: [{ variant_id, quantity }],
      },
      transactionId: `outlet-add-to-cart-${cart_id}-${Date.now()}`,
    })

    // 3. Récupérer le panier mis à jour pour trouver le line item
    const cart = await cartModuleService.retrieveCart(cart_id, {
      relations: ["items"],
    })

    // 4. Trouver le line item qui correspond au variant ajouté (le plus récent)
    const itemsForVariant = (cart.items || []).filter(
      (item: any) => item.variant_id === variant_id
    )
    const lineItem = itemsForVariant[itemsForVariant.length - 1]

    if (!lineItem) {
      res.status(200).json({ success: true, discount_applied: false })
      return
    }

    // 5. Calculer le prix réduit (% dynamique selon la période)
    const OUTLET_DISCOUNT_PERCENT = getOutletDiscountPercent()
    const originalPrice = Number(lineItem.unit_price)
    const discountedPrice = Math.round(
      originalPrice * (1 - OUTLET_DISCOUNT_PERCENT / 100)
    )

    // 6. Mettre à jour le line item avec le prix réduit + prix barré
    await cartModuleService.updateLineItems(lineItem.id, {
      unit_price: discountedPrice,
      compare_at_unit_price: originalPrice,
      metadata: {
        ...((lineItem.metadata as Record<string, unknown>) || {}),
        outlet_discount: true,
        outlet_original_price: originalPrice,
        outlet_discount_percent: OUTLET_DISCOUNT_PERCENT,
      },
    })

    console.log(
      `[Outlet] ✅ Variant ${variant_id} ajouté au cart ${cart_id} à ${discountedPrice} (original: ${originalPrice}, -${OUTLET_DISCOUNT_PERCENT}%)`
    )

    res.status(200).json({
      success: true,
      discount_applied: true,
      original_price: originalPrice,
      discounted_price: discountedPrice,
      discount_percent: OUTLET_DISCOUNT_PERCENT,
    })
  } catch (error: any) {
    console.error("[Outlet] ❌ Erreur:", error)
    res.status(500).json({
      message: error.message || "Erreur lors de l'ajout outlet",
    })
  }
}
