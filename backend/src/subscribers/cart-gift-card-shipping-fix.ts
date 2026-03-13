import { Modules } from "@medusajs/framework/utils"
import type { ICartModuleService } from "@medusajs/framework/types"
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa"

/**
 * Détecte si un line item est un bon cadeau.
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
 * Détecte si une méthode de livraison est "Livraison numérique" (bon cadeau).
 */
function isDigitalShippingMethod(sm: { name?: string | null; data?: Record<string, unknown> }): boolean {
  const name = (sm.name ?? "").toLowerCase()
  const mode = (sm.data as any)?.mode
  return name.includes("numérique") || name.includes("digital") || mode === "digital"
}

/**
 * Quand le panier devient 100% bons cadeau (ex: l'utilisateur supprime les articles physiques),
 * supprime les méthodes de livraison physiques (Bpost Express, etc.) pour forcer la sélection
 * de "Livraison numérique" à 0€. Sinon le panier garde Bpost Express à 12,90€.
 */
export default async function cartGiftCardShippingFixHandler({
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

    const items = (cart.items ?? []) as any[]
    if (items.length === 0) return

    const giftCardOnly = items.every((item) => isGiftCardItem(item))
    if (!giftCardOnly) return

    const shippingMethods = ((cart as any).shipping_methods ?? []) as Array<{
      id: string
      name?: string | null
      data?: Record<string, unknown>
    }>
    const toRemove = shippingMethods.filter((sm) => !isDigitalShippingMethod(sm))
    if (toRemove.length === 0) return

    const ids = toRemove.map((sm) => sm.id)
    await (cartModuleService as any).softDeleteShippingMethods(ids)
    console.log(
      `[GiftCardShippingFix] Panier ${cartId} 100% bons cadeau : suppression de ${ids.length} méthode(s) de livraison physique (${toRemove.map((s) => s.name).join(", ")})`
    )
  } catch (error) {
    console.error("[GiftCardShippingFix] Erreur:", error)
  }
}

export const config: SubscriberConfig = {
  event: "cart.updated",
}
