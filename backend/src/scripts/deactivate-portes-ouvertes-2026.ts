/**
 * Désactive (supprime) les promotions Portes Ouvertes 2026.
 *
 * Usage :
 *   npx medusa exec src/scripts/deactivate-portes-ouvertes-2026.ts
 * En prod :
 *   DATABASE_URL=... REDIS_URL="" npx medusa exec src/scripts/deactivate-portes-ouvertes-2026.ts
 *
 * Note : les promotions ont déjà une ends_at au 9 mai 2026 → elles s'arrêtent automatiquement.
 * Ce script supprime proprement les entrées de la base pour garder le dashboard clean.
 */

import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

const PROMO_CODES = ["PO_CAVALIER_20", "PO_LC_20", "PO_GLOBAL_10"]
const CAMPAIGN_IDENTIFIER = "PORTES_OUVERTES_2026"

export default async function deactivatePortesOuvertes2026({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const promotionModule = container.resolve(Modules.PROMOTION) as any

  logger.info("🏁  Désactivation promotions Portes Ouvertes 2026...")

  for (const code of PROMO_CODES) {
    const existing = await promotionModule.listPromotions({ code: [code] })
    if (existing.length > 0) {
      await promotionModule.deletePromotions(existing.map((p: any) => p.id))
      logger.info(`✅ Promotion ${code} supprimée.`)
    } else {
      logger.info(`ℹ️  Promotion ${code} introuvable (déjà supprimée ou jamais créée).`)
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
  logger.info("💡 N'oublie pas de désactiver la promo côté frontend :")
  logger.info("   storefront/src/lib/config/active-promo.ts")
  logger.info("   → ACTIVE_PROMO = PORTES_OUVERTES_PROMO avec active: false")
}
