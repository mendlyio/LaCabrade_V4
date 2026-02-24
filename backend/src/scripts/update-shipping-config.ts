/**
 * Met à jour la configuration des livraisons :
 * - Standard Bpost & Point relais Bpost : 6,90 € (au lieu de 5€)
 * - Crée une promotion automatique "Livraison gratuite dès 75€"
 *   (s'applique à toutes les options SAUF express)
 *
 * Usage : npx medusa exec src/scripts/update-shipping-config.ts
 * En prod : DATABASE_URL=... REDIS_URL="" npx medusa exec src/scripts/update-shipping-config.ts
 */

import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  PromotionRuleOperator,
  PromotionType,
} from "@medusajs/framework/utils"
import { Client } from "pg"
import { ApplicationMethodTargetType, ApplicationMethodType } from "@medusajs/framework/utils"

const STANDARD_PRICE = 6.9  // 6,90 €
const EXPRESS_PRICE  = 12.9 // 12,90 €
const FREE_SHIPPING_THRESHOLD = 75 // 75 € panier minimum

export default async function updateShippingConfig({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)
  const pricingModule = container.resolve(Modules.PRICING)

  // Connexion directe à la base de données pour récupérer les liens shipping → price_set
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

  // ─── 1. Mise à jour des prix via SQL + pricing module ─────────────────────
  logger.info("🔧 Mise à jour des prix de livraison...")

  const allOptions = await fulfillmentModuleService.listShippingOptions({})
  logger.info(`   ${allOptions.length} option(s) trouvée(s) au total`)

  // Récupérer le mapping shipping_option_id → price_set_id via SQL
  const optionIds = allOptions.map((o: any) => o.id)
  const placeholders = optionIds.map((_: any, i: number) => `$${i + 1}`).join(",")

  // Chercher dans les tables de liens Medusa v2 (plusieurs noms possibles)
  let links: Array<{ shipping_option_id: string; price_set_id: string }> = []
  const tableNames = [
    "shipping_option_price_set",
    "fulfillment_shipping_option_price_set",
    "shipping_option_pricing_price_set",
  ]
  for (const tableName of tableNames) {
    try {
      const res = await pgClient.query(
        `SELECT shipping_option_id, price_set_id FROM ${tableName} WHERE shipping_option_id IN (${placeholders})`,
        optionIds
      )
      links = res.rows
      logger.info(`   Liens trouvés via table '${tableName}': ${links.length}`)
      break
    } catch {
      // Table n'existe pas, on essaie la suivante
    }
  }

  if (links.length === 0) {
    // Dernière tentative : chercher dans les tables dynamiques de liens Medusa
    try {
      const tablesRes = await pgClient.query(
        `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%shipping_option%price%'`
      )
      logger.info(`   Tables de liens trouvées : ${tablesRes.rows.map((r: any) => r.tablename).join(", ")}`)
    } catch (e: any) {
      logger.error(`   Impossible de lister les tables: ${e.message}`)
    }
  }

  let updatedPrices = 0
  for (const opt of allOptions) {
    const isExpress =
      opt.name?.toLowerCase().includes("express") ||
      (opt as any).data?.mode === "express"
    const isManualOrPickup =
      (opt as any).provider_id?.includes("manual") ||
      (opt as any).data?.mode === "store_pickup"

    if (isManualOrPickup) {
      logger.info(`   → Ignoré (gratuit): ${opt.name}`)
      continue
    }

    const targetAmount = isExpress ? EXPRESS_PRICE : STANDARD_PRICE
    const label = isExpress ? "12,90 €" : "6,90 €"

    const link = links.find((l) => l.shipping_option_id === opt.id)
    if (!link) {
      logger.warn(`   ⚠️ Pas de price set lié pour: ${opt.name}`)
      continue
    }

    try {
      await pricingModule.updatePriceSets(link.price_set_id, {
        prices: [{ currency_code: "eur", amount: targetAmount }],
      })
      updatedPrices++
      logger.info(`   ✓ ${opt.name} → ${label}`)
    } catch (e: any) {
      logger.error(`   ✗ ${opt.name}: ${e.message}`)
    }
  }
  logger.info(`   ✅ ${updatedPrices} prix mis à jour`)

  // ─── 2. Promotion livraison gratuite ≥ 75 € ───────────────────────────────
  logger.info("")
  logger.info("🎁 Création de la promotion 'Livraison gratuite dès 75€'...")

  const promotionModule = container.resolve(Modules.PROMOTION)

  // Vérifier si la promotion existe déjà
  const existing = await promotionModule.listPromotions({ code: ["FREE_SHIPPING_75"] })
  if (existing.length > 0) {
    logger.info("   ⚠️  Promotion 'FREE_SHIPPING_75' déjà présente — suppression puis recréation.")
    await promotionModule.deletePromotions(existing.map((p: any) => p.id))
  }

  // IDs des options NON express (standard + relais + store_pickup + manual)
  const nonExpressOptionIds = allOptions
    .filter((opt: any) => {
      const isExpress =
        opt?.name?.toLowerCase().includes("express") ||
        (opt as any)?.data?.mode === "express"
      return !isExpress
    })
    .map((opt: any) => opt.id)

  logger.info(`   Options éligibles (non express) : ${nonExpressOptionIds.length}`)

  try {
    const promotionModule = container.resolve(Modules.PROMOTION)

    await promotionModule.createPromotions([
      {
        code: "FREE_SHIPPING_75",
        type: PromotionType.STANDARD,
        is_automatic: true,
        application_method: {
          type: ApplicationMethodType.PERCENTAGE,
          target_type: ApplicationMethodTargetType.SHIPPING_METHODS,
          allocation: "each" as any,
          value: 100,
          max_quantity: 1,
          apply_to_quantity: 1,
          target_rules: nonExpressOptionIds.length > 0
            ? [
                {
                  attribute: "shipping_option_id",
                  operator: PromotionRuleOperator.IN,
                  values: nonExpressOptionIds,
                },
              ]
            : [],
        },
        rules: [
          {
            attribute: "subtotal",
            operator: PromotionRuleOperator.GTE,
            values: [`${FREE_SHIPPING_THRESHOLD}`],
          },
        ],
      } as any,
    ])
    logger.info(`   ✅ Promotion créée : livraison GRATUITE si panier ≥ ${FREE_SHIPPING_THRESHOLD}€`)
    logger.info(`      Code interne : FREE_SHIPPING_75 (application automatique)`)
  } catch (e: any) {
    logger.error(`   ❌ Erreur création promotion : ${e.message}`)
    logger.info("   → Vous pouvez créer la promotion manuellement dans le dashboard :")
    logger.info("     Settings → Promotions → New → Automatic → subtotal >= 75 → 100% off shipping")
  }

  logger.info("")
  logger.info("🎉 Configuration terminée !")
  logger.info("   Standard / Point relais : 6,90 €")
  logger.info("   Express                 : 12,90 €")
  logger.info("   Livraison gratuite      : dès 75€ (hors express)")
}
