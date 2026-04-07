/**
 * Désactive la promotion PAQUES_10 en base (sans supprimer le code ni la config).
 * À relancer après une opération Pâques ; pour réactiver, utiliser le dashboard Medusa
 * ou recréer via seed-paques-promotion.ts (après adaptation des dates).
 *
 * Usage :
 *   npx medusa exec src/scripts/deactivate-paques-promotion.ts
 */

import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

const PROMO_CODE = "PAQUES_10"

export default async function deactivatePaquesPromotion({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const promotionModule = container.resolve(Modules.PROMOTION) as any

  logger.info(`🔕 Désactivation de la promotion ${PROMO_CODE}...`)

  const existing = await promotionModule.listPromotions({ code: [PROMO_CODE] })
  if (existing.length === 0) {
    logger.info(`   Aucune promotion ${PROMO_CODE} trouvée — rien à faire.`)
    return
  }

  for (const p of existing) {
    await promotionModule.updatePromotions([{ id: p.id, status: "inactive" }])
    logger.info(`   ✅ ${PROMO_CODE} (id ${p.id}) → inactive`)
  }
}
