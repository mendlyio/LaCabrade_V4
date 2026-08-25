/**
 * Script de création de l'option "Retrait en point de dépôt" (gratuit, 0€)
 *
 * Cette option déclenche le composant StorePickup dans le checkout,
 * qui affiche la liste des points de retrait partenaires.
 *
 * Usage : npx medusa exec src/scripts/seed-store-pickup.ts
 * En prod : DATABASE_URL=... npx medusa exec src/scripts/seed-store-pickup.ts
 */

import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import { createShippingOptionsWorkflow } from "@medusajs/medusa/core-flows"

export default async function seedStorePickup({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)

  logger.info("📍 Création de l'option 'Retrait en point de dépôt'...")

  // --- Shipping profile ---
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({ type: "default" })
  const shippingProfile = shippingProfiles[0]
  if (!shippingProfile) {
    logger.error("❌ Aucun shipping profile par défaut trouvé. Lancez d'abord le seed principal.")
    return
  }

  // --- Provider : manual (système) ---
  const providers = await fulfillmentModuleService.listFulfillmentProviders()
  const manualProvider = providers.find(
    (p: any) => p.id === "manual" || p.id?.includes("manual")
  )
  if (!manualProvider) {
    logger.error("❌ Provider 'manual' non trouvé.")
    logger.info("   Providers disponibles: " + providers.map((p: any) => p.id).join(", "))
    return
  }
  logger.info(`✅ Provider: ${manualProvider.id}`)

  // --- Zone de service pour la Belgique ---
  const allServiceZones = await fulfillmentModuleService.listServiceZones({})
  logger.info(`📋 ${allServiceZones.length} zone(s) trouvée(s): ${allServiceZones.map((z: any) => z.name).join(", ")}`)

  // Chercher n'importe quelle zone (on réutilise la première disponible)
  const belgiumZone = allServiceZones.find((z: any) =>
    z.geo_zones?.some((g: any) => g.country_code === "be")
  ) || allServiceZones[0]

  if (!belgiumZone) {
    logger.error("❌ Aucune zone de service trouvée. Lancez d'abord seed-bpost.ts.")
    return
  }

  logger.info(`✅ Zone de service: ${belgiumZone.name} (id: ${belgiumZone.id})`)

  // --- Vérifier si l'option existe déjà ---
  const existingOptions = await fulfillmentModuleService.listShippingOptions({})
  const alreadyExists = existingOptions.find(
    (opt: any) => (opt as any).data?.mode === "store_pickup"
  )
  if (alreadyExists) {
    logger.info(`⚠️  Option "Retrait en point de dépôt" existe déjà (id: ${alreadyExists.id}). Rien à faire.`)
    return
  }

  // --- Créer l'option ---
  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Retrait en point de dépôt (gratuit)",
        price_type: "flat",
        provider_id: manualProvider.id,
        service_zone_id: belgiumZone.id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Retrait en magasin",
          description: "Retirez votre commande dans l'un de nos points de dépôt. Gratuit.",
          code: "store-pickup",
        },
        data: {
          id: "store-pickup",
          mode: "store_pickup",
        },
        prices: [
          { currency_code: "eur", amount: 0 },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
    ],
  })

  logger.info("✅ Option 'Retrait en point de dépôt' créée avec succès!")
  logger.info("   Prix : 0,00 € (gratuit)")
  logger.info("   Mode : store_pickup")
  logger.info("")
  logger.info("Points de retrait disponibles dans le checkout:")
  logger.info("  📍 Q8 Malmedy — Avenue du pont de Warche 9, 4960 Malmedy")
  logger.info("  📍 Q8 Petit Rechain — Avenue du parc 27, 4800 Verviers")
  logger.info("  📍 Capalu Saint-Vith — Hauptstrasse 49, 4780 Saint Vith")
  logger.info("  📍 Tom & Co Waremme — Chau. Romaine 246, 4300 Waremme")
  logger.info("  📍 Sellerie La Cabrade — Rue de la clef 96, 4621 Retinne")
  logger.info("")
  logger.info("⚠️  Pensez à activer cette option dans Settings → Regions de l'admin Medusa.")
}
