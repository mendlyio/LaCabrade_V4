/**
 * Crée la catégorie "outlet" si elle n'existe pas, puis la promotion OUTLET_50 (-50%).
 * Corrige le 404 sur /categories/outlet.
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
const OUTLET_HANDLES = ["outlet", "outlet-727"]

/** IDs des catégories outlet (racine + sous-catégories) */
function getOutletCategoryIds(
  categoryId: string,
  byId: Map<string, { id: string; parent_category_id?: string | null }>
): string[] {
  const ids: string[] = [categoryId]
  for (const [cid, cat] of byId) {
    if (cat.parent_category_id === categoryId) {
      ids.push(...getOutletCategoryIds(cid, byId))
    }
  }
  return ids
}

export default async function seedOutletPromotion({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModule = container.resolve(Modules.PRODUCT) as any
  const promotionModule = container.resolve(Modules.PROMOTION) as any

  logger.info("🏷️  Configuration Outlet : catégorie + promotion -50%...")

  // --- 1. Créer la catégorie "outlet" si elle n'existe pas ---
  let outletCategory = (await productModule.listProductCategories({ handle: "outlet" }))[0]
  if (!outletCategory) {
    logger.info('   Catégorie "outlet" absente — création...')
    try {
      outletCategory = await productModule.createProductCategories({
        name: "Outlet",
        handle: "outlet",
        is_active: true,
        description: "Promotions -50% sur une sélection d'articles",
      })
      logger.info(`✅ Catégorie "outlet" créée (id: ${outletCategory.id})`)
    } catch (e: any) {
      logger.error(`❌ Erreur création catégorie : ${e.message}`)
      return
    }
  } else {
    logger.info(`✅ Catégorie "outlet" existante : ${outletCategory.name} (id: ${outletCategory.id})`)
  }

  // --- 2. Collecter outlet + sous-catégories (outlet-727, etc.) ---
  const allCategories = await productModule.listProductCategories(
    {},
    { select: ["id", "name", "handle", "parent_category_id"], take: 500 }
  )
  const byId = new Map(allCategories.map((c: any) => [c.id, c]))
  const outletIds: string[] = []

  for (const h of OUTLET_HANDLES) {
    const cat = allCategories.find((c: any) => (c.handle || "").toLowerCase() === h)
    if (cat) {
      outletIds.push(...getOutletCategoryIds(cat.id, byId))
    }
  }
  const uniqueIds = [...new Set(outletIds)]
  logger.info(`   Catégories ciblées : ${uniqueIds.length} (outlet + sous-catégories)`)

  // --- 3. Créer ou mettre à jour la promotion OUTLET_50 ---
  const existing = await promotionModule.listPromotions({ code: ["OUTLET_50"] })
  if (existing.length > 0) {
    logger.info("⚠️  Promotion OUTLET_50 déjà présente — suppression et recréation.")
    await promotionModule.deletePromotions(existing.map((p: any) => p.id))
  }

  try {
    await promotionModule.createPromotions([
      {
        code: "OUTLET_50",
        type: PromotionType.STANDARD,
        is_automatic: true,
        status: "active",
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
              values: uniqueIds,
            },
          ],
        },
        rules: [],
      } as any,
    ])

    logger.info(`✅ Promotion "OUTLET_50" créée avec succès !`)
    logger.info(`   Type : automatique (aucun code à saisir)`)
    logger.info(`   Remise : -${OUTLET_DISCOUNT_PERCENT}% sur tous les items de la catégorie Outlet`)
    logger.info(`   Catégories ciblées : ${uniqueIds.length}`)
    logger.info("")
    logger.info("📋 La page /fr/categories/outlet (ou /nl/categories/outlet) devrait maintenant fonctionner.")
    logger.info("💡 L'API outlet-add-to-cart applique -50% directement sur le line item au panier.")
  } catch (e: any) {
    logger.error(`❌ Erreur création promotion : ${e.message}`)
    logger.info("")
    logger.info("Alternative — créer manuellement dans le dashboard Medusa :")
    logger.info("  Settings → Promotions → New Promotion")
    logger.info("  - Code : OUTLET_50")
    logger.info("  - Type : Automatic")
    logger.info("  - Discount : 50% off items")
    logger.info(`  - Condition : product category IN [${uniqueIds.join(", ")}]`)
  }
}
