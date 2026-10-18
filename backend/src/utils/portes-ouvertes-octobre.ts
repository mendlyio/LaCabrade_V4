/**
 * Portes Ouvertes octobre 2026 (16–24 octobre, heure belge).
 *
 * Deux mécanismes distincts, comme pour les éditions précédentes :
 *   • Outlet : remise dans le unit_price (50 % le reste de l'année, 60 % pendant la PO).
 *     Jamais un adjustment — le calcul panier ignore les adjustments des articles outlet.
 *   • Cavalier : promotion automatique Medusa PO_OCT_CAVALIER_20 (−20 %),
 *     corrigée en HT par le hook panier. Pas de −10 % global, pas de palier LC.
 *
 * Heure belge : CEST = UTC+2 jusqu'au 25 octobre 2026.
 *   16 oct 00:00 BEL = 15 oct 22:00 UTC
 *   24 oct 23:59 BEL = 24 oct 21:59 UTC
 */

export const PO_OCTOBRE_START = new Date("2026-10-15T22:00:00.000Z")
export const PO_OCTOBRE_END = new Date("2026-10-24T21:59:59.000Z")
export const PO_OCTOBRE_CODE = "PO_OCT_CAVALIER_20"
export const PO_OCTOBRE_CAVALIER_PERCENT = 20
export const OUTLET_BASE_PERCENT = 50
export const PO_OCTOBRE_OUTLET_PERCENT = 60

export const PO_OCTOBRE_SALE_DATE_GOOGLE =
  "2026-10-15T22:00+00:00/2026-10-24T21:59+00:00"
export const PO_OCTOBRE_SALE_DATE_META =
  "2026-10-15T22:00+0000/2026-10-24T21:59+0000"

export type CategoryNode = {
  id: string
  handle?: string | null
  parent_category_id?: string | null
}

export function isPoOctobrePeriod(now = new Date()): boolean {
  return now >= PO_OCTOBRE_START && now <= PO_OCTOBRE_END
}

/** 60 % pendant les PO d'octobre, 50 % le reste du temps. */
export function getOutletDiscountPercent(now = new Date()): number {
  return isPoOctobrePeriod(now) ? PO_OCTOBRE_OUTLET_PERCENT : OUTLET_BASE_PERCENT
}

/**
 * Handles du produit + tous les ancêtres du catalogue.
 * Permet de reconnaître « toute la catégorie cavalier » quand le produit
 * n'est rattaché qu'à une sous-catégorie.
 */
export function expandCategoryHandles(
  categories: Array<{ id?: string; handle?: string | null; parent_category_id?: string | null }>,
  catalog: CategoryNode[]
): string[] {
  const byId = new Map(catalog.filter((c) => c?.id).map((c) => [c.id, c]))
  const handles = new Set<string>()

  for (const cat of categories) {
    if (!cat) continue
    if (cat.handle) handles.add(cat.handle)
    const self = cat.id ? byId.get(cat.id) : undefined
    if (self?.handle) handles.add(self.handle)

    const seen = new Set<string>()
    let parentId: string | null | undefined = cat.id
      ? (self?.parent_category_id ?? cat.parent_category_id)
      : cat.parent_category_id

    while (parentId && !seen.has(parentId)) {
      seen.add(parentId)
      const parent = byId.get(parentId)
      if (!parent) break
      if (parent.handle) handles.add(parent.handle)
      parentId = parent.parent_category_id
    }
  }

  return [...handles]
}

/**
 * Aligne le prix outlet d'une ligne sur le pourcentage en vigueur.
 * Retourne null si la ligne n'est pas outlet ou si le prix est déjà bon.
 */
export function outletPriceSync(
  item: {
    unit_price?: number | null
    compare_at_unit_price?: number | null
    metadata?: Record<string, unknown> | null
  },
  now = new Date()
): {
  unit_price: number
  compare_at_unit_price: number
  metadata: Record<string, unknown>
} | null {
  const md = (item.metadata ?? {}) as Record<string, unknown>
  const original = Number(md.outlet_original_price)
  if (!md.outlet_discount || !Number.isFinite(original) || original <= 0) return null

  const targetPct = getOutletDiscountPercent(now)
  const discounted = Math.round(original * (1 - targetPct / 100) * 100) / 100
  const currentPrice = Number(item.unit_price ?? 0)
  const currentCmp = Number(item.compare_at_unit_price ?? 0)
  const priceDrift = Math.abs(currentPrice - discounted) > 0.01
  const cmpDrift = currentCmp === 0 || Math.abs(currentCmp - original) > 0.01
  const pctDrift = Number(md.outlet_discount_percent) !== targetPct

  if (!priceDrift && !cmpDrift && !pctDrift) return null

  return {
    unit_price: discounted,
    compare_at_unit_price: original,
    metadata: {
      ...md,
      outlet_discount: true,
      outlet_original_price: original,
      outlet_discount_percent: targetPct,
    },
  }
}
