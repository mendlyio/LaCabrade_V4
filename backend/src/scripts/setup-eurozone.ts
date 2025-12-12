/**
 * Script pour ajouter tous les pays de la zone Euro à la boutique
 * 
 * Pays de la zone Euro:
 * AT (Autriche), BE (Belgique), CY (Chypre), DE (Allemagne), EE (Estonie),
 * ES (Espagne), FI (Finlande), FR (France), GR (Grèce), HR (Croatie),
 * IE (Irlande), IT (Italie), LT (Lituanie), LU (Luxembourg), LV (Lettonie),
 * MT (Malte), NL (Pays-Bas), PT (Portugal), SI (Slovénie), SK (Slovaquie)
 * 
 * Usage: npx medusa exec src/scripts/setup-eurozone.ts
 */

import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import {
  createRegionsWorkflow,
  createTaxRegionsWorkflow,
} from "@medusajs/medusa/core-flows"

// Tous les pays de la zone Euro
const EUROZONE_COUNTRIES = [
  { code: "at", name: "Autriche" },
  { code: "be", name: "Belgique" },
  { code: "cy", name: "Chypre" },
  { code: "de", name: "Allemagne" },
  { code: "ee", name: "Estonie" },
  { code: "es", name: "Espagne" },
  { code: "fi", name: "Finlande" },
  { code: "fr", name: "France" },
  { code: "gr", name: "Grèce" },
  { code: "hr", name: "Croatie" },
  { code: "ie", name: "Irlande" },
  { code: "it", name: "Italie" },
  { code: "lt", name: "Lituanie" },
  { code: "lu", name: "Luxembourg" },
  { code: "lv", name: "Lettonie" },
  { code: "mt", name: "Malte" },
  { code: "nl", name: "Pays-Bas" },
  { code: "pt", name: "Portugal" },
  { code: "si", name: "Slovénie" },
  { code: "sk", name: "Slovaquie" },
]

export default async function setupEurozone({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const regionService = container.resolve(Modules.REGION)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)

  logger.info("🇪🇺 Configuration de la zone Euro...")
  logger.info(`   ${EUROZONE_COUNTRIES.length} pays à configurer`)

  // Vérifier les régions existantes
  const existingRegions = await regionService.listRegions({})
  logger.info(`📋 ${existingRegions.length} région(s) existante(s)`)

  // Chercher une région Euro existante ou la créer
  let euroRegion = existingRegions.find((r: any) => 
    r.currency_code === "eur" || r.name?.toLowerCase().includes("euro")
  )

  if (!euroRegion) {
    logger.info("🆕 Création de la région Zone Euro...")
    try {
      const { result: regionResult } = await createRegionsWorkflow(container).run({
        input: {
          regions: [
            {
              name: "Zone Euro",
              currency_code: "eur",
              countries: EUROZONE_COUNTRIES.map(c => c.code),
              payment_providers: ["pp_system_default"],
            },
          ],
        },
      })
      euroRegion = regionResult[0]
      logger.info("✅ Région Zone Euro créée")
    } catch (e: any) {
      if (e.message?.includes("already exists")) {
        logger.info("ℹ️ Région existe déjà")
        euroRegion = existingRegions[0]
      } else {
        logger.error(`❌ Erreur création région: ${e.message}`)
      }
    }
  } else {
    logger.info(`✅ Région Euro existante: ${euroRegion.name}`)
    
    // Vérifier si tous les pays sont inclus
    const existingCountries = (euroRegion.countries || []).map((c: any) => c.iso_2?.toLowerCase())
    const missingCountries = EUROZONE_COUNTRIES.filter(c => !existingCountries.includes(c.code))
    
    if (missingCountries.length > 0) {
      logger.info(`   ⚠️ Pays manquants: ${missingCountries.map(c => c.code.toUpperCase()).join(", ")}`)
      logger.info("   → Ajoutez-les manuellement dans Admin Medusa > Paramètres > Régions")
    }
  }

  // Créer les régions fiscales pour chaque pays
  logger.info("📊 Configuration des régions fiscales...")
  try {
    await createTaxRegionsWorkflow(container).run({
      input: EUROZONE_COUNTRIES.map(c => ({
        country_code: c.code,
        provider_id: "tp_system"
      })),
    })
    logger.info("✅ Régions fiscales configurées")
  } catch (e: any) {
    if (!e.message?.includes("already exists")) {
      logger.warn(`⚠️ Erreur régions fiscales: ${e.message}`)
    }
  }

  // Mettre à jour la zone de livraison Europe
  logger.info("🚚 Mise à jour des zones de livraison...")
  
  const allServiceZones = await fulfillmentModuleService.listServiceZones({})
  let europeZone = allServiceZones.find((z: any) => 
    z.name?.toLowerCase().includes("europe") || z.name?.toLowerCase().includes("international")
  )

  if (europeZone) {
    // Mettre à jour avec tous les pays Euro (sauf BE qui a sa propre zone)
    const euCountriesWithoutBE = EUROZONE_COUNTRIES.filter(c => c.code !== "be")
    
    try {
      await fulfillmentModuleService.updateServiceZones(europeZone.id, {
        name: "Zone Euro (International)",
        geo_zones: euCountriesWithoutBE.map(c => ({
          country_code: c.code,
          type: "country" as const,
        })),
      })
      logger.info(`✅ Zone "${europeZone.name}" mise à jour avec ${euCountriesWithoutBE.length} pays`)
    } catch (e: any) {
      logger.warn(`⚠️ Impossible de mettre à jour la zone: ${e.message}`)
    }
  } else {
    logger.warn("⚠️ Zone Europe non trouvée - créez-la d'abord avec le script seed-bpost.ts")
  }

  logger.info("")
  logger.info("🎉 Configuration Zone Euro terminée!")
  logger.info("")
  logger.info("Pays configurés:")
  EUROZONE_COUNTRIES.forEach(c => {
    logger.info(`   🇪🇺 ${c.code.toUpperCase()} - ${c.name}`)
  })
}

