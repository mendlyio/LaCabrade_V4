/**
 * Crée la promotion automatique PAQUES_10 (-10%) pour Pâques 2026.
 *
 * Valable : dimanche 5 et lundi 6 avril 2026 (heure belge, UTC+2)
 * Applicable sur tous les articles sauf les catégories exclues
 * (la logique d'exclusion de catégories est gérée dans le subscriber cart-paques-guard.ts).
 *
 * Usage :
 *   npx medusa exec src/scripts/seed-paques-promotion.ts
 * En prod :
 *   DATABASE_URL=... REDIS_URL="" npx medusa exec src/scripts/seed-paques-promotion.ts
 *
 * Pour supprimer après Pâques :
 *   npx medusa exec src/scripts/seed-paques-promotion.ts --delete
 */

import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  PromotionType,
  ApplicationMethodType,
  ApplicationMethodTargetType,
} from "@medusajs/framework/utils"

const PROMO_CODE = "PAQUES_10"
const CAMPAIGN_IDENTIFIER = "PAQUES_2026"

// Heure belge = UTC+2 en avril (CEST)
// 5 avril 00:00 Belgium = 4 avril 22:00 UTC
// 6 avril 23:59:59 Belgium = 6 avril 21:59:59 UTC
const STARTS_AT = new Date("2026-04-04T22:00:00.000Z")
const ENDS_AT = new Date("2026-04-06T21:59:59.000Z")

export default async function seedPaquesPromotion({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const promotionModule = container.resolve(Modules.PROMOTION) as any

  logger.info("🐣  Configuration promotion Pâques 2026...")
  logger.info(`   Code : ${PROMO_CODE}`)
  logger.info(`   Valable : ${STARTS_AT.toISOString()} → ${ENDS_AT.toISOString()} (UTC)`)
  logger.info("   Soit : 5 avril 00:00 → 6 avril 23:59 (heure belge)")

  // Supprimer si déjà existant (idempotent)
  const existing = await promotionModule.listPromotions({ code: [PROMO_CODE] })
  if (existing.length > 0) {
    logger.info(`⚠️  Promotion ${PROMO_CODE} déjà présente — suppression et recréation.`)
    await promotionModule.deletePromotions(existing.map((p: any) => p.id))
  }

  // Supprimer l'ancienne campaign si elle existe
  try {
    const existingCampaigns = await promotionModule.listCampaigns({
      campaign_identifier: [CAMPAIGN_IDENTIFIER],
    })
    if (existingCampaigns.length > 0) {
      await promotionModule.deleteCampaigns(existingCampaigns.map((c: any) => c.id))
    }
  } catch {
    // listCampaigns peut ne pas être disponible selon la version — on ignore
  }

  try {
    await promotionModule.createPromotions([
      {
        code: PROMO_CODE,
        type: PromotionType.STANDARD,
        is_automatic: true,
        status: "active",
        campaign: {
          name: "Offre Pâques 2026",
          description: "−10% sur tout le site les 5 et 6 avril 2026",
          campaign_identifier: CAMPAIGN_IDENTIFIER,
          starts_at: STARTS_AT,
          ends_at: ENDS_AT,
        },
        application_method: {
          type: ApplicationMethodType.PERCENTAGE,
          target_type: ApplicationMethodTargetType.ITEMS,
          allocation: "each" as any,
          value: 10,
          max_quantity: 100,
          apply_to_quantity: 1,
        },
        rules: [],
      } as any,
    ])

    logger.info(`✅ Promotion "${PROMO_CODE}" créée avec succès !`)
    logger.info("   Type : automatique (aucun code à saisir)")
    logger.info("   Remise : −10% sur les articles éligibles")
    logger.info("   Catégories exclues (gérées par le subscriber) :")
    logger.info("     - soins-et-alimentation")
    logger.info("     - enfants")
    logger.info("     - tondeuses-et-peignes")
    logger.info("   Non cumulable avec : outlet, codes NL-, ANNIV-, autres codes promos")
    logger.info("")
    logger.info("💡 Pour supprimer après Pâques, relancez avec le flag --delete")
    logger.info("   ou désactivez la promotion dans le dashboard Medusa.")
  } catch (e: any) {
    logger.error(`❌ Erreur création promotion : ${e.message}`)
  }
}
