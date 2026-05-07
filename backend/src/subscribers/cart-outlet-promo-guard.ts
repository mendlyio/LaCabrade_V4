import { Modules } from "@medusajs/framework/utils"
import type { ICartModuleService } from "@medusajs/framework/types"
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa"

/**
 * Protège les articles outlet lors des mises à jour du panier.
 *
 * Double rôle :
 *   1. Supprime tous les adjustments sur les articles outlet pour éviter le
 *      double-discount (le prix réduit est déjà dans unit_price).
 *   2. Restaure le prix outlet (unit_price + compare_at_unit_price) si Medusa
 *      l'a réinitialisé au prix catalogue lors du refresh du panier
 *      (comportement connu de Medusa v2 au update-cart).
 *
 * La détection se fait via metadata.outlet_discount === true.
 * Les métadonnées outlet_original_price et outlet_discount_percent sont
 * stockées par outlet-add-to-cart et servent ici de source de vérité.
 */
// Anti-boucle : empêche le subscriber de se re-déclencher sur ses propres modifications
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

    const outletItems = (cart.items || []).filter(
      (item: any) => item.metadata?.outlet_discount === true
    )

    if (outletItems.length === 0) return

    // ── 1. Supprimer les adjustments sur les articles outlet ─────────────────
    const outletItemIds = outletItems.map((item: any) => item.id)
    const adjustments = await (cartModuleService as any)
      .listLineItemAdjustments({ item_id: outletItemIds }, { take: 200 })
      .catch(() => [])

    if (adjustments?.length > 0) {
      const idsToRemove = adjustments.map((adj: { id: string }) => adj.id)
      await (cartModuleService as any).deleteLineItemAdjustments(idsToRemove)
      console.log(
        `[OutletPromoGuard] Supprimé ${idsToRemove.length} adjustment(s) sur ` +
        `${outletItemIds.length} article(s) outlet du panier ${cartId}`
      )
    }

    // ── 2. Restaurer unit_price si Medusa l'a réinitialisé au prix catalogue ─
    //
    // outlet-add-to-cart stocke dans metadata :
    //   outlet_original_price  : prix TTC avant remise (ex. 29.90)
    //   outlet_discount_percent: taux appliqué (ex. 60)
    //
    // Si Medusa a remis unit_price = original_price (ou compare_at_unit_price
    // manquant), on recalcule et on ré-applique le prix réduit.
    const itemsToRestore: Array<{ id: string; unit_price: number; compare_at_unit_price: number }> = []

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
      const compareAtMissing = currentCompareAt === 0 || Math.abs(currentCompareAt - originalPrice) > 0.01

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
          cartModuleService.updateLineItems(id, { unit_price, compare_at_unit_price })
        )
      )
      console.log(
        `[OutletPromoGuard] Restauré le prix outlet pour ${itemsToRestore.length} article(s) ` +
        `du panier ${cartId}: ` +
        itemsToRestore.map(i => `${i.id} → ${i.unit_price}€`).join(", ")
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
