/**
 * Crée les promotions automatiques pour les Portes Ouvertes 2026 (1–9 mai 2026).
 *
 * Promotions créées :
 *   - PO_CAVALIER_20  : -20% sur les produits de la catégorie "cavalier"
 *   - PO_LC_20        : -20% sur les produits LC Equestrian (catégories la-cabrade / lc-equestrian)
 *   - PO_GLOBAL_10    : -10% sur tous les articles (catégories exclues et stacking gérés par subscriber)
 *
 * La remise -60% outlet est gérée directement par outlet-add-to-cart/route.ts (date-based).
 *
 * Non-cumulation avec les codes manuels (influenceuses, newsletter, bienvenue) :
 *   → gérée par le subscriber cart-portes-ouvertes-guard.ts
 *
 * Usage :
 *   npx medusa exec src/scripts/seed-portes-ouvertes-2026.ts
 * En prod :
 *   DATABASE_URL=... REDIS_URL="" npx medusa exec src/scripts/seed-portes-ouvertes-2026.ts
 *
 * Pour désactiver après le 9 mai (sans supprimer les promos) :
 *   → Les promotions ont une endDate : elles s'arrêtent automatiquement.
 *   → Optionnel : lancer deactivate-portes-ouvertes-2026.ts pour les supprimer.
 */

import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  PromotionType,
  ApplicationMethodType,
  ApplicationMethodTargetType,
  PromotionRuleOperator,
} from "@medusajs/framework/utils"

// Heure belge (CEST = UTC+2 en mai) :
//   1 mai 00:00 BEL = 30 avril 22:00 UTC
//   9 mai 23:59 BEL = 9 mai 21:59 UTC
const STARTS_AT = new Date("2026-04-30T22:00:00.000Z")
const ENDS_AT = new Date("2026-05-09T21:59:59.000Z")

const CAMPAIGN_IDENTIFIER = "PORTES_OUVERTES_2026"

// Handles des catégories ciblées
const CAVALIER_HANDLES = ["cavalier"]
const LC_EQUESTRIAN_HANDLES = ["la-cabrade", "lc-equestrian", "lc_equestrian"]

/** Collecte l'ID d'une catégorie racine et tous ses descendants */
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

export default async function seedPortesOuvertes2026({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const promotionModule = container.resolve(Modules.PROMOTION) as any
  const productModule = container.resolve(Modules.PRODUCT) as any

  logger.info("🏇  Configuration promotions Portes Ouvertes 2026...")
  logger.info(`   Valable : ${STARTS_AT.toISOString()} → ${ENDS_AT.toISOString()} (UTC)`)
  logger.info("   Soit : 1 mai 00:00 → 9 mai 23:59 (heure belge)")

  // ─── Résolution des IDs de catégories ────────────────────────────────────────
  const allCategories: Array<{
    id: string
    handle?: string | null
    parent_category_id?: string | null
  }> = await productModule.listProductCategories(
    {},
    { select: ["id", "handle", "parent_category_id"], take: 500 }
  )

  // Catégories Cavalier (+ sous-catégories)
  const cavalierIds: string[] = []
  for (const handle of CAVALIER_HANDLES) {
    const cat = allCategories.find((c) => (c.handle ?? "").toLowerCase() === handle)
    if (cat) cavalierIds.push(...collectSubtreeIds(cat.id, allCategories))
  }
  const uniqueCavalierIds = [...new Set(cavalierIds)]
  logger.info(`   Cavalier : ${uniqueCavalierIds.length} catégorie(s) trouvée(s)`)

  // Catégories LC Equestrian (+ sous-catégories)
  const lcIds: string[] = []
  for (const handle of LC_EQUESTRIAN_HANDLES) {
    const cat = allCategories.find((c) => (c.handle ?? "").toLowerCase() === handle)
    if (cat) lcIds.push(...collectSubtreeIds(cat.id, allCategories))
  }
  const uniqueLcIds = [...new Set(lcIds)]
  logger.info(`   LC Equestrian : ${uniqueLcIds.length} catégorie(s) trouvée(s)`)

  // ─── Supprimer les promotions PO existantes (idempotent) ─────────────────────
  const PROMO_CODES = ["PO_CAVALIER_20", "PO_LC_20", "PO_GLOBAL_10"]
  for (const code of PROMO_CODES) {
    const existing = await promotionModule.listPromotions({ code: [code] })
    if (existing.length > 0) {
      logger.info(`⚠️  Promotion ${code} déjà présente — suppression et recréation.`)
      await promotionModule.deletePromotions(existing.map((p: any) => p.id))
    }
  }

  // Supprimer l'ancienne campagne si elle existe
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

  // ─── Création des promotions ──────────────────────────────────────────────────
  const promosToCreate: any[] = []

  // a) -20% Cavalier
  if (uniqueCavalierIds.length > 0) {
    promosToCreate.push({
      code: "PO_CAVALIER_20",
      type: PromotionType.STANDARD,
      is_automatic: true,
      status: "active",
      campaign: {
        name: "Portes Ouvertes 2026",
        description: "−10% à −60% sur tout le site · 1–9 mai 2026",
        campaign_identifier: CAMPAIGN_IDENTIFIER,
        starts_at: STARTS_AT,
        ends_at: ENDS_AT,
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
    })
  } else {
    logger.warn("⚠️  Aucune catégorie 'cavalier' trouvée — promotion PO_CAVALIER_20 ignorée.")
  }

  // b) -20% LC Equestrian
  if (uniqueLcIds.length > 0) {
    promosToCreate.push({
      code: "PO_LC_20",
      type: PromotionType.STANDARD,
      is_automatic: true,
      status: "active",
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
            values: uniqueLcIds,
          },
        ],
      },
      rules: [],
    })
  } else {
    logger.warn("⚠️  Aucune catégorie LC Equestrian trouvée — promotion PO_LC_20 ignorée.")
  }

  // c) -10% global (sans target rules — le subscriber gère les exclusions)
  promosToCreate.push({
    code: "PO_GLOBAL_10",
    type: PromotionType.STANDARD,
    is_automatic: true,
    status: "active",
    application_method: {
      type: ApplicationMethodType.PERCENTAGE,
      target_type: ApplicationMethodTargetType.ITEMS,
      allocation: "each" as any,
      value: 10,
      max_quantity: 100,
      apply_to_quantity: 1,
    },
    rules: [],
  })

  try {
    await promotionModule.createPromotions(promosToCreate)

    logger.info("✅ Promotions Portes Ouvertes 2026 créées avec succès !")
    logger.info("   PO_CAVALIER_20 : -20% sur catégorie cavalier")
    logger.info("   PO_LC_20       : -20% sur catégories LC Equestrian")
    logger.info("   PO_GLOBAL_10   : -10% global (exclusions + non-cumulation gérées par subscriber)")
    logger.info("   Remise outlet  : -60% gérée par outlet-add-to-cart (date-based)")
    logger.info("")
    logger.info("💡 Le subscriber cart-portes-ouvertes-guard.ts gère :")
    logger.info("   - La non-cumulation avec les codes manuels (NL-, ANNIV-, BIENVENU, newsletter)")
    logger.info("   - L'exclusion des catégories tondeuses + compléments alimentaires")
    logger.info("   - La priorité : PO_CAVALIER_20/PO_LC_20 > PO_GLOBAL_10 (pas de cumul)")
    logger.info("   - Les articles outlet : tous les adjustments PO retirés (unit_price déjà réduit)")
  } catch (e: any) {
    logger.error(`❌ Erreur création promotions : ${e.message}`)
    throw e
  }
}
