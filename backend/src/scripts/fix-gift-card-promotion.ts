/**
 * Corrige les promotions bon cadeau (LC-XXXX-XXXX-XXXX) :
 * - target_type: "items" → "order" (évite les conflits avec outlet/last-chance)
 * - value en centimes → euros si nécessaire
 *
 * Usage : npx medusa exec src/scripts/fix-gift-card-promotion.ts
 */

import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

const GC_CODE_PATTERN = /^(LC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}|[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4})$/

export default async function fixGiftCardPromotion({ container }: ExecArgs) {
  const promotionModule = container.resolve(Modules.PROMOTION) as any
  const logger = container.resolve("logger") as any

  logger.info("🔍 Recherche des promotions bon cadeau (LC-XXXX-XXXX-XXXX)...")

  const allPromotions = await promotionModule.listPromotions(
    {},
    { relations: ["application_method", "campaign", "campaign.budget"], take: 500 }
  )

  const gcPromotions = allPromotions.filter(
    (p: any) => p.code && GC_CODE_PATTERN.test(p.code)
  )

  if (gcPromotions.length === 0) {
    logger.info("Aucune promotion bon cadeau trouvée.")
    return
  }

  logger.info(`📋 ${gcPromotions.length} promotion(s) bon cadeau trouvée(s).`)

  for (const promo of gcPromotions) {
    const currentValue = Number(promo.application_method?.value ?? 0)
    const currentTargetType = promo.application_method?.target_type
    const needsValueFix = currentValue > 100
    const needsTargetTypeFix = currentTargetType !== "order"

    logger.info(`\n--- ${promo.code} ---`)
    logger.info(`   ID: ${promo.id}`)
    logger.info(`   Value: ${currentValue}`)
    logger.info(`   target_type: ${currentTargetType}`)
    logger.info(`   Budget limit: ${promo.campaign?.budget?.limit}`)

    if (!needsValueFix && !needsTargetTypeFix) {
      logger.info(`   ✅ Déjà correct.`)
      continue
    }

    const correctedValue = needsValueFix ? currentValue / 100 : currentValue

    const updatePayload: any = {
      id: promo.id,
      application_method: {
        target_type: "order",
        value: correctedValue,
      },
    }

    await promotionModule.updatePromotions([updatePayload])

    if (needsValueFix && promo.campaign?.budget?.id) {
      try {
        await promotionModule.updateCampaigns([
          {
            id: promo.campaign.id,
            budget: { limit: correctedValue },
          },
        ])
      } catch (e: any) {
        logger.warn(`   ⚠️ Budget update failed: ${e.message}`)
      }
    }

    const changes: string[] = []
    if (needsTargetTypeFix) changes.push(`target_type: ${currentTargetType} → order`)
    if (needsValueFix) changes.push(`value: ${currentValue} → ${correctedValue}€`)
    logger.info(`   ✅ Corrigé: ${changes.join(", ")}`)
  }

  logger.info("\n🎉 Terminé.")
}
