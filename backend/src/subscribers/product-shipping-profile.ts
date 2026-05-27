/**
 * Lie automatiquement chaque produit au profil de livraison par défaut.
 *
 * Couvre :
 * - product.created : nouveau produit (cas standard)
 * - product.updated : un produit ré-activé après sync Odoo dont le lien
 *   product_shipping_profile aurait été soft-deleted en cascade lors d'un
 *   précédent soft-delete. Sans réactivation, le checkout échoue avec
 *   "shipping profiles not satisfied" (bug observé le 19-20 mai 2026).
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
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const [defaultProfile] = await fulfillmentModuleService.listShippingProfiles({
      type: "default",
    })
    if (!defaultProfile) return

    const { data: existingLinks } = await query.graph({
      entity: "product_shipping_profile",
      fields: ["id", "deleted_at", "shipping_profile_id"],
      filters: { product_id: productId },
      withDeleted: true,
    } as any)

    const activeLink = (existingLinks ?? []).find((l: any) => !l.deleted_at)
    if (activeLink) return

    const softDeleted = (existingLinks ?? []).find(
      (l: any) => l.deleted_at && l.shipping_profile_id === defaultProfile.id
    )

    if (softDeleted) {
      const pgConnection: any = (container as any).resolve?.("__pg_connection__")
      if (pgConnection) {
        await pgConnection.raw(
          `UPDATE product_shipping_profile SET deleted_at = NULL, updated_at = NOW() WHERE id = ?`,
          [softDeleted.id]
        )
        return
      }
    }

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
  event: ["product.created", "product.updated"],
}
