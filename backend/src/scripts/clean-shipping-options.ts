/**
 * Script pour nettoyer les options de livraison existantes
 * 
 * Ce script supprime toutes les options de livraison pour permettre
 * une reconfiguration propre.
 * 
 * Usage: npx medusa exec src/scripts/clean-shipping-options.ts
 */

import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

export default async function cleanShippingOptions({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)

  logger.info("🧹 Nettoyage des options de livraison...")

  // Lister toutes les options de livraison
  const allOptions = await fulfillmentModuleService.listShippingOptions({})
  
  if (allOptions.length === 0) {
    logger.info("✅ Aucune option de livraison à supprimer.")
    return
  }

  logger.info(`📋 ${allOptions.length} option(s) de livraison trouvée(s):`)
  for (const opt of allOptions) {
    logger.info(`   - ${opt.name} (provider: ${opt.provider_id})`)
  }

  // Supprimer chaque option
  logger.info("")
  logger.info("🗑️  Suppression des options...")
  
  for (const opt of allOptions) {
    try {
      await fulfillmentModuleService.deleteShippingOptions(opt.id)
      logger.info(`   ✓ Supprimé: ${opt.name}`)
    } catch (e: any) {
      logger.error(`   ✗ Erreur pour ${opt.name}: ${e.message}`)
    }
  }

  // Vérifier qu'il ne reste rien
  const remaining = await fulfillmentModuleService.listShippingOptions({})
  
  if (remaining.length === 0) {
    logger.info("")
    logger.info("✅ Toutes les options de livraison ont été supprimées!")
  } else {
    logger.warn(`⚠️  ${remaining.length} option(s) n'ont pas pu être supprimées.`)
  }

  // Optionnel: Lister les fulfillment sets existants
  const fulfillmentSets = await fulfillmentModuleService.listFulfillmentSets({})
  if (fulfillmentSets.length > 0) {
    logger.info("")
    logger.info(`📦 Fulfillment sets existants (non supprimés):`)
    for (const fs of fulfillmentSets) {
      logger.info(`   - ${fs.name} (${fs.service_zones?.length || 0} zone(s))`)
    }
  }
}

