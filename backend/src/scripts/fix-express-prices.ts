/**
 * Script pour corriger le prix des options Express à 12,90 €
 *
 * Les options Express en base peuvent avoir été créées avec 5 €. Ce script
 * met à jour le prix via le module Pricing sans supprimer les options.
 *
 * Usage : npx medusa exec src/scripts/fix-express-prices.ts
 */

import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  LINKS,
  Modules,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"

const EXPRESS_PRICE = 12.9 // 12,90 € (format euros)

export default async function fixExpressPrices({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)
  const remoteQuery = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const pricingModule = container.resolve(Modules.PRICING)

  logger.info("🔧 Correction des prix Express...")

  const allOptions = await fulfillmentModuleService.listShippingOptions({})
  const expressOptions = allOptions.filter(
    (opt: any) =>
      (opt.name?.toLowerCase().includes("express") &&
        (opt.provider_id?.includes("bpost") ?? false)) ||
      (opt.data?.mode === "express")
  )

  if (expressOptions.length === 0) {
    logger.info("ℹ️  Aucune option Express trouvée.")
    return
  }

  logger.info(`📋 ${expressOptions.length} option(s) Express à corriger:`)
  for (const opt of expressOptions) {
    logger.info(`   - ${opt.name} (${opt.id})`)
  }

  const optionIds = expressOptions.map((o: any) => o.id)

  const queryObject = remoteQueryObjectFromString({
    entryPoint: LINKS.ShippingOptionPriceSet,
    variables: { filters: { shipping_option_id: optionIds } },
    fields: ["shipping_option_id", "price_set_id"],
  })
  const links = await remoteQuery(queryObject)

  let updated = 0
  for (const link of links) {
    const priceSetId = link.price_set_id
    if (!priceSetId) continue

    try {
      await pricingModule.updatePriceSets(priceSetId, {
        prices: [{ currency_code: "eur", amount: EXPRESS_PRICE }],
      })
      updated++
      const opt = expressOptions.find((o: any) => o.id === link.shipping_option_id)
      logger.info(`   ✓ ${opt?.name ?? link.shipping_option_id} → 12,90 €`)
    } catch (e: any) {
      logger.error(`   ✗ ${link.shipping_option_id}: ${e.message}`)
    }
  }

  logger.info("")
  logger.info(`✅ ${updated} Prix Express mis à jour à 12,90 € !`)
  logger.info("   Rafraîchissez la page checkout pour voir le changement.")
}
