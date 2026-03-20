import { Modules } from "@medusajs/framework/utils"
import type { ICartModuleService } from "@medusajs/framework/types"
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa"

/**
 * Empêche le cumul de promotions sur les articles outlet.
 *
 * Les articles outlet ont déjà -50% appliqué directement sur unit_price
 * (via outlet-add-to-cart). Medusa peut quand même leur ajouter des
 * adjustments (promo codes, OUTLET_50 auto, etc.) → il faut les retirer.
 */
export default async function cartOutletPromoGuardHandler({
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
      relations: ["items"],
    })

    const outletItemIds = (cart.items || [])
      .filter((item: any) => item.metadata?.outlet_discount === true)
      .map((item: any) => item.id)

    if (outletItemIds.length === 0) return

    const adjustments = await (cartModuleService as any).listLineItemAdjustments(
      { item_id: outletItemIds },
      { take: 200 }
    )

    if (!adjustments?.length) return

    const idsToRemove = adjustments.map((adj: { id: string }) => adj.id)

    await (cartModuleService as any).deleteLineItemAdjustments(idsToRemove)
    console.log(
      `[OutletPromoGuard] Supprimé ${idsToRemove.length} adjustment(s) sur ${outletItemIds.length} article(s) outlet du panier ${cartId}`
    )
  } catch (error) {
    console.error("[OutletPromoGuard] Erreur:", error)
  }
}

export const config: SubscriberConfig = {
  event: "cart.updated",
}
