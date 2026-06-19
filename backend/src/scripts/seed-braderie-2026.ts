/**
 * Crée la promotion automatique Braderie 2026.
 *
 * ─── Architecture (identique au pattern Portes Ouvertes éprouvé) ─────────────
 *
 * BRADERIE_15 est une promotion automatique -15% SANS règle de ciblage : elle
 * s'applique donc à TOUS les articles du panier (comme PO_GLOBAL_10).
 *
 * Le filtrage de l'éligibilité et la logique métier sont entièrement gérés EN
 * CODE par le hook synchrone backend/src/workflows/restore-outlet-prices-hook.ts
 * (bloc C — Braderie), qui :
 *   - retire BRADERIE_15 des articles NON éligibles (hors vêtements Cavalier
 *     ciblés et hors LC Equestrian), des articles outlet et des bons cadeau ;
 *   - garde -15% sur les vêtements Cavalier ciblés (concours, pantalons,
 *     sweats-et-pulls, t-shirts-et-polos, vestes + toutes leurs sous-catégories
 *     dame/enfant) et sur les articles LC Equestrian ;
 *   - transforme LC en BRADERIE_LC_25 (-25%) dès que le panier contient
 *     3 articles LC ou plus.
 *
 * ⚠️  Pourquoi pas de target_rules sur product_category_id ?
 * Le moteur de promotions Medusa ne matchait PAS de façon fiable les articles
 * via target_rules `product_category_id` (0 ajustement créé en prod). Le pattern
 * « promo globale sans règle + filtrage par le hook » est lui prouvé en prod
 * (PO_GLOBAL_10). On reproduit donc ce pattern.
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
  PromotionType,
} from "@medusajs/framework/utils"

// Heure belge (CEST = UTC+2 en juin) :
//   19 juin 00:00 BEL = 18 juin 22:00 UTC
//   21 juin 09:00 BEL = 21 juin 07:00 UTC
const STARTS_AT = new Date("2026-06-18T22:00:00.000Z")
const ENDS_AT = new Date("2026-06-21T07:00:00.000Z")
const CAMPAIGN_IDENTIFIER = "BRADERIE_2026"
const PROMO_CODES = ["BRADERIE_15", "BRADERIE_LC_25"]

export default async function seedBraderie2026({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const promotionModule = container.resolve(Modules.PROMOTION) as any

  logger.info("🏷️  Configuration Braderie 2026...")
  logger.info(`   Valable : ${STARTS_AT.toISOString()} → ${ENDS_AT.toISOString()} (UTC)`)
  logger.info("   Soit : 19 juin 00:00 → 21 juin 09:00 (heure belge)")

  // ─── Supprimer les promotions Braderie existantes (idempotent) ──────────────
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
    // Pas critique si listCampaigns n'est pas disponible
  }

  // ─── Création de la promotion globale -15% (filtrage géré par le hook) ───────
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
        // PAS de target_rules : -15% sur tous les articles, le hook filtre.
      },
      rules: [],
    } as any,
  ])

  logger.info("✅ Promotion BRADERIE_15 créée (-15% global, filtrage par le hook).")
  logger.info("💡 Le hook panier :")
  logger.info("   - retire BRADERIE_15 des articles non éligibles / outlet / bons cadeau")
  logger.info("   - garde -15% sur vêtements Cavalier ciblés + LC Equestrian")
  logger.info("   - transforme LC en BRADERIE_LC_25 (-25%) dès 3 articles LC")
}
