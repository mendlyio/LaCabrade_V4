/**
 * Corrige les prix des options de livraison Bpost en base.
 * Standard : 5 €
 * Express : 12,90 €
 *
 * À utiliser après un import qui a mis des valeurs incorrectes.
 *
 * Usage : npx medusa exec src/scripts/fix-shipping-prices.ts
 * En local sans Redis : REDIS_URL= npx medusa exec src/scripts/fix-shipping-prices.ts
 */

import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  LINKS,
  Modules,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"

const STANDARD_PRICE = 6.9  // 6,90 € (format euros)
const EXPRESS_PRICE = 12.9  // 12,90 € (format euros)

export default async function fixShippingPrices({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)
  const remoteQuery = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const pricingModule = container.resolve(Modules.PRICING)

  logger.info("🔧 Correction des prix de livraison Bpost...")

  const allOptions = await fulfillmentModuleService.listShippingOptions({})
  const bpostOptions = allOptions.filter(
    (opt: any) =>
      opt.provider_id?.includes("bpost") ?? false
  )

  if (bpostOptions.length === 0) {
    logger.info("ℹ️  Aucune option Bpost trouvée.")
    return
  }

  const optionIds = bpostOptions.map((o: any) => o.id)
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

    const opt = bpostOptions.find((o: any) => o.id === link.shipping_option_id)
    const isExpress =
      opt?.name?.toLowerCase().includes("express") ||
      (opt?.data?.mode === "express")
    const amount = isExpress ? EXPRESS_PRICE : STANDARD_PRICE
    const label = isExpress ? "12,90 €" : "5,00 €"

    try {
      await pricingModule.updatePriceSets(priceSetId, {
        prices: [{ currency_code: "eur", amount }],
      })
      updated++
      logger.info(`   ✓ ${opt?.name ?? link.shipping_option_id} → ${label}`)
    } catch (e: any) {
      logger.error(`   ✗ ${opt?.name ?? link.shipping_option_id}: ${e.message}`)
    }
  }

  logger.info("")
  logger.info(`✅ ${updated} prix corrigés (Standard: 6,90€ | Express: 12,90€)`)
}
