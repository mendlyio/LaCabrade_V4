/**
 * Supprime les promotions Braderie 2026.
 *
 * Usage :
 *   npx medusa exec src/scripts/deactivate-braderie-2026.ts
 * En prod :
 *   DATABASE_URL=... REDIS_URL="" npx medusa exec src/scripts/deactivate-braderie-2026.ts
 */

import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

const PROMO_CODES = ["BRADERIE_15", "BRADERIE_LC_25"]
const CAMPAIGN_IDENTIFIER = "BRADERIE_2026"

export default async function deactivateBraderie2026({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const promotionModule = container.resolve(Modules.PROMOTION) as any

  logger.info("🏁  Désactivation promotions Braderie 2026...")

  for (const code of PROMO_CODES) {
    const existing = await promotionModule.listPromotions({ code: [code] })
    if (existing.length > 0) {
      await promotionModule.deletePromotions(existing.map((p: any) => p.id))
      logger.info(`✅ Promotion ${code} supprimée.`)
    } else {
      logger.info(`ℹ️  Promotion ${code} introuvable.`)
    }
  }

  try {
    const existingCampaigns = await promotionModule.listCampaigns({
      campaign_identifier: [CAMPAIGN_IDENTIFIER],
    })
    if (existingCampaigns.length > 0) {
      await promotionModule.deleteCampaigns(existingCampaigns.map((c: any) => c.id))
      logger.info(`✅ Campagne ${CAMPAIGN_IDENTIFIER} supprimée.`)
    }
  } catch {
    logger.info("ℹ️  Campagne non trouvée ou listCampaigns non disponible.")
  }

  logger.info("")
  logger.info("💡 Désactive aussi BRADERIE_PROMO côté storefront si nécessaire.")
}
