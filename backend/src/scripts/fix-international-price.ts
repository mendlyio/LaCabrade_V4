/**
 * Met à jour le prix de "Bpost - Livraison internationale (Europe)" à 9,90 €
 *
 * Usage : npx medusa exec src/scripts/fix-international-price.ts
 * En prod : DATABASE_URL=... REDIS_URL="" npx medusa exec src/scripts/fix-international-price.ts
 */

import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { Client } from "pg"

const INTERNATIONAL_PRICE = 9.9 // 9,90 €

export default async function fixInternationalPrice({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)
  const pricingModule = container.resolve(Modules.PRICING)

  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!dbUrl) {
    logger.error("❌ DATABASE_URL non défini")
    return
  }

  const pgClient = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  })
  await pgClient.connect()

  const allOptions = await fulfillmentModuleService.listShippingOptions({})
  const intlOption = allOptions.find((o: any) =>
    o.name?.toLowerCase().includes("international") ||
    (o.name?.toLowerCase().includes("europe") && !o.name?.toLowerCase().includes("express"))
  )

  if (!intlOption) {
    logger.error("❌ Option 'Livraison internationale (Europe)' introuvable")
    logger.info("   Options disponibles :")
    allOptions.forEach((o: any) => logger.info(`     - ${o.name}`))
    await pgClient.end()
    return
  }

  logger.info(`✅ Option trouvée : "${intlOption.name}" (${intlOption.id})`)

  // Trouver le price_set lié
  const tableNames = [
    "shipping_option_price_set",
    "fulfillment_shipping_option_price_set",
    "shipping_option_pricing_price_set",
  ]
  let priceSetId: string | null = null
  for (const tableName of tableNames) {
    try {
      const res = await pgClient.query(
        `SELECT price_set_id FROM ${tableName} WHERE shipping_option_id = $1`,
        [intlOption.id]
      )
      if (res.rows.length > 0) {
        priceSetId = res.rows[0].price_set_id
        logger.info(`   Price set trouvé via '${tableName}': ${priceSetId}`)
        break
      }
    } catch {
      // table inexistante, on essaie la suivante
    }
  }

  if (!priceSetId) {
    logger.error("❌ Aucun price set lié à cette option")
    await pgClient.end()
    return
  }

  try {
    await pricingModule.updatePriceSets(priceSetId, {
      prices: [{ currency_code: "eur", amount: INTERNATIONAL_PRICE }],
    })
    logger.info(`✅ Prix mis à jour : "${intlOption.name}" → 9,90 €`)
  } catch (e: any) {
    logger.error(`❌ Erreur mise à jour prix : ${e.message}`)
  }

  await pgClient.end()
}
