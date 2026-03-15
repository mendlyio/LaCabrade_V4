import { Modules } from "@medusajs/framework/utils"
import type { ICartModuleService } from "@medusajs/framework/types"
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa"

const FREE_SHIPPING_THRESHOLD = 75 // 75 € minimum pour la livraison gratuite
const FREE_SHIPPING_PROMO_CODE = "FREE_SHIPPING_75"

/**
 * Détecte si un line item est un bon cadeau (prix en centimes).
 */
function isGiftCardItem(item: {
  metadata?: Record<string, unknown> | null
  product_title?: string | null
  title?: string | null
  variant_sku?: string | null
}): boolean {
  return !!(
    (item.metadata as Record<string, unknown>)?.is_gift_card ||
    String(item.product_title || item.title || "").toLowerCase().includes("bon cadeau") ||
    (item.variant_sku || "").startsWith("GC-")
  )
}

/**
 * Calcule le sous-total du panier en euros.
 * Produits Odoo : unit_price en euros. Bons cadeau : unit_price en centimes.
 */
function getCartSubtotalEuros(items: Array<{
  unit_price?: number | null
  subtotal?: number | null
  quantity?: number | null
  metadata?: Record<string, unknown> | null
  product_title?: string | null
  title?: string | null
  variant_sku?: string | null
}> | null | undefined): number {
  if (!items?.length) return 0
  let sum = 0
  for (const item of items) {
    const isGiftCard = isGiftCardItem(item)
    const unitPrice = Number(item.unit_price ?? 0)
    const qty = item.quantity ?? 1
    const lineTotal = item.subtotal != null
      ? (isGiftCard ? Number(item.subtotal) / 100 : Number(item.subtotal))
      : (isGiftCard ? unitPrice / 100 : unitPrice) * qty
    sum += lineTotal
  }
  return sum
}

/**
 * Quand le panier est mis à jour (ajout/suppression/modification d'articles),
 * retire la promotion FREE_SHIPPING_75 si le sous-total devient < 75€.
 * Medusa ne recalcule pas toujours les promotions automatiques après modification du panier.
 */
export default async function cartFreeShippingFixHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const cartId = data?.id
  if (!cartId) return

  let cartModuleService: ICartModuleService
  try {
    cartModuleService = container.resolve(Modules.CART) as ICartModuleService
  } catch {
    return
  }

  try {
    const cart = await cartModuleService.retrieveCart(cartId, {
      relations: ["items", "shipping_methods"],
    })

    const subtotalEuros = getCartSubtotalEuros(cart.items as any)
    if (subtotalEuros >= FREE_SHIPPING_THRESHOLD) return

    const shippingMethodIds = ((cart as any).shipping_methods ?? []).map((sm: { id: string }) => sm.id)
    if (shippingMethodIds.length === 0) return

    const adjustments = await (cartModuleService as any).listShippingMethodAdjustments(
      { shipping_method_id: shippingMethodIds },
      { take: 50 }
    )

    const adjustmentIdsToRemove = (adjustments ?? [])
      .filter((adj: { code?: string }) => adj.code === FREE_SHIPPING_PROMO_CODE)
      .map((adj: { id: string }) => adj.id)

    if (adjustmentIdsToRemove.length > 0) {
      await (cartModuleService as any).deleteShippingMethodAdjustments(adjustmentIdsToRemove)
      console.log(
        `[FreeShippingFix] Retrait de la promo ${FREE_SHIPPING_PROMO_CODE} pour le panier ${cartId} (sous-total: ${subtotalEuros.toFixed(2)}€ < ${FREE_SHIPPING_THRESHOLD}€)`
      )
    }
  } catch (error) {
    console.error("[FreeShippingFix] Erreur:", error)
  }
}

export const config: SubscriberConfig = {
  event: "cart.updated",
}
