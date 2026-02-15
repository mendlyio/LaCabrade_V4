import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"

/**
 * Seed script pour créer le produit "Bon Cadeau La Cabrade" avec 3 variants.
 * 
 * Usage : npx medusa exec src/scripts/seed-gift-card.ts
 */
export default async function seedGiftCard({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModuleService = container.resolve(Modules.PRODUCT)
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)

  logger.info("🎁 Seeding Gift Card product...")

  // Vérifier si le produit existe déjà
  const existingProducts = await productModuleService.listProducts({
    handle: "bon-cadeau",
  })

  if (existingProducts.length > 0) {
    logger.info("⚠️ Le produit Bon Cadeau existe déjà (handle: bon-cadeau). Seed annulé.")
    return
  }

  // Récupérer le sales channel par défaut
  const salesChannels = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  })
  if (!salesChannels.length) {
    logger.error("❌ Aucun Sales Channel par défaut trouvé. Lancez d'abord le seed principal.")
    return
  }

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
          sales_channels: [
            { id: salesChannels[0].id },
          ],
        },
      ],
    },
  })

  logger.info(`✅ Produit Bon Cadeau créé avec succès !`)
  logger.info(`   ID: ${products[0].id}`)
  logger.info(`   Handle: ${products[0].handle}`)
  logger.info(`   Variants: ${products[0].variants.map((v: any) => `${v.title} (${v.sku})`).join(", ")}`)
}
