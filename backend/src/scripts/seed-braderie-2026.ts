/**
 * Crée la promotion automatique Braderie 2026.
 *
 * Règles :
 * - BRADERIE_15 : -15% sur les sous-catégories vêtements Cavalier ciblées + LC Equestrian
 * - BRADERIE_LC_25 : appliquée par le hook panier quand le panier contient 3+ articles LC
 *
 * Usage :
 *   npx medusa exec src/scripts/seed-braderie-2026.ts
 * En prod :
 *   DATABASE_URL=... REDIS_URL="" npx medusa exec src/scripts/seed-braderie-2026.ts
 */

import { ExecArgs } from "@medusajs/framework/types"
import {
  ApplicationMethodTargetType,
  ApplicationMethodType,
  ContainerRegistrationKeys,
  Modules,
  PromotionRuleOperator,
  PromotionType,
} from "@medusajs/framework/utils"

const STARTS_AT = new Date("2026-06-18T22:00:00.000Z")
const ENDS_AT = new Date("2026-06-21T07:00:00.000Z")
const CAMPAIGN_IDENTIFIER = "BRADERIE_2026"
const PROMO_CODES = ["BRADERIE_15", "BRADERIE_LC_25"]

const CAVALIER_CLOTHING_HANDLES = [
  "concours",
  "pantalons",
  "sweats-et-pulls",
  "t-shirts-et-polos",
  "vestes",
]

const LC_EQUESTRIAN_HANDLES = ["lc-equestrian"]

function collectSubtreeIds(
  rootId: string,
  allCats: Array<{ id: string; parent_category_id?: string | null }>
): string[] {
  const ids: string[] = [rootId]
  for (const cat of allCats) {
    if (cat.parent_category_id === rootId) {
      ids.push(...collectSubtreeIds(cat.id, allCats))
    }
  }
  return ids
}

export default async function seedBraderie2026({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const promotionModule = container.resolve(Modules.PROMOTION) as any
  const productModule = container.resolve(Modules.PRODUCT) as any

  logger.info("🏷️  Configuration Braderie 2026...")
  logger.info(`   Valable : ${STARTS_AT.toISOString()} → ${ENDS_AT.toISOString()} (UTC)`)
  logger.info("   Soit : 19 juin 00:00 → 21 juin 09:00 (heure belge)")

  const allCategories: Array<{
    id: string
    handle?: string | null
    parent_category_id?: string | null
  }> = await productModule.listProductCategories(
    {},
    { select: ["id", "handle", "parent_category_id"], take: 500 }
  )

  const eligibleCategoryIds = new Set<string>()
  const selectedHandles = [...CAVALIER_CLOTHING_HANDLES, ...LC_EQUESTRIAN_HANDLES]

  for (const handle of selectedHandles) {
    const category = allCategories.find(
      (c) => (c.handle ?? "").toLowerCase() === handle
    )
    if (!category) {
      logger.warn(`⚠️  Catégorie introuvable : ${handle}`)
      continue
    }
    collectSubtreeIds(category.id, allCategories).forEach((id) =>
      eligibleCategoryIds.add(id)
    )
  }

  const targetCategoryIds = [...eligibleCategoryIds]
  logger.info(`   Catégories ciblées : ${targetCategoryIds.length}`)

  if (targetCategoryIds.length === 0) {
    throw new Error("Aucune catégorie Braderie trouvée, promotion non créée.")
  }

  for (const code of PROMO_CODES) {
    const existing = await promotionModule.listPromotions({ code: [code] })
    if (existing.length > 0) {
      logger.info(`⚠️  Promotion ${code} déjà présente — suppression.`)
      await promotionModule.deletePromotions(existing.map((p: any) => p.id))
    }
  }

  try {
    const existingCampaigns = await promotionModule.listCampaigns({
      campaign_identifier: [CAMPAIGN_IDENTIFIER],
    })
    if (existingCampaigns.length > 0) {
      await promotionModule.deleteCampaigns(existingCampaigns.map((c: any) => c.id))
    }
  } catch {
    // Pas critique si listCampaigns n'est pas disponible
  }

  await promotionModule.createPromotions([
    {
      code: "BRADERIE_15",
      type: PromotionType.STANDARD,
      is_automatic: true,
      status: "active",
      campaign: {
        name: "Braderie 2026",
        description:
          "-15% vêtements Cavalier ciblés + LC, -25% LC dès 3 articles",
        campaign_identifier: CAMPAIGN_IDENTIFIER,
        starts_at: STARTS_AT,
        ends_at: ENDS_AT,
      },
      application_method: {
        type: ApplicationMethodType.PERCENTAGE,
        target_type: ApplicationMethodTargetType.ITEMS,
        allocation: "each" as any,
        value: 15,
        max_quantity: 100,
        apply_to_quantity: 1,
        target_rules: [
          {
            attribute: "product_category_id",
            operator: PromotionRuleOperator.IN,
            values: targetCategoryIds,
          },
        ],
      },
      rules: [],
    } as any,
  ])

  logger.info("✅ Promotion BRADERIE_15 créée.")
  logger.info("💡 Le hook panier transforme LC en BRADERIE_LC_25 dès 3 articles LC.")
}
