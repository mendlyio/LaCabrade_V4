import { Modules } from "@medusajs/framework/utils"
import type { ICartModuleService } from "@medusajs/framework/types"
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa"

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

    // Restaurer unit_price si reseté
    const toRestore = outletItems.filter((item: any) => {
      const md = item.metadata as any
      if (!md?.outlet_original_price || !md?.outlet_discount_percent) return false
      const priceReset = Math.abs(Number(item.unit_price ?? 0) - md.outlet_original_price) < 0.01
      const cmpAtMissing =
        !item.compare_at_unit_price ||
        Math.abs(Number(item.compare_at_unit_price) - md.outlet_original_price) > 0.01
      return priceReset || cmpAtMissing
    })

    if (toRestore.length > 0) {
      await Promise.all(
        toRestore.map((item: any) => {
          const md = item.metadata as any
          const discounted =
            Math.round(md.outlet_original_price * (1 - md.outlet_discount_percent / 100) * 100) / 100
          return cartModuleService.updateLineItems(item.id, {
            unit_price: discounted,
            compare_at_unit_price: md.outlet_original_price,
          })
        })
      )
      console.log(
        `[OutletPromoGuard] Panier ${cartId}: restauré prix pour ${toRestore.length} article(s) (fallback)`
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
