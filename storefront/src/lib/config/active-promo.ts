/**
 * Configuration de la promotion active affichée sur tout le site.
 *
 * Pour désactiver rapidement (fin de promo) :
 *   → mettre  active: false  sur la config pointée par ACTIVE_PROMO
 *
 * La remise est uniquement VISUELLE côté storefront (prix barrés).
 * La remise au checkout est gérée par les promotions Medusa et les subscribers guard.
 */

export type PromoTier = {
  /** Pourcentage de remise pour ce tier */
  discountPercent: number
  /** Si true, ce tier s'applique aux articles outlet */
  forOutlet?: boolean
  /** Handles de catégories qui déclenchent ce tier */
  categoryHandles?: string[]
  /** Handles de collection qui déclenchent ce tier */
  collectionHandles?: string[]
}

export type ActivePromoConfig = {
  /** Interrupteur principal — mettre false pour tout désactiver sans supprimer la config */
  active: boolean
  /** Code de la promotion Medusa principale correspondante */
  code: string
  /** Pourcentage de remise par défaut (catch-all, si pas de tier correspondant) */
  discountPercent: number
  /** Label affiché dans le badge */
  label: string
  /** Date de début UTC */
  startDate: Date
  /** Date de fin UTC */
  endDate: Date
  /** Handles des catégories NON éligibles (sous-catégories comprises côté backend) */
  excludedCategoryHandles: string[]
  /** Si défini, seuls ces handles de catégories déclenchent la remise par défaut */
  includedCategoryHandles?: string[]
  /** Si défini, seuls ces handles de collections déclenchent la remise par défaut */
  includedCollectionHandles?: string[]
  /**
   * Tiers optionnels évalués dans l'ordre (premier match gagne).
   * Si aucun tier ne matche, on utilise discountPercent comme fallback.
   */
  tiers?: PromoTier[]
  /** Remise outlet spécifique (en %) — écrase le -50% par défaut pendant la promo */
  outletDiscountPercent?: number
}

// ─── Pâques 2026 (terminée — réactiver pour une prochaine fois) ───────────────
export const PAQUES_PROMO: ActivePromoConfig = {
  active: false,
  code: "PAQUES_10",
  discountPercent: 10,
  label: "Pâques",
  startDate: new Date("2026-04-04T22:00:00.000Z"),
  endDate: new Date("2026-04-06T21:59:59.000Z"),
  excludedCategoryHandles: [
    "soins-et-alimentation",
    "enfants",
    "tondeuses-et-peignes",
  ],
}

// ─── Portes Ouvertes 2026 (1–9 mai 2026) ──────────────────────────────────────
// Heure belge (CEST = UTC+2 en mai) :
//   1 mai 00:00 BEL = 30 avril 22:00 UTC
//   9 mai 23:59 BEL = 9 mai 21:59 UTC
// Pour désactiver après le 9 mai : mettre active: false
export const PORTES_OUVERTES_PROMO: ActivePromoConfig = {
  active: false,
  code: "PO_GLOBAL_10",
  discountPercent: 10,
  label: "Portes Ouvertes",
  startDate: new Date("2026-04-30T22:00:00.000Z"),
  endDate: new Date("2026-05-09T21:59:59.000Z"),
  excludedCategoryHandles: [
    "tondeuses-et-peignes",
    // Compléments alimentaires + toutes les sous-catégories (avec/sans accents)
    "complements-alimentaires",
    "compléments-alimentaires",
    "systeme-renal",
    "systeme-circulatoire",
    "systeme-lymphatique",
    "immunite",
    "systeme-locomoteur",
    "systeme-hepatique",
    "système-hépatique",
    "systeme-digestif",
    "système-digestif",
    "vitamines-et-mineraux",
    "vitamines-et-minéraux",
    "muscles-et-recuperation",
    "muscles,-récupérations-et-performance",
    "metabolisme",
    "métabolisme",
    "sabots",
    "sabots-et-crins",
    "sabots,-robe-et-crins",
    "systeme-respiratoire",
    "système-respiratoire",
    "nervosite-et-comportement",
    "nervosité-et-comportement",
    "criniere",
    "soins-robe-et-criniere",
    // Selles (sans récursion — sacs-et-housses-de-selle reste éligible)
    "selles",
    "selles-sur-mesure",
  ],
  tiers: [
    // -20% sur la catégorie Cavalier
    {
      discountPercent: 20,
      categoryHandles: ["cavalier"],
    },
    // -20% sur LC Equestrian (catégorie ou collection)
    {
      discountPercent: 20,
      categoryHandles: ["lc-equestrian", "lc_equestrian", "la-cabrade"],
      collectionHandles: ["lc-equestrian", "lc_equestrian"],
    },
  ],
  // Remise outlet pendant les PO : -60% (vs -50% habituel)
  outletDiscountPercent: 60,
}

// ─── Braderie 2026 (19–21 juin matin) — TERMINÉE ──────────────────────────────
export const BRADERIE_PROMO: ActivePromoConfig = {
  active: false,
  code: "BRADERIE_15",
  discountPercent: 15,
  label: "Braderie",
  startDate: new Date("2026-06-18T22:00:00.000Z"),
  endDate: new Date("2026-06-21T07:00:00.000Z"),
  excludedCategoryHandles: [],
  includedCategoryHandles: [
    "concours", "accessoires-de-concours", "pantalons-de-concours",
    "polos-de-concours", "vestes-de-concours",
    "pantalons", "pantalons-dame", "pantalons-enfant",
    "sweats-et-pulls", "sweats-et-pulls-dame", "sweats-et-pulls-enfant",
    "t-shirts-et-polos", "t-shirts-et-polos-dame", "t-shirts-et-polos-enfant",
    "vestes", "vestes-dame", "vestes-enfant",
    "lc-equestrian",
  ],
  includedCollectionHandles: ["lc-equestrian"],
}

// ─── Soldes Été 2026 (30 juin → 31 juillet) ────────────────────────────────────
// Heure belge (CEST = UTC+2) :
//   30 juin 00:00 BEL = 29 juin 22:00 UTC
//   31 juillet 23:59 BEL = 31 juillet 21:59 UTC
//
// Règles (2ème démarque à partir du 13 juillet) :
//   • Vêtements Cavalier (concours / pantalons / sweats / tshirts / vestes) → -30%
//   • LC Equestrian (catégorie ou collection)                               → -15%
//   • Outlet                                                                → -60% (vs -50% habituel)
//     ↳ Géré en Block A du hook (adjustment supplémentaire de +10% du prix original)
export const SOLDE_PROMO: ActivePromoConfig = {
  active: false,
  code: "SOLDE_LC_15",
  discountPercent: 15,
  label: "Soldes",
  startDate: new Date("2026-06-29T22:00:00.000Z"),
  endDate: new Date("2026-07-31T21:59:59.000Z"),
  excludedCategoryHandles: [],
  includedCategoryHandles: [
    // Vêtements Cavalier ciblés (+ sous-catégories dame/enfant/concours)
    "concours", "accessoires-de-concours", "pantalons-de-concours",
    "polos-de-concours", "vestes-de-concours",
    "pantalons", "pantalons-dame", "pantalons-enfant",
    "sweats-et-pulls", "sweats-et-pulls-dame", "sweats-et-pulls-enfant",
    "t-shirts-et-polos", "t-shirts-et-polos-dame", "t-shirts-et-polos-enfant",
    "vestes", "vestes-dame", "vestes-enfant",
    // LC Equestrian
    "lc-equestrian",
  ],
  includedCollectionHandles: ["lc-equestrian"],
  tiers: [
    // -15% sur LC Equestrian — EN PREMIER (prioritaire).
    // Les articles LC sont souvent dans des sous-catégories Cavalier (pantalons-dame, vestes-dame…).
    // On les identifie en premier pour éviter qu'ils basculent sur le tier Cavalier à -25%.
    {
      discountPercent: 15,
      categoryHandles: ["lc-equestrian"],
      collectionHandles: ["lc-equestrian"],
    },
    // -30% sur les Vêtements Cavalier ciblés (hors LC Equestrian — déjà traité au-dessus)
    {
      discountPercent: 30,
      categoryHandles: [
        "concours", "accessoires-de-concours", "pantalons-de-concours",
        "polos-de-concours", "vestes-de-concours",
        "pantalons", "pantalons-dame", "pantalons-enfant",
        "sweats-et-pulls", "sweats-et-pulls-dame", "sweats-et-pulls-enfant",
        "t-shirts-et-polos", "t-shirts-et-polos-dame", "t-shirts-et-polos-enfant",
        "vestes", "vestes-dame", "vestes-enfant",
      ],
    },
  ],
  outletDiscountPercent: 60,
}

// ─── Promotion active ──────────────────────────────────────────────────────────
// Pointer ici pour changer de promo (ex: PAQUES_PROMO, PORTES_OUVERTES_PROMO, BRADERIE_PROMO, SOLDE_PROMO)
export const ACTIVE_PROMO: ActivePromoConfig = SOLDE_PROMO

/** La promo est-elle actuellement active ? */
export function isPromoActive(): boolean {
  if (!ACTIVE_PROMO.active) return false
  const now = new Date()
  return now >= ACTIVE_PROMO.startDate && now <= ACTIVE_PROMO.endDate
}

/**
 * Retourne le pourcentage de remise applicable à ce produit pour la promo active,
 * ou null si le produit n'est pas éligible.
 *
 * @param categoryHandles Handles des catégories du produit
 * @param collectionHandle Handle de la collection du produit (optionnel)
 * @param isOutlet True si le produit est outlet (géré séparément via unit_price)
 */
export function getProductPromoDiscount(
  categoryHandles: string[],
  collectionHandle: string | null | undefined,
  isOutlet = false
): number | null {
  if (!isPromoActive()) return null
  if (isOutlet) return null

  const lowerHandles = categoryHandles.map((h) => h.toLowerCase())
  const lowerCollectionHandle = collectionHandle?.toLowerCase()

  // Catégories exclues → pas de remise promo
  if (
    lowerHandles.some((h) =>
      ACTIVE_PROMO.excludedCategoryHandles.includes(h)
    )
  )
    return null

  if (ACTIVE_PROMO.includedCategoryHandles?.length || ACTIVE_PROMO.includedCollectionHandles?.length) {
    const matchesIncludedCategory = ACTIVE_PROMO.includedCategoryHandles?.some((h) =>
      lowerHandles.includes(h.toLowerCase())
    )
    const matchesIncludedCollection =
      lowerCollectionHandle &&
      ACTIVE_PROMO.includedCollectionHandles?.some(
        (h) => h.toLowerCase() === lowerCollectionHandle
      )

    if (!matchesIncludedCategory && !matchesIncludedCollection) return null
  }

  // Évaluer les tiers dans l'ordre (premier match gagne)
  if (ACTIVE_PROMO.tiers?.length) {
    for (const tier of ACTIVE_PROMO.tiers) {
      if (tier.forOutlet && isOutlet) return tier.discountPercent
      if (
        tier.categoryHandles?.some((h) =>
          lowerHandles.includes(h.toLowerCase())
        )
      )
        return tier.discountPercent
      if (
        collectionHandle &&
        tier.collectionHandles?.some(
          (h) => h.toLowerCase() === collectionHandle.toLowerCase()
        )
      )
        return tier.discountPercent
    }
  }

  // Remise par défaut (catch-all)
  return ACTIVE_PROMO.discountPercent
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
  return getProductPromoDiscount(categoryHandles, null, isOutlet) !== null
}

/**
 * Calcule le prix promotionnel en euros.
 * @param priceEuros Prix original en euros
 * @param discountPercent Pourcentage de remise (défaut: ACTIVE_PROMO.discountPercent)
 */
export function applyPromoDiscount(
  priceEuros: number,
  discountPercent: number = ACTIVE_PROMO.discountPercent
): number {
  return (
    Math.round(priceEuros * (1 - discountPercent / 100) * 100) / 100
  )
}

/**
 * Retourne le pourcentage de remise outlet en cours.
 * Pendant la promo PO : 60%. Sinon : 50% (défaut outlet).
 */
export function getOutletDiscountPercent(): number {
  if (isPromoActive() && ACTIVE_PROMO.outletDiscountPercent != null) {
    return ACTIVE_PROMO.outletDiscountPercent
  }
  return 50
}
