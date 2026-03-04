/**
 * Lie automatiquement chaque nouveau produit au profil de livraison par défaut.
 * Évite l'erreur "shipping profiles not satisfied" au checkout.
 */
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

export default async function productShippingProfileHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const productId = data.id
  if (!productId) return

  try {
    const link = container.resolve(ContainerRegistrationKeys.LINK)
    const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)

    const [defaultProfile] = await fulfillmentModuleService.listShippingProfiles({
      type: "default",
    })
    if (!defaultProfile) return

    await link.create({
      [Modules.PRODUCT]: { product_id: productId },
      [Modules.FULFILLMENT]: { shipping_profile_id: defaultProfile.id },
    })
  } catch (e: any) {
    if (!e.message?.includes("already exists") && !e.message?.includes("duplicate")) {
      console.warn(`[product-shipping-profile] Produit ${productId}:`, e.message)
    }
  }
}

export const config: SubscriberConfig = {
  event: "product.created",
}
