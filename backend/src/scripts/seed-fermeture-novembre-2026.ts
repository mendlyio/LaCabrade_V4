/**
 * Promotion automatique « fermeture magasin » — −10 % du 9 au 11 novembre 2026.
 *
 *   • FERMETURE_NOV_10 : −10 % global SANS règle de ciblage (pattern PO_GLOBAL_10,
 *     éprouvé en prod). Le hook panier (restore-outlet-prices-hook.ts, bloc F)
 *     retire la remise des compléments alimentaires, tondeuses, outlet et bons
 *     cadeau, et corrige le montant HT.
 *
 * Usage :
 *   npx medusa exec src/scripts/seed-fermeture-novembre-2026.ts
 * Activée aussi automatiquement au démarrage (loader) et chaque minute (job).
 * La campagne a une ends_at : elle s'arrête seule le 11 novembre 23:59 (heure belge).
 */

import { ExecArgs } from "@medusajs/framework/types"
import {
  ApplicationMethodTargetType,
  ApplicationMethodType,
  ContainerRegistrationKeys,
  Modules,
  PromotionType,
} from "@medusajs/framework/utils"
import {
  FERMETURE_NOV_CODE,
  FERMETURE_NOV_END,
  FERMETURE_NOV_PERCENT,
  FERMETURE_NOV_START,
} from "../utils/fermeture-novembre"

const CAMPAIGN_IDENTIFIER = "FERMETURE_NOVEMBRE_2026"

/** Crée la promo si elle n'existe pas encore. Ne fait plus rien après le 11 novembre. */
export async function ensureFermetureNovembre2026({ container }: ExecArgs) {
  if (new Date() > FERMETURE_NOV_END) return

  const promotionModule = container.resolve(Modules.PROMOTION) as any
  const existing = await promotionModule.listPromotions({ code: [FERMETURE_NOV_CODE] })
  if (existing.length > 0) return

  await seedFermetureNovembre2026({ container, args: [] })
}

export default async function seedFermetureNovembre2026({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const promotionModule = container.resolve(Modules.PROMOTION) as any

  logger.info("🏷️  Fermeture magasin novembre 2026 (−10 %)...")
  logger.info(`   Valable : ${FERMETURE_NOV_START.toISOString()} → ${FERMETURE_NOV_END.toISOString()} (UTC)`)
  logger.info("   Soit : 9 nov 00:00 → 11 nov 23:59 (heure belge)")

  const existing = await promotionModule.listPromotions({ code: [FERMETURE_NOV_CODE] })
  if (existing.length > 0) {
    logger.info(`⚠️  ${FERMETURE_NOV_CODE} déjà présente — suppression et recréation.`)
    await promotionModule.deletePromotions(existing.map((p: any) => p.id))
  }

  try {
    const existingCampaigns = await promotionModule.listCampaigns({
      campaign_identifier: [CAMPAIGN_IDENTIFIER],
    })
    if (existingCampaigns.length > 0) {
      await promotionModule.deleteCampaigns(existingCampaigns.map((c: any) => c.id))
    }
  } catch {
    // Pas critique
  }

  await promotionModule.createPromotions([
    {
      code: FERMETURE_NOV_CODE,
      type: PromotionType.STANDARD,
      is_automatic: true,
      status: "active",
      campaign: {
        name: "Fermeture magasin novembre 2026",
        description: "−10 % sur le site, hors compléments alimentaires et tondeuses · 9–11 novembre 2026",
        campaign_identifier: CAMPAIGN_IDENTIFIER,
        starts_at: FERMETURE_NOV_START,
        ends_at: FERMETURE_NOV_END,
      },
      application_method: {
        type: ApplicationMethodType.PERCENTAGE,
        target_type: ApplicationMethodTargetType.ITEMS,
        allocation: "each" as any,
        value: FERMETURE_NOV_PERCENT,
        max_quantity: 100,
        apply_to_quantity: 1,
        // PAS de target_rules : le hook filtre les exclusions.
      },
      rules: [],
    } as any,
  ])

  logger.info(`✅ ${FERMETURE_NOV_CODE} créée (−10 % global, exclusions gérées par le hook).`)
}
