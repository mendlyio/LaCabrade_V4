/**
 * Désactive les promotions Soldes Été 2026.
 *
 * Usage :
 *   npx medusa exec src/scripts/deactivate-soldes-ete-2026.ts
 * En prod (Railway) :
 *   DATABASE_URL=... REDIS_URL="" npx medusa exec src/scripts/deactivate-soldes-ete-2026.ts
 *
 * Après ce script, penser à :
 *   1. Mettre ACTIVE_PROMO = BRADERIE_PROMO (ou autre) dans active-promo.ts
 *   2. Mettre active: false sur SOLDE_PROMO dans active-promo.ts
 */

import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

const CAMPAIGN_IDENTIFIER = "SOLDES_ETE_2026"
const PROMO_CODES = ["SOLDE_LC_15"]

export default async function deactivateSoldesEte2026({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const promotionModule = container.resolve(Modules.PROMOTION) as any

  logger.info("🏷️  Désactivation Soldes Été 2026...")

  for (const code of PROMO_CODES) {
    const existing = await promotionModule.listPromotions({ code: [code] })
    if (existing.length > 0) {
      await promotionModule.deletePromotions(existing.map((p: any) => p.id))
      logger.info(`✅ Promotion ${code} supprimée.`)
    } else {
      logger.info(`ℹ️  Promotion ${code} introuvable (déjà supprimée ?).`)
    }
  }

  try {
    const campaigns = await promotionModule.listCampaigns({
      campaign_identifier: [CAMPAIGN_IDENTIFIER],
    })
    if (campaigns.length > 0) {
      await promotionModule.deleteCampaigns(campaigns.map((c: any) => c.id))
      logger.info(`✅ Campagne "${CAMPAIGN_IDENTIFIER}" supprimée.`)
    }
  } catch {
    logger.warn("⚠️  Impossible de supprimer la campagne.")
  }

  logger.info("✅ Soldes Été 2026 désactivés.")
  logger.info("⚠️  Penser à mettre ACTIVE_PROMO = BRADERIE_PROMO (ou autre) dans active-promo.ts")
}
