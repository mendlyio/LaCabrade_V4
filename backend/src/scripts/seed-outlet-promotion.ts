/**
 * Crée une promotion automatique "OUTLET_50" qui applique -50%
 * sur tous les articles de la catégorie "outlet" dans le panier.
 *
 * Usage : npx medusa exec src/scripts/seed-outlet-promotion.ts
 * En prod : DATABASE_URL=... REDIS_URL="" npx medusa exec src/scripts/seed-outlet-promotion.ts
 */

import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  PromotionRuleOperator,
  PromotionType,
  ApplicationMethodType,
  ApplicationMethodTargetType,
} from "@medusajs/framework/utils"

const OUTLET_DISCOUNT_PERCENT = 50

export default async function seedOutletPromotion({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModule = container.resolve(Modules.PRODUCT)
  const promotionModule = container.resolve(Modules.PROMOTION)

  logger.info("🏷️  Création de la promotion Outlet -50%...")

  // --- Trouver la catégorie Outlet ---
  const categories = await productModule.listProductCategories({ handle: ["outlet"] })
  if (!categories.length) {
    logger.error('❌ Catégorie "outlet" non trouvée dans Medusa.')
    logger.info('   → Créez d\'abord la catégorie avec le handle "outlet" dans le dashboard.')
    return
  }
  const outletCategory = categories[0]
  logger.info(`✅ Catégorie trouvée: ${outletCategory.name} (id: ${outletCategory.id})`)

  // --- Vérifier si la promotion existe déjà ---
  const existing = await promotionModule.listPromotions({ code: ["OUTLET_50"] })
  if (existing.length > 0) {
    logger.info("⚠️  Promotion OUTLET_50 déjà présente — suppression et recréation.")
    await promotionModule.deletePromotions(existing.map((p: any) => p.id))
  }

  // --- Créer la promotion ---
  try {
    await promotionModule.createPromotions([
      {
        code: "OUTLET_50",
        type: PromotionType.STANDARD,
        is_automatic: true,
        application_method: {
          type: ApplicationMethodType.PERCENTAGE,
          target_type: ApplicationMethodTargetType.ITEMS,
          allocation: "each" as any,
          value: OUTLET_DISCOUNT_PERCENT,
          max_quantity: 100,
          apply_to_quantity: 1,
          target_rules: [
            {
              attribute: "product_category_id",
              operator: PromotionRuleOperator.IN,
              values: [outletCategory.id],
            },
          ],
        },
        rules: [],
      } as any,
    ])

    logger.info(`✅ Promotion "OUTLET_50" créée avec succès !`)
    logger.info(`   Type : automatique (aucun code à saisir)`)
    logger.info(`   Remise : -${OUTLET_DISCOUNT_PERCENT}% sur tous les items de la catégorie Outlet`)
    logger.info(`   Catégorie ciblée : ${outletCategory.name} (${outletCategory.id})`)
    logger.info("")
    logger.info("💡 Cette promotion s'applique automatiquement dans le panier dès qu'un")
    logger.info("   produit de la catégorie Outlet est ajouté.")
  } catch (e: any) {
    logger.error(`❌ Erreur création promotion : ${e.message}`)
    logger.info("")
    logger.info("Alternative — créer manuellement dans le dashboard Medusa :")
    logger.info("  Settings → Promotions → New Promotion")
    logger.info("  - Code : OUTLET_50")
    logger.info("  - Type : Automatic")
    logger.info("  - Discount : 50% off items")
    logger.info(`  - Condition : product category = outlet (id: ${outletCategory.id})`)
  }
}
