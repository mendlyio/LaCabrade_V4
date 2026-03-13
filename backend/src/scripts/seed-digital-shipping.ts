/**
 * Crée l'option "Livraison numérique" (gratuite) pour les commandes de bon cadeau uniquement.
 * Cette option est affichée uniquement quand le panier contient exclusivement des bons cadeau.
 *
 * Usage : npx medusa exec src/scripts/seed-digital-shipping.ts
 */

import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import { createShippingOptionsWorkflow } from "@medusajs/medusa/core-flows"

export default async function seedDigitalShipping({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)

  logger.info("📧 Création de l'option 'Livraison numérique' (bon cadeau)...")

  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({ type: "default" })
  const shippingProfile = shippingProfiles[0]
  if (!shippingProfile) {
    logger.error("❌ Aucun shipping profile par défaut trouvé.")
    return
  }

  const providers = await fulfillmentModuleService.listFulfillmentProviders()
  const manualProvider = providers.find(
    (p: any) => p.id === "manual" || p.id?.includes("manual")
  )
  if (!manualProvider) {
    logger.error("❌ Provider 'manual' non trouvé.")
    return
  }

  const allServiceZones = await fulfillmentModuleService.listServiceZones({})
  const zone = allServiceZones.find((z: any) =>
    z.geo_zones?.some((g: any) => ["be", "fr"].includes(g.country_code))
  ) || allServiceZones[0]
  if (!zone) {
    logger.error("❌ Aucune zone de service trouvée.")
    return
  }

  const existingOptions = await fulfillmentModuleService.listShippingOptions({})
  const alreadyExists = existingOptions.find(
    (opt: any) =>
      (opt.name ?? "").toLowerCase().includes("numérique") ||
      (opt.name ?? "").toLowerCase().includes("digital") ||
      (opt as any).data?.mode === "digital"
  )
  if (alreadyExists) {
    logger.info(`⚠️  Option "Livraison numérique" existe déjà (id: ${alreadyExists.id}).`)
    return
  }

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Livraison numérique",
        price_type: "flat",
        provider_id: manualProvider.id,
        service_zone_id: zone.id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Livraison numérique",
          description: "Envoi du bon cadeau par email (commande de bon cadeau uniquement)",
          code: "digital",
        },
        data: {
          id: "digital",
          mode: "digital",
        },
        prices: [{ currency_code: "eur", amount: 0 }],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
    ],
  })

  logger.info("✅ Option 'Livraison numérique' créée.")
  logger.info("   Visible uniquement pour les commandes de bon cadeau seul.")
}
