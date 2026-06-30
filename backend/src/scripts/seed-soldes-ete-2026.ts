/**
 * Crée la promotion automatique Soldes Été 2026.
 *
 * ─── Architecture ────────────────────────────────────────────────────────────
 *
 * SOLDE_LC_15 est une promotion automatique -15% SANS règle de ciblage :
 * elle s'applique donc à TOUS les articles du panier.
 *
 * Le filtrage et la logique métier sont gérés EN CODE par le hook synchrone
 * backend/src/workflows/restore-outlet-prices-hook.ts (bloc C-bis — Soldes),
 * qui :
 *   - retire SOLDE_LC_15 des articles non éligibles
 *   - garde -15% (SOLDE_LC_15) sur les articles LC Equestrian
 *   - monte à -25% (SOLDE_CAVALIER_25) sur les Vêtements Cavalier ciblés
 *     (concours / pantalons / sweats-et-pulls / t-shirts-et-polos / vestes +
 *      toutes leurs sous-catégories dame/enfant/concours)
 *   - gère la remise outlet à -60% dans le bloc A (adjustment supplémentaire)
 *
 * Usage :
 *   npx medusa exec src/scripts/seed-soldes-ete-2026.ts
 * En prod (Railway) :
 *   DATABASE_URL=... REDIS_URL="" npx medusa exec src/scripts/seed-soldes-ete-2026.ts
 */

import { ExecArgs } from "@medusajs/framework/types"
import {
  ApplicationMethodTargetType,
  ApplicationMethodType,
  ContainerRegistrationKeys,
  Modules,
  PromotionType,
} from "@medusajs/framework/utils"

// Heure belge (CEST = UTC+2) :
//   30 juin 00:00 BEL = 29 juin 22:00 UTC
//   31 juillet 23:59 BEL = 31 juillet 21:59 UTC
const STARTS_AT = new Date("2026-06-29T22:00:00.000Z")
const ENDS_AT = new Date("2026-07-31T21:59:59.000Z")
const CAMPAIGN_IDENTIFIER = "SOLDES_ETE_2026"
const PROMO_CODES = ["SOLDE_LC_15"]

export default async function seedSoldesEte2026({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const promotionModule = container.resolve(Modules.PROMOTION) as any

  logger.info("🏷️  Configuration Soldes Été 2026...")
  logger.info(`   Valable : ${STARTS_AT.toISOString()} → ${ENDS_AT.toISOString()} (UTC)`)
  logger.info("   Soit : 30 juin 00:00 → 31 juillet 23:59 (heure belge)")

  // ─── Supprimer les promotions Soldes existantes (idempotent) ─────────────────
  for (const code of PROMO_CODES) {
    const existing = await promotionModule.listPromotions({ code: [code] })
    if (existing.length > 0) {
      logger.info(`⚠️  Promotion ${code} déjà présente — suppression et recréation.`)
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
    // Pas critique
  }

  // ─── Création de la promotion globale -15% (filtrage géré par le hook) ────────
  await promotionModule.createPromotions([
    {
      code: "SOLDE_LC_15",
      type: PromotionType.STANDARD,
      is_automatic: true,
      status: "active",
      campaign: {
        name: "Soldes Été 2026",
        description:
          "Vêtements Cavalier -25%, LC Equestrian -15%, Outlet -60%",
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
        // PAS de target_rules : -15% sur tous les articles, le hook filtre.
      },
      rules: [],
    } as any,
  ])

  logger.info("✅ Promotion SOLDE_LC_15 créée (-15% global, filtrage par le hook).")
  logger.info("💡 Le hook panier (Block C-bis) :")
  logger.info("   - retire SOLDE_LC_15 des articles non éligibles")
  logger.info("   - garde -15% (SOLDE_LC_15) sur les articles LC Equestrian")
  logger.info("   - monte à -25% (SOLDE_CAVALIER_25) sur Vêtements Cavalier ciblés")
  logger.info("   - Block A : outlet ajusté à -60% via SOLDE_OUTLET_60")
}
