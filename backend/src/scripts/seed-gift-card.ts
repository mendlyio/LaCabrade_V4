import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createProductsWorkflow,
  linkProductsToSalesChannelWorkflow,
} from "@medusajs/medusa/core-flows"

/**
 * Seed script pour créer le produit "Bon Cadeau La Cabrade" avec 3 variants.
 * Si le produit existe déjà, le lie à TOUS les sales channels (fix prod).
 *
 * Usage : npx medusa exec src/scripts/seed-gift-card.ts
 * En local sans Redis : REDIS_URL= npx medusa exec src/scripts/seed-gift-card.ts
 */
export default async function seedGiftCard({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModuleService = container.resolve(Modules.PRODUCT)
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)

  logger.info("🎁 Seeding Gift Card product...")

  // Récupérer TOUS les sales channels (priorité LaCabrade en prod)
  let salesChannels = await salesChannelModuleService.listSalesChannels({
    name: "LaCabrade",
  })
  if (!salesChannels.length) {
    salesChannels = await salesChannelModuleService.listSalesChannels({
      name: "Default Sales Channel",
    })
  }
  if (!salesChannels.length) {
    salesChannels = await salesChannelModuleService.listSalesChannels({})
  }
  if (!salesChannels.length) {
    logger.error("❌ Aucun Sales Channel trouvé. Lancez d'abord le seed principal ou créez un canal.")
    return
  }

  // Vérifier si le produit existe déjà
  const existingProducts = await productModuleService.listProducts({
    handle: "bon-cadeau",
  })

  if (existingProducts.length > 0) {
    const product = existingProducts[0]
    logger.info(`⚠️ Le produit Bon Cadeau existe déjà (id: ${product.id}). Liaison à tous les sales channels...`)

    // Lier le produit à TOUS les sales channels (fix pour prod)
    for (const channel of salesChannels) {
      try {
        await linkProductsToSalesChannelWorkflow(container).run({
          input: {
            id: channel.id,
            add: [product.id],
          },
        })
        logger.info(`   ✅ Lié au canal: ${channel.name}`)
      } catch (e: any) {
        // Ignorer si déjà lié
        if (!e.message?.includes("already") && !e.message?.includes("duplicate")) {
          logger.warn(`   ⚠️ Canal ${channel.name}: ${e.message}`)
        }
      }
    }
    logger.info("✅ Bon Cadeau mis à jour et visible sur tous les canaux.")
    return
  }

  logger.info(`Using sales channel: ${salesChannels[0].name}`)

  // Récupérer le shipping profile par défaut
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  })
  if (!shippingProfiles.length) {
    logger.error("❌ Aucun Shipping Profile par défaut trouvé. Lancez d'abord le seed principal.")
    return
  }

  const { result: products } = await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Bon Cadeau La Cabrade",
          handle: "bon-cadeau",
          description:
            "Offrez un bon cadeau La Cabrade ! Valable 1 an, utilisable en ligne et en magasin sur plus de 5000 produits d'équitation.",
          is_giftcard: true,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfiles[0].id,
          weight: 0,
          options: [
            {
              title: "Montant",
              values: ["25€", "50€", "100€"],
            },
          ],
          variants: [
            {
              title: "Bon Cadeau 25€",
              sku: "GC-025",
              manage_inventory: false,
              prices: [
                {
                  currency_code: "eur",
                  amount: 2500,
                },
              ],
              options: {
                Montant: "25€",
              },
            },
            {
              title: "Bon Cadeau 50€",
              sku: "GC-050",
              manage_inventory: false,
              prices: [
                {
                  currency_code: "eur",
                  amount: 5000,
                },
              ],
              options: {
                Montant: "50€",
              },
            },
            {
              title: "Bon Cadeau 100€",
              sku: "GC-100",
              manage_inventory: false,
              prices: [
                {
                  currency_code: "eur",
                  amount: 10000,
                },
              ],
              options: {
                Montant: "100€",
              },
            },
          ],
          sales_channels: salesChannels.map((sc) => ({ id: sc.id })),
        },
      ],
    },
  })

  logger.info(`✅ Produit Bon Cadeau créé avec succès !`)
  logger.info(`   ID: ${products[0].id}`)
  logger.info(`   Handle: ${products[0].handle}`)
  logger.info(`   Variants: ${products[0].variants.map((v: any) => `${v.title} (${v.sku})`).join(", ")}`)
}
