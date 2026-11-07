/**
 * Fermeture magasin novembre 2026 — −10 % sur le site (9, 10 et 11 novembre).
 *
 * Demande d'Elena (5 nov.) : le magasin est fermé lundi, mardi et mercredi,
 * on propose −10 % sur tout le site, hors compléments alimentaires et tondeuses.
 *
 * Règles appliquées par le hook panier (restore-outlet-prices-hook.ts, bloc F) :
 *   • −10 % sur tous les articles
 *   • sauf compléments alimentaires (et toutes leurs sous-catégories)
 *   • sauf tondeuses-et-peignes
 *   • sauf outlet (déjà −50 % dans unit_price, non cumulable)
 *   • sauf bons cadeau
 *   • retirée si un code promo manuel est présent (non cumulable, comme les PO)
 *
 * Heure belge : CET = UTC+1 en novembre.
 *   9 nov 00:00 BEL  = 8 nov 23:00 UTC
 *   11 nov 23:59 BEL = 11 nov 22:59 UTC
 */

export const FERMETURE_NOV_START = new Date("2026-11-08T23:00:00.000Z")
export const FERMETURE_NOV_END = new Date("2026-11-11T22:59:59.000Z")
export const FERMETURE_NOV_CODE = "FERMETURE_NOV_10"
export const FERMETURE_NOV_PERCENT = 10

export const FERMETURE_NOV_SALE_DATE_GOOGLE =
  "2026-11-08T23:00+00:00/2026-11-11T22:59+00:00"
export const FERMETURE_NOV_SALE_DATE_META =
  "2026-11-08T23:00+0000/2026-11-11T22:59+0000"

/**
 * Handles exclus. Les handles sont comparés après ajout des ancêtres
 * (expandCategoryHandles), donc la racine suffit ; les sous-catégories
 * sont listées en plus au cas où un produit serait mal rattaché.
 */
export const FERMETURE_NOV_EXCLUDED_HANDLES = new Set([
  "tondeuses-et-peignes",
  "tondeuses",
  "complements-alimentaires", "compléments-alimentaires",
  "systeme-renal", "systeme-circulatoire", "systeme-lymphatique",
  "immunite", "systeme-locomoteur", "systeme-hepatique", "système-hépatique",
  "systeme-digestif", "système-digestif",
  "vitamines-et-mineraux", "vitamines-et-minéraux",
  "muscles-et-recuperation", "muscles,-récupérations-et-performance",
  "metabolisme", "métabolisme",
  "sabots-et-crins", "sabots,-robe-et-crins",
  "systeme-respiratoire", "système-respiratoire",
  "nervosite-et-comportement", "nervosité-et-comportement",
])

export function isFermetureNovPeriod(now = new Date()): boolean {
  return now >= FERMETURE_NOV_START && now <= FERMETURE_NOV_END
}

/** Vrai si l'article (handles + ancêtres) est éligible au −10 %. */
export function isFermetureNovEligible(
  handlesWithAncestors: string[],
  isOutlet: boolean
): boolean {
  if (isOutlet) return false
  const lower = handlesWithAncestors.map((h) => h.toLowerCase())
  if (lower.some((h) => h.startsWith("outlet"))) return false
  return !lower.some((h) => FERMETURE_NOV_EXCLUDED_HANDLES.has(h))
}
