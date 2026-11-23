/**
 * Retire les promotions et la campagne Black Week 2026.
 *
 * Usage :
 *   npx medusa exec src/scripts/deactivate-black-week-2026.ts
 * En prod :
 *   DATABASE_URL=... REDIS_URL="" npx medusa exec src/scripts/deactivate-black-week-2026.ts
 *
 * Ce script retire les lignes Medusa. Le hook panier réécrit encore la remise
 * tant que BLACK_WEEK_ENABLED est true et que la date est entre le 23 et le
 * 30 novembre 2026. Pour couper tout de suite : revert du commit, ou
 * BLACK_WEEK_ENABLED = false dans backend/src/utils/black-week.ts puis
 * redéployer. Le 1er décembre 00:00 (heure belge), le hook s'arrête seul.
 */

import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  BW_BLANKET_CODE,
  BW_BLANKET_MULTI_CODE,
  BW_CLOTHING_CODE,
} from "../utils/black-week"

const CAMPAIGN_IDENTIFIER = "BLACK_WEEK_2026"
const PROMO_CODES = [BW_CLOTHING_CODE, BW_BLANKET_CODE, BW_BLANKET_MULTI_CODE]

export default async function deactivateBlackWeek2026({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const promotionModule = container.resolve(Modules.PROMOTION) as any

  logger.info("Désactivation Black Week 2026...")

  const existing = await promotionModule.listPromotions({ code: PROMO_CODES })
  if (existing.length > 0) {
    await promotionModule.deletePromotions(existing.map((promo: { id: string }) => promo.id))
    logger.info(`✅ ${existing.length} promotion(s) supprimée(s).`)
  } else {
    logger.info("ℹ️  Aucune promotion Black Week en base.")
  }

  try {
    const campaigns = await promotionModule.listCampaigns({
      campaign_identifier: [CAMPAIGN_IDENTIFIER],
    })
    if (campaigns.length > 0) {
      await promotionModule.deleteCampaigns(campaigns.map((campaign: { id: string }) => campaign.id))
      logger.info(`✅ Campagne ${CAMPAIGN_IDENTIFIER} supprimée.`)
    }
  } catch {
    logger.info("ℹ️  Campagne non trouvée ou listCampaigns indisponible.")
  }

  logger.info("")
  logger.info("Le hook panier suit la date et BLACK_WEEK_ENABLED.")
  logger.info("Revert du commit pour un arrêt immédiat, y compris outlet −60 % et pop-up.")
}
