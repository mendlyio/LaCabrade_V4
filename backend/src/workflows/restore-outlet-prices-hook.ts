/**
 * Hook synchrone sur refreshCartItemsWorkflow.
 *
 * Problème fondamental :
 *   refreshCartItemsWorkflow appelle updateCartPromotionsWorkflow avec
 *   PromotionActions.REPLACE à chaque mise à jour du panier (adresse,
 *   livraison, promo…). Ce REPLACE :
 *     1. Supprime TOUS les adjustments existants
 *     2. Re-crée les adjustments depuis le moteur de promotions Medusa
 *
 *   Medusa re-applique alors automatiquement OUTLET_50 sur les articles
 *   outlet (qui ont déjà leur remise dans unit_price). Le moteur peut
 *   aussi recalculer les prix depuis le catalogue et remettre unit_price
 *   au prix plein.
 *
 *   Nos subscribers cart.updated corrigent ça — mais de façon ASYNCHRONE.
 *   Le storefront re-render AVANT qu'ils aient terminé → le client voit
 *   les mauvais prix / réductions disparues.
 *
 * Solution :
 *   Ce hook s'exécute SYNCHRONEMENT dans le workflow, juste après
 *   updateCartPromotionsWorkflow et avant que la réponse soit renvoyée
 *   au storefront. Il :
 *     1. Retire les adjustments des articles outlet (double déduction)
 *     2. Restaure unit_price / compare_at_unit_price si resetés
 *
 *   Les subscribers asynchrones (cart-outlet-promo-guard.ts) restent
 *   en place comme filet de sécurité pour les edge-cases non couverts
 *   par ce hook.
 */

import { refreshCartItemsWorkflow } from "@medusajs/medusa/core-flows"
import { StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import type { ICartModuleService } from "@medusajs/framework/types"

refreshCartItemsWorkflow.hooks.beforeRefreshingPaymentCollection(
  async ({ input }, { container }) => {
    const cartId = input.cart_id
    if (!cartId) return new StepResponse(undefined)

    let cartModuleService: ICartModuleService
    try {
      cartModuleService = container.resolve(Modules.CART) as ICartModuleService
    } catch {
      return new StepResponse(undefined)
    }

    try {
      const cart = await cartModuleService.retrieveCart(cartId, {
        relations: ["items"],
      })

      const outletItems = (cart.items ?? []).filter(
        (item: any) => item.metadata?.outlet_discount === true
      )

      if (outletItems.length === 0) return new StepResponse(undefined)

      // ── 1. Supprimer les adjustments sur les articles outlet ───────────────
      const outletItemIds = outletItems.map((item: any) => item.id)
      const adjustments = await (cartModuleService as any)
        .listLineItemAdjustments({ item_id: outletItemIds }, { take: 200 })
        .catch(() => [])

      if (adjustments?.length > 0) {
        const idsToRemove = adjustments.map((adj: { id: string }) => adj.id)
        await (cartModuleService as any).deleteLineItemAdjustments(idsToRemove)
        console.log(
          `[RestoreOutletHook] Panier ${cartId} : supprimé ${idsToRemove.length} adjustment(s) outlet`
        )
      }

      // ── 2. Restaurer unit_price / compare_at si resetés ───────────────────
      const itemsToRestore: Array<{
        id: string
        unit_price: number
        compare_at_unit_price: number
      }> = []

      for (const item of outletItems) {
        const md = item.metadata as any
        const originalPrice: number | undefined = md?.outlet_original_price
        const discountPercent: number | undefined = md?.outlet_discount_percent
        if (!originalPrice || !discountPercent) continue

        const expectedDiscountedPrice =
          Math.round(originalPrice * (1 - discountPercent / 100) * 100) / 100

        const currentUnitPrice = Number((item as any).unit_price ?? 0)
        const currentCompareAt = Number((item as any).compare_at_unit_price ?? 0)

        const priceReset = Math.abs(currentUnitPrice - originalPrice) < 0.01
        const compareAtMissing =
          currentCompareAt === 0 ||
          Math.abs(currentCompareAt - originalPrice) > 0.01

        if (priceReset || compareAtMissing) {
          itemsToRestore.push({
            id: item.id,
            unit_price: expectedDiscountedPrice,
            compare_at_unit_price: originalPrice,
          })
        }
      }

      if (itemsToRestore.length > 0) {
        await Promise.all(
          itemsToRestore.map(({ id, unit_price, compare_at_unit_price }) =>
            cartModuleService.updateLineItems(id, {
              unit_price,
              compare_at_unit_price,
            })
          )
        )
        console.log(
          `[RestoreOutletHook] Panier ${cartId} : restauré le prix outlet pour ${itemsToRestore.length} article(s) — ` +
            itemsToRestore.map((i) => `${i.id} → ${i.unit_price}€`).join(", ")
        )
      }
    } catch (error: any) {
      // Non-bloquant : le subscriber asynchrone prend le relais si besoin
      console.error("[RestoreOutletHook] Erreur:", error?.message)
    }

    return new StepResponse(undefined)
  }
)
