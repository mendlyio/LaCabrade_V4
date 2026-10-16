/**
 * Promotion automatique Portes Ouvertes octobre 2026 (16–24 octobre).
 *
 *   • PO_OCT_CAVALIER_20 : −20 % sur la catégorie « cavalier » et toutes
 *     ses sous-catégories. Pas de −10 % global, pas de palier LC.
 *   • Outlet −60 % : PAS une promotion Medusa. Le prix est écrit dans
 *     unit_price par outlet-add-to-cart et réaligné par le hook panier
 *     (50 % en dehors de la période).
 *
 * Usage :
 *   npx medusa exec src/scripts/seed-portes-ouvertes-octobre-2026.ts
 * En prod :
 *   DATABASE_URL=... REDIS_URL="" npx medusa exec src/scripts/seed-portes-ouvertes-octobre-2026.ts
 *
 * La campagne a une ends_at : elle s'arrête seule le 24 octobre 23:59 (heure belge).
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
  PO_OCTOBRE_CODE,
  PO_OCTOBRE_END,
  PO_OCTOBRE_START,
} from "../utils/portes-ouvertes-octobre"

const CAMPAIGN_IDENTIFIER = "PORTES_OUVERTES_OCTOBRE_2026"
const CAVALIER_HANDLES = ["cavalier"]

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

/**
 * Crée PO_OCT_CAVALIER_20 si elle n'existe pas encore.
 * Ne recrée rien si elle est déjà là (évite de la retirer des paniers).
 * Après le 24 octobre, ne fait plus rien.
 */
export async function ensurePortesOuvertesOctobre2026({ container }: ExecArgs) {
  if (new Date() > PO_OCTOBRE_END) return

  const promotionModule = container.resolve(Modules.PROMOTION) as any
  const existing = await promotionModule.listPromotions({ code: [PO_OCTOBRE_CODE] })
  if (existing.length > 0) return

  await seedPortesOuvertesOctobre2026({ container, args: [] })
}

export default async function seedPortesOuvertesOctobre2026({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const promotionModule = container.resolve(Modules.PROMOTION) as any
  const productModule = container.resolve(Modules.PRODUCT) as any

  logger.info("🏇  Portes Ouvertes octobre 2026...")
  logger.info(`   Valable : ${PO_OCTOBRE_START.toISOString()} → ${PO_OCTOBRE_END.toISOString()} (UTC)`)
  logger.info("   Soit : 16 oct 00:00 → 24 oct 23:59 (heure belge)")

  const allCategories: Array<{
    id: string
    handle?: string | null
    parent_category_id?: string | null
  }> = await productModule.listProductCategories(
    {},
    { select: ["id", "handle", "parent_category_id"], take: 1000 }
  )

  const cavalierIds: string[] = []
  for (const handle of CAVALIER_HANDLES) {
    const cat = allCategories.find((c) => (c.handle ?? "").toLowerCase() === handle)
    if (cat) cavalierIds.push(...collectSubtreeIds(cat.id, allCategories))
  }
  const uniqueCavalierIds = [...new Set(cavalierIds)]
  logger.info(`   Cavalier : ${uniqueCavalierIds.length} catégorie(s)`)

  if (uniqueCavalierIds.length === 0) {
    throw new Error("Catégorie 'cavalier' introuvable — promotion non créée.")
  }

  const existing = await promotionModule.listPromotions({ code: [PO_OCTOBRE_CODE] })
  if (existing.length > 0) {
    logger.info(`⚠️  ${PO_OCTOBRE_CODE} déjà présente — suppression et recréation.`)
    await promotionModule.deletePromotions(existing.map((p: any) => p.id))
  }

  try {
    const existingCampaigns = await promotionModule.listCampaigns({
      campaign_identifier: [CAMPAIGN_IDENTIFIER],
    })
    if (existingCampaigns.length > 0) {
      await promotionModule.deleteCampaigns(existingCampaigns.map((c: any) => c.id))
    }
  } catch {
    // Pas critique
  }

  await promotionModule.createPromotions([
    {
      code: PO_OCTOBRE_CODE,
      type: PromotionType.STANDARD,
      is_automatic: true,
      status: "active",
      campaign: {
        name: "Portes Ouvertes octobre 2026",
        description: "−20 % catégorie Cavalier · Outlet −60 % · 16–24 octobre 2026",
        campaign_identifier: CAMPAIGN_IDENTIFIER,
        starts_at: PO_OCTOBRE_START,
        ends_at: PO_OCTOBRE_END,
      },
      application_method: {
        type: ApplicationMethodType.PERCENTAGE,
        target_type: ApplicationMethodTargetType.ITEMS,
        allocation: "each" as any,
        value: 20,
        max_quantity: 100,
        apply_to_quantity: 1,
        target_rules: [
          {
            attribute: "product_category_id",
            operator: PromotionRuleOperator.IN,
            values: uniqueCavalierIds,
          },
        ],
      },
      rules: [],
    },
  ])

  logger.info(`✅ ${PO_OCTOBRE_CODE} créée (−20 % sur la catégorie cavalier et ses sous-catégories).`)
  logger.info("   Outlet −60 % : géré par unit_price (outlet-add-to-cart + hook), pas par cette promo.")
  logger.info("   Le hook retire la promo des articles outlet et des codes manuels, et corrige le montant HT.")
}
