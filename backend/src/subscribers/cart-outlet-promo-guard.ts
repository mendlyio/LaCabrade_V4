import { Modules } from "@medusajs/framework/utils"
import type { ICartModuleService } from "@medusajs/framework/types"
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa"
import { outletPriceSync } from "../utils/portes-ouvertes-octobre"

/**
 * Filet de sécurité asynchrone pour les articles outlet.
 *
 * La logique principale est dans le hook synchrone
 * backend/src/workflows/restore-outlet-prices-hook.ts qui s'exécute
 * dans refreshCartItemsWorkflow avant que la réponse soit renvoyée au
 * storefront.
 *
 * Ce subscriber intervient uniquement pour les events cart.updated
 * déclenchés HORS de refreshCartItemsWorkflow (ex: ajouts directs via
 * module service, webhooks externes, scripts de migration…).
 */
const processingCarts = new Set<string>()

export default async function cartOutletPromoGuardHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const cartId = data?.id
  if (!cartId) return
  if (processingCarts.has(cartId)) return
  processingCarts.add(cartId)

  let cartModuleService: ICartModuleService
  try {
    cartModuleService = container.resolve(Modules.CART) as ICartModuleService
  } catch {
    processingCarts.delete(cartId)
    return
  }

  try {
    const cart = await cartModuleService.retrieveCart(cartId, {
      relations: ["items"],
    })

    const outletItems = (cart.items ?? []).filter(
      (item: any) => item.metadata?.outlet_discount === true
    )
    if (outletItems.length === 0) return

    // Supprimer les adjustments résiduels sur les articles outlet
    const outletItemIds = outletItems.map((item: any) => item.id)
    const adjustments = await (cartModuleService as any)
      .listLineItemAdjustments({ item_id: outletItemIds }, { take: 200 })
      .catch(() => [])

    if (adjustments?.length > 0) {
      await (cartModuleService as any).deleteLineItemAdjustments(
        adjustments.map((a: { id: string }) => a.id)
      )
      console.log(
        `[OutletPromoGuard] Panier ${cartId}: supprimé ${adjustments.length} adjustment(s) outlet (fallback)`
      )
    }

    // Aligner le unit_price sur le % en vigueur (60 % pendant les PO d'octobre).
    const toSync = outletItems.filter((item: any) => outletPriceSync(item) != null)

    if (toSync.length > 0) {
      await Promise.all(
        toSync.map((item: any) => {
          const patch = outletPriceSync(item)!
          return cartModuleService.updateLineItems(item.id, patch)
        })
      )
      console.log(
        `[OutletPromoGuard] Panier ${cartId}: prix outlet aligné pour ${toSync.length} article(s) (fallback)`
      )
    }
  } catch (error) {
    console.error("[OutletPromoGuard] Erreur:", error)
  } finally {
    processingCarts.delete(cartId)
  }
}

export const config: SubscriberConfig = {
  event: "cart.updated",
}
