/**
 * Lie tous les produits au profil de livraison par défaut.
 * Corrige l'erreur "The cart items require shipping profiles that are not satisfied
 * by the current shipping methods" quand des produits n'ont pas de profil de livraison.
 *
 * Usage : npx medusa exec src/scripts/fix-shipping-profiles.ts
 */

import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

export default async function fixShippingProfiles({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)
  const productModuleService = container.resolve(Modules.PRODUCT)
  const link = container.resolve(ContainerRegistrationKeys.LINK)

  logger.info("🔧 Liaison des produits au profil de livraison par défaut...")

  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  })
  const defaultProfile = shippingProfiles[0]
  if (!defaultProfile) {
    logger.error("❌ Aucun profil de livraison par défaut trouvé. Lancez seed-bpost.ts d'abord.")
    return
  }
  logger.info(`   Profil par défaut: ${defaultProfile.name} (${defaultProfile.id})`)

  const products = await productModuleService.listProducts({}, { take: 10000 })
  logger.info(`   ${products.length} produit(s) trouvé(s)`)

  const BATCH_SIZE = 50
  let linked = 0
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE)
    const links = batch.map((product) => ({
      [Modules.PRODUCT]: { product_id: product.id },
      [Modules.FULFILLMENT]: { shipping_profile_id: defaultProfile.id },
    }))
    try {
      await link.create(links)
      linked += batch.length
      logger.info(`   ... ${linked}/${products.length} traités`)
    } catch (e: any) {
      for (const product of batch) {
        try {
          await link.create({
            [Modules.PRODUCT]: { product_id: product.id },
            [Modules.FULFILLMENT]: { shipping_profile_id: defaultProfile.id },
          })
          linked++
        } catch (err: any) {
          if (!err.message?.includes("already exists") && !err.message?.includes("duplicate")) {
            logger.warn(`   ⚠️ Produit ${product.id}: ${err.message}`)
          }
        }
      }
    }
  }

  logger.info(`✅ ${linked} produit(s) lié(s) au profil de livraison.`)
}
