/**
 * Script de configuration des options de livraison Bpost
 * 
 * Ce script crée:
 * - Une zone de service pour la Belgique
 * - Une zone de service pour l'international (FR, NL, DE, LU)
 * - Option "Livraison à domicile Bpost" (Belgique + International)
 * - Option "Point relais Bpost" (Belgique uniquement)
 * 
 * Usage: npx medusa exec src/scripts/seed-bpost.ts
 */

import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import {
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
} from "@medusajs/medusa/core-flows"

// Prix fixe pour toutes les options (en centimes) = 5€
const FIXED_PRICE = 500

export default async function seedBpostShipping({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)
  const storeModuleService = container.resolve(Modules.STORE)

  logger.info("🚚 Configuration des options de livraison Bpost...")

  // Vérifier que le provider bpost est disponible
  const providers = await fulfillmentModuleService.listFulfillmentProviders()
  const bpostProvider = providers.find((p: any) => p.id.includes("bpost"))
  
  if (!bpostProvider) {
    logger.error("❌ Provider Bpost non trouvé. Assurez-vous que BPOST_PUBLIC_KEY et BPOST_PRIVATE_KEY sont configurés.")
    logger.info("   Providers disponibles: " + providers.map((p: any) => p.id).join(", "))
    return
  }
  
  logger.info(`✅ Provider Bpost trouvé: ${bpostProvider.id}`)

  // Récupérer ou créer le stock location
  const [store] = await storeModuleService.listStores()
  let stockLocation: any
  
  if (store.default_location_id) {
    const stockLocationService = container.resolve(Modules.STOCK_LOCATION)
    stockLocation = await stockLocationService.retrieveStockLocation(store.default_location_id)
    logger.info(`📍 Stock location existant: ${stockLocation.name}`)
  } else {
    // Créer un nouveau stock location
    const { result: stockLocationResult } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          {
            name: "Entrepôt La Cabrade",
            address: {
              city: "Bruxelles",
              country_code: "BE",
              address_1: "",
            },
          },
        ],
      },
    })
    stockLocation = stockLocationResult[0]
    logger.info(`📍 Stock location créé: ${stockLocation.name}`)
  }

  // Lier le stock location au provider bpost
  try {
    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_provider_id: bpostProvider.id,
      },
    })
    logger.info("🔗 Stock location lié au provider Bpost")
  } catch (e: any) {
    if (e.message?.includes("already exists")) {
      logger.info("🔗 Lien stock location <-> Bpost déjà existant")
    } else {
      throw e
    }
  }

  // Récupérer ou créer le shipping profile
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default"
  })
  let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null

  if (!shippingProfile) {
    const { result: shippingProfileResult } = await createShippingProfilesWorkflow(container).run({
      input: {
        data: [
          {
            name: "Profil d'expédition par défaut",
            type: "default",
          },
        ],
      },
    })
    shippingProfile = shippingProfileResult[0]
    logger.info("📦 Profil d'expédition créé")
  }

  // Vérifier si un fulfillment set existe déjà
  let fulfillmentSet: any
  const existingFulfillmentSets = await fulfillmentModuleService.listFulfillmentSets({
    type: "shipping"
  })
  
  // Chercher un fulfillment set existant (on prend le premier disponible)
  fulfillmentSet = existingFulfillmentSets.find((fs: any) => 
    fs.name?.includes("Bpost") || fs.name?.includes("La Cabrade") || fs.service_zones?.length > 0
  ) || existingFulfillmentSets[0]

  if (!fulfillmentSet) {
    // Créer un nouveau fulfillment set avec zones de service
    fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: "Livraison Bpost - La Cabrade",
      type: "shipping",
      service_zones: [
        {
          name: "Belgique",
          geo_zones: [
            { country_code: "be", type: "country" },
          ],
        },
        {
          name: "Europe (FR, NL, DE, LU)",
          geo_zones: [
            { country_code: "fr", type: "country" },
            { country_code: "nl", type: "country" },
            { country_code: "de", type: "country" },
            { country_code: "lu", type: "country" },
          ],
        },
      ],
    })
    logger.info("🌍 Fulfillment set créé avec zones Belgique et Europe")

    // Lier le fulfillment set au stock location
    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_set_id: fulfillmentSet.id,
      },
    })
    logger.info("🔗 Fulfillment set lié au stock location")
  } else {
    logger.info(`🌍 Fulfillment set existant: ${fulfillmentSet.name}`)
    
    // Vérifier si les zones existent, sinon les ajouter
    const existingZoneNames = (fulfillmentSet.service_zones || []).map((z: any) => z.name?.toLowerCase())
    
    // Ajouter zone Europe si elle n'existe pas
    if (!existingZoneNames.some((n: string) => n?.includes("europe") || n?.includes("international"))) {
      try {
        await fulfillmentModuleService.createServiceZones({
          fulfillment_set_id: fulfillmentSet.id,
          name: "Europe (FR, NL, DE, LU)",
          geo_zones: [
            { country_code: "fr", type: "country" },
            { country_code: "nl", type: "country" },
            { country_code: "de", type: "country" },
            { country_code: "lu", type: "country" },
          ],
        })
        logger.info("   + Zone Europe ajoutée")
        
        // Recharger le fulfillment set
        const refreshed = await fulfillmentModuleService.listFulfillmentSets({ id: fulfillmentSet.id })
        fulfillmentSet = refreshed[0]
      } catch (e: any) {
        if (!e.message?.includes("already exists")) {
          logger.warn(`   ⚠️ Impossible d'ajouter zone Europe: ${e.message}`)
        }
      }
    }
  }

  // Récupérer toutes les zones de service
  const allServiceZones = await fulfillmentModuleService.listServiceZones({})
  
  logger.info(`📋 ${allServiceZones.length} zone(s) de service trouvée(s):`)
  for (const zone of allServiceZones) {
    logger.info(`   - ${zone.name} (${zone.geo_zones?.length || 0} geo-zones)`)
  }

  // Chercher une zone Belgique
  let belgiumZone = allServiceZones.find((z: any) => 
    z.name?.toLowerCase().includes("belg") || 
    z.geo_zones?.some((g: any) => g.country_code?.toLowerCase() === "be")
  )
  
  // Chercher une zone Europe/International
  let europeZone = allServiceZones.find((z: any) => 
    z.name?.toLowerCase().includes("europe") ||
    z.name?.toLowerCase().includes("international") ||
    z.geo_zones?.some((g: any) => ["fr", "nl", "de", "lu"].includes(g.country_code?.toLowerCase()))
  )

  // Si pas de zone Belgique, prendre la première zone disponible pour la Belgique
  if (!belgiumZone && allServiceZones.length > 0) {
    belgiumZone = allServiceZones[0]
    logger.info(`   ⚠️ Utilisation de "${belgiumZone.name}" pour la Belgique`)
  }

  if (!belgiumZone) {
    logger.error("❌ Aucune zone de service disponible. Créez d'abord un emplacement avec des zones de livraison.")
    return
  }
  
  if (!europeZone) {
    logger.warn("⚠️ Pas de zone Europe trouvée - seules les options Belgique seront créées")
  }

  // Vérifier les options existantes (filtrer par provider bpost)
  const allOptions = await fulfillmentModuleService.listShippingOptions({})
  const existingOptions = allOptions.filter((opt: any) => 
    opt.provider_id === bpostProvider.id || opt.provider_id?.includes("bpost")
  )
  
  if (existingOptions.length > 0) {
    logger.info(`ℹ️  ${existingOptions.length} option(s) Bpost existante(s):`)
    existingOptions.forEach((opt: any) => {
      logger.info(`   - ${opt.name} (${opt.id})`)
    })
    logger.info("")
    logger.info("Pour recréer les options, supprimez d'abord les existantes via l'admin Medusa.")
    return
  }

  // Créer les options de livraison Bpost
  const shippingOptions: any[] = []

  // Option 1: Livraison à domicile Belgique
  if (belgiumZone) {
    shippingOptions.push({
      name: "Bpost - Livraison à domicile (Belgique)",
      price_type: "flat",
      provider_id: bpostProvider.id,
      service_zone_id: belgiumZone.id,
      shipping_profile_id: shippingProfile.id,
      type: {
        label: "Bpost Domicile BE",
        description: "Livraison à domicile en Belgique via Bpost (2-3 jours ouvrables)",
        code: "bpost-home-be",
      },
      data: {
        id: "bpost-home-be",
        mode: "home",
      },
      prices: [
        { currency_code: "eur", amount: FIXED_PRICE },
      ],
      rules: [
        { attribute: "enabled_in_store", value: "true", operator: "eq" },
        { attribute: "is_return", value: "false", operator: "eq" },
      ],
    })
  }

  // Option 2: Point relais Belgique
  if (belgiumZone) {
    shippingOptions.push({
      name: "Bpost - Point relais (Belgique)",
      price_type: "flat",
      provider_id: bpostProvider.id,
      service_zone_id: belgiumZone.id,
      shipping_profile_id: shippingProfile.id,
      type: {
        label: "Bpost Point relais BE",
        description: "Retrait en point relais Bpost en Belgique (2-3 jours ouvrables)",
        code: "bpost-pickup-be",
      },
      data: {
        id: "bpost-pickup-be",
        mode: "pickup",
      },
      prices: [
        { currency_code: "eur", amount: FIXED_PRICE },
      ],
      rules: [
        { attribute: "enabled_in_store", value: "true", operator: "eq" },
        { attribute: "is_return", value: "false", operator: "eq" },
      ],
    })
  }

  // Option 3: Livraison à domicile Europe
  if (europeZone) {
    shippingOptions.push({
      name: "Bpost - Livraison internationale (Europe)",
      price_type: "flat",
      provider_id: bpostProvider.id,
      service_zone_id: europeZone.id,
      shipping_profile_id: shippingProfile.id,
      type: {
        label: "Bpost International EU",
        description: "Livraison internationale via Bpost (4-7 jours ouvrables)",
        code: "bpost-home-eu",
      },
      data: {
        id: "bpost-home-eu",
        mode: "home",
      },
      prices: [
        { currency_code: "eur", amount: FIXED_PRICE },
      ],
      rules: [
        { attribute: "enabled_in_store", value: "true", operator: "eq" },
        { attribute: "is_return", value: "false", operator: "eq" },
      ],
    })
  }

  if (shippingOptions.length === 0) {
    logger.error("❌ Aucune option de livraison à créer (zones non trouvées)")
    return
  }

  logger.info(`📝 Création de ${shippingOptions.length} option(s) de livraison...`)

  try {
    await createShippingOptionsWorkflow(container).run({
      input: shippingOptions,
    })
    logger.info("✅ Options de livraison Bpost créées avec succès!")
  } catch (e: any) {
    logger.error("❌ Erreur lors de la création des options:", e.message)
    throw e
  }

  // Récupérer les options créées pour affichage
  const allCreatedOptions = await fulfillmentModuleService.listShippingOptions({})
  const finalOptions = allCreatedOptions.filter((opt: any) => 
    opt.provider_id === bpostProvider.id || opt.provider_id?.includes("bpost")
  )

  logger.info("")
  logger.info("🎉 Configuration Bpost terminée!")
  logger.info("")
  logger.info("Résumé des options créées:")
  for (const opt of finalOptions) {
    const optData = (opt as any).data || {}
    const price = (optData.bpost_amount || FIXED_PRICE) / 100
    logger.info(`  📦 ${opt.name} — ${price}€`)
    logger.info(`     Mode: ${optData.mode || "non défini"}`)
  }
  logger.info("")
  logger.info("📋 Prix configurés: 5€ pour toutes les options")
}

