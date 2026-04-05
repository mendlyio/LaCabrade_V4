/**
 * Configuration de la promotion active affichée sur tout le site.
 *
 * Pour désactiver rapidement (fin de promo) :
 *   → mettre  active: false
 *
 * Pour une prochaine promo :
 *   → adapter discountPercent, label, startDate, endDate, excludedCategoryHandles
 *
 * La remise est uniquement VISUELLE côté storefront (prix barrés).
 * La remise au checkout est gérée par la promotion Medusa (PAQUES_10)
 * et le subscriber cart-paques-guard.ts côté backend.
 */

export type ActivePromoConfig = {
  /** Interrupteur principal — mettre false pour tout désactiver sans supprimer la config */
  active: boolean
  /** Code de la promotion Medusa correspondante */
  code: string
  /** Pourcentage de remise (ex: 10 = -10%) */
  discountPercent: number
  /** Label affiché dans le badge */
  label: string
  /** Date de début UTC */
  startDate: Date
  /** Date de fin UTC */
  endDate: Date
  /** Handles des catégories NON éligibles (sous-catégories comprises côté backend) */
  excludedCategoryHandles: string[]
}

// ─── Pâques 2026 ────────────────────────────────────────────────────────────
// Pour désactiver : active: false
// ─────────────────────────────────────────────────────────────────────────────
export const ACTIVE_PROMO: ActivePromoConfig = {
  active: true,
  code: "PAQUES_10",
  discountPercent: 10,
  label: "Pâques",
  // Heure belge (CEST = UTC+2 en avril) :
  //   5 avril 00:00 BEL = 4 avril 22:00 UTC
  //   6 avril 23:59 BEL = 6 avril 21:59 UTC
  startDate: new Date("2026-04-04T22:00:00.000Z"),
  endDate: new Date("2026-04-06T21:59:59.000Z"),
  excludedCategoryHandles: [
    "soins-et-alimentation",
    "enfants",
    "tondeuses-et-peignes",
  ],
}

/** La promo est-elle actuellement active ? */
export function isPromoActive(): boolean {
  if (!ACTIVE_PROMO.active) return false
  const now = new Date()
  return now >= ACTIVE_PROMO.startDate && now <= ACTIVE_PROMO.endDate
}

/**
 * Le produit est-il éligible à la promo active ?
 * @param categoryHandles Handles des catégories du produit
 * @param isOutlet True si le produit est outlet (jamais cumulable)
 */
export function isProductPromoEligible(
  categoryHandles: string[],
  isOutlet = false
): boolean {
  if (isOutlet) return false
  if (!isPromoActive()) return false
  return !categoryHandles.some((h) =>
    ACTIVE_PROMO.excludedCategoryHandles.includes((h || "").toLowerCase())
  )
}

/**
 * Calcule le prix promotionnel en euros.
 * @param priceEuros Prix original en euros
 */
export function applyPromoDiscount(priceEuros: number): number {
  return (
    Math.round(priceEuros * (1 - ACTIVE_PROMO.discountPercent / 100) * 100) /
    100
  )
}
