/**
 * Promotions automatiques Black Week 2026 (23–30 novembre, heure belge).
 *
 *   • BW_VETEMENTS_20 : −20 % sur les vêtements (pas tout le rayon Cavalier).
 *   • BW_COUVERTURES_20 : −20 % sur la catégorie Couvertures et ses enfants.
 *     Dès 2 couvertures, le hook panier relève cet adjustment à −30 %
 *     (code BW_COUVERTURES_30). Ce palier n'est pas une promo buy-get :
 *     Medusa ne remettrait alors qu'une quantité « offerte », pas toutes
 *     les couvertures.
 *   • Outlet −60 % : pas une promotion. Le prix est dans unit_price
 *     (outlet-add-to-cart + hook). Une promo en plus serait doublée
 *     puis supprimée, et un vêtement outlet doit rester à −60 % seulement.
 *
 * Idempotent : résout les catégories d'abord, puis remplace les promos
 * et la campagne si elles existent déjà.
 *
 * Usage :
 *   npx medusa exec src/scripts/seed-black-week-2026.ts
 * En prod (après sauvegarde de la base) :
 *   DATABASE_URL=... REDIS_URL="" npx medusa exec src/scripts/seed-black-week-2026.ts
 *
 * Retrait : npx medusa exec src/scripts/deactivate-black-week-2026.ts
 * La campagne a une ends_at : Medusa cesse de l'appliquer le 30 novembre
 * à 23:59 (heure belge). Le hook panier s'arrête à la même seconde.
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
import {
  BLACK_WEEK_END,
  BLACK_WEEK_START,
  BLANKET_PARENT_HANDLES,
  BW_BLANKET_CODE,
  BW_BLANKET_MULTI_CODE,
  BW_CLOTHING_CODE,
  CLOTHING_PARENT_HANDLES,
} from "../utils/black-week"

const CAMPAIGN_IDENTIFIER = "BLACK_WEEK_2026"
const PROMO_CODES = [BW_CLOTHING_CODE, BW_BLANKET_CODE, BW_BLANKET_MULTI_CODE]

type CategoryRow = {
  id: string
  name?: string | null
  handle?: string | null
  parent_category_id?: string | null
}

function collectSubtreeIds(rootId: string, allCats: CategoryRow[]): string[] {
  const ids: string[] = [rootId]
  for (const category of allCats) {
    if (category.parent_category_id === rootId) {
      ids.push(...collectSubtreeIds(category.id, allCats))
    }
  }
  return ids
}

function idsForHandles(handles: readonly string[], categories: CategoryRow[]): string[] {
  const ids: string[] = []
  for (const handle of handles) {
    const category = categories.find(
      (row) => (row.handle ?? "").toLowerCase() === handle.toLowerCase()
    )
    if (category) ids.push(...collectSubtreeIds(category.id, categories))
  }
  return [...new Set(ids)]
}

export default async function seedBlackWeek2026({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const promotionModule = container.resolve(Modules.PROMOTION) as any
  const productModule = container.resolve(Modules.PRODUCT) as any

  logger.info("Black Week 2026...")
  logger.info(`   Valable : ${BLACK_WEEK_START.toISOString()} → ${BLACK_WEEK_END.toISOString()} (UTC)`)
  logger.info("   Soit : 23 nov 00:00 → 30 nov 23:59 (heure belge)")

  const categories: CategoryRow[] = await productModule.listProductCategories(
    {},
    { select: ["id", "name", "handle", "parent_category_id"], take: 1000 }
  )

  const blanketIds = idsForHandles(BLANKET_PARENT_HANDLES, categories)
  const blanketIdSet = new Set(blanketIds)
  const clothingIds = idsForHandles(CLOTHING_PARENT_HANDLES, categories).filter(
    (id) => !blanketIdSet.has(id)
  )

  const describe = (ids: string[]) =>
    categories
      .filter((category) => ids.includes(category.id))
      .map((category) => `${category.name ?? category.id} [${category.handle}]`)
      .sort((a, b) => a.localeCompare(b, "fr"))

  logger.info(`   Vêtements : ${clothingIds.length} catégorie(s)`)
  for (const line of describe(clothingIds)) logger.info(`     - ${line}`)
  logger.info(`   Couvertures : ${blanketIds.length} catégorie(s)`)
  for (const line of describe(blanketIds)) logger.info(`     - ${line}`)
  logger.info("   Outlet −60 % : unit_price, aucune promotion créée.")

  if (clothingIds.length === 0 || blanketIds.length === 0) {
    throw new Error(
      "Catégories vêtements ou couvertures introuvables — aucune promotion écrite."
    )
  }

  const existing = await promotionModule.listPromotions({ code: PROMO_CODES })
  if (existing.length > 0) {
    logger.info(`   Promos déjà présentes (${existing.length}) — remplacement.`)
    await promotionModule.deletePromotions(existing.map((promo: { id: string }) => promo.id))
  }

  try {
    const existingCampaigns = await promotionModule.listCampaigns({
      campaign_identifier: [CAMPAIGN_IDENTIFIER],
    })
    if (existingCampaigns.length > 0) {
      await promotionModule.deleteCampaigns(
        existingCampaigns.map((campaign: { id: string }) => campaign.id)
      )
    }
  } catch {
    // listCampaigns peut manquer selon la version
  }

  const createdCampaigns = await promotionModule.createCampaigns([
    {
      name: "Black Week 2026",
      description:
        "−20 % vêtements · couvertures −20 % (−30 % dès 2, hook panier) · outlet −60 % · 23–30 novembre 2026",
      campaign_identifier: CAMPAIGN_IDENTIFIER,
      starts_at: BLACK_WEEK_START,
      ends_at: BLACK_WEEK_END,
    },
  ])
  const campaign = Array.isArray(createdCampaigns) ? createdCampaigns[0] : createdCampaigns
  if (!campaign?.id) {
    throw new Error("Campagne Black Week non créée — promotions non écrites.")
  }

  const method = {
    type: ApplicationMethodType.PERCENTAGE,
    target_type: ApplicationMethodTargetType.ITEMS,
    allocation: "each" as const,
    max_quantity: 100,
    apply_to_quantity: 1,
  }

  await promotionModule.createPromotions([
    {
      code: BW_CLOTHING_CODE,
      type: PromotionType.STANDARD,
      is_automatic: true,
      status: "active",
      campaign_id: campaign.id,
      application_method: {
        ...method,
        value: 20,
        target_rules: [
          {
            attribute: "product_category_id",
            operator: PromotionRuleOperator.IN,
            values: clothingIds,
          },
        ],
      },
      rules: [],
    },
    {
      code: BW_BLANKET_CODE,
      type: PromotionType.STANDARD,
      is_automatic: true,
      status: "active",
      campaign_id: campaign.id,
      application_method: {
        ...method,
        value: 20,
        target_rules: [
          {
            attribute: "product_category_id",
            operator: PromotionRuleOperator.IN,
            values: blanketIds,
          },
        ],
      },
      rules: [],
    },
  ])

  logger.info(`✅ ${BW_CLOTHING_CODE} créée (−20 % vêtements, ${clothingIds.length} catégories).`)
  logger.info(`✅ ${BW_BLANKET_CODE} créée (−20 % couvertures, ${blanketIds.length} catégories).`)
  logger.info("   −30 % dès 2 couvertures : hook panier, pas une seconde promo.")
  logger.info("   Outlet −60 % : unit_price uniquement.")
}
