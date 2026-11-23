/**
 * Black Week 2026 — 23 au 30 novembre inclus, heure de Bruxelles (CET = UTC+1).
 *
 *   23 nov 00:00 BEL = 22 nov 23:00 UTC
 *   30 nov 23:59 BEL = 30 nov 22:59:59 UTC
 *
 * Règles :
 *   • Vêtements (sous-arbres listés, pas tout « cavalier ») → −20 %
 *   • Couvertures → −20 % ; quantité totale ≥ 2 → −30 % sur chaque couverture
 *   • Outlet (y compris un vêtement aussi classé outlet) → pas d'adjustment.
 *     La remise vit dans unit_price : 60 % cette semaine, 50 % ensuite.
 *   • Un article ne reçoit qu'une seule de ces remises.
 *
 * Le palier −30 % n'est pas une seconde promotion automatique : le buy-get
 * Medusa ne remet pas toutes les pièces une fois le seuil atteint. La promo
 * native est à −20 %. Le hook panier relève le montant à −30 % dès 2
 * couvertures, et corrige le HT (les adjustments Medusa sont hors TVA).
 *
 * Coupe-circuit immédiat : BLACK_WEEK_ENABLED = false, puis redéployer.
 * Le script deactivate-black-week-2026 retire la campagne en base ; tant que
 * ce drapeau reste true et que la date est dans la fenêtre, le hook réécrit
 * la remise. L'arrêt complet avant le 1er décembre = revert du commit.
 */

export const BLACK_WEEK_ENABLED = true

export const BLACK_WEEK_START = new Date("2026-11-22T23:00:00.000Z")
export const BLACK_WEEK_END = new Date("2026-11-30T22:59:59.000Z")

export const BW_CLOTHING_CODE = "BW_VETEMENTS_20"
export const BW_BLANKET_CODE = "BW_COUVERTURES_20"
export const BW_BLANKET_MULTI_CODE = "BW_COUVERTURES_30"
export const BLACK_WEEK_CODES = new Set([
  BW_CLOTHING_CODE,
  BW_BLANKET_CODE,
  BW_BLANKET_MULTI_CODE,
])

export const BW_CLOTHING_PERCENT = 20
export const BW_BLANKET_PERCENT = 20
export const BW_BLANKET_MULTI_PERCENT = 30
export const BLACK_WEEK_OUTLET_PERCENT = 60

/** Racines dont on prend tout le sous-arbre pour la promo Medusa. */
export const CLOTHING_PARENT_HANDLES = [
  "pantalons",
  "sweats-et-pulls",
  "t-shirts-et-polos",
  "vestes",
  "gants",
  "pantalons-de-concours",
  "polos-de-concours",
  "vestes-de-concours",
  "chaussettes",
  "casquettes",
  "ceintures",
  "bonnets,-bandeaux,-echarpes-et-tours-de-cou",
] as const

export const BLANKET_PARENT_HANDLES = ["couvertures"] as const

/**
 * Handles reconnus même sans remonter aux ancêtres (feuilles du catalogue
 * au 23 novembre 2026). « bonnets » seul est un bonnet de selle, pas un vêtement.
 */
export const CLOTHING_HANDLES = new Set<string>([
  ...CLOTHING_PARENT_HANDLES,
  "pantalons-dame",
  "pantalons-enfant",
  "sweats-et-pulls-dame",
  "sweats-et-pulls-enfant",
  "t-shirts-et-polos-dame",
  "t-shirts-et-polos-enfant",
  "vestes-dame",
  "vestes-enfant",
  "gants-de-travail",
  "gants-techniques",
])

export const BLANKET_HANDLES = new Set<string>([
  ...BLANKET_PARENT_HANDLES,
  "couvertures-anti-eczema-et-anti-mouche",
  "couvertures-d'ecurie",
  "couvertures-d'extérieur",
  "couvertures-de-marcheur-et-couvre-reins",
  "couvertures-de-presentation",
  "couvertures-polaires-et-sechantes",
  "sous-couvertures-et-accessoires",
])

const CLOTHING_DESCRIPTION = "Black Week −20 % vêtements"
const BLANKET_DESCRIPTION = "Black Week −20 % couvertures"
const BLANKET_MULTI_DESCRIPTION = "Black Week −30 % couvertures (dès 2)"

export function isBlackWeekPeriod(now = new Date()): boolean {
  return now >= BLACK_WEEK_START && now <= BLACK_WEEK_END
}

export function blackWeekAdjustmentsActive(now = new Date()): boolean {
  return BLACK_WEEK_ENABLED && isBlackWeekPeriod(now)
}

export type BlackWeekItem = {
  id: string
  unitPrice: number
  quantity: number
  handles: string[]
  isOutlet: boolean
  isGiftCard: boolean
}

export type BlackWeekExistingAdjustment = {
  id: string
  item_id: string
  code: string
  amount: number
}

export type BlackWeekOffer = {
  code: string
  percent: number
  description: string
}

function normalizedHandles(handles: string[]): string[] {
  return handles.map((handle) => handle.toLowerCase())
}

export function isBlackWeekOutlet(item: {
  handles: string[]
  isOutlet: boolean
}): boolean {
  if (item.isOutlet) return true
  return normalizedHandles(item.handles).some((handle) => handle.startsWith("outlet"))
}

export function isBlackWeekBlanket(handles: string[]): boolean {
  return normalizedHandles(handles).some((handle) => BLANKET_HANDLES.has(handle))
}

export function isBlackWeekClothing(handles: string[]): boolean {
  return normalizedHandles(handles).some((handle) => CLOTHING_HANDLES.has(handle))
}

/**
 * Quantité de couvertures qui déclenche le −30 %.
 * Les articles outlet et les bons cadeau ne comptent pas.
 */
export function blackWeekBlanketQuantity(items: BlackWeekItem[]): number {
  return items.reduce((sum, item) => {
    if (item.isGiftCard || isBlackWeekOutlet(item)) return sum
    if (!isBlackWeekBlanket(item.handles)) return sum
    const quantity = Number(item.quantity)
    if (!Number.isFinite(quantity) || quantity <= 0) return sum
    return sum + quantity
  }, 0)
}

export function blackWeekOffer(
  item: BlackWeekItem,
  blanketQuantity: number
): BlackWeekOffer | null {
  if (item.isGiftCard || isBlackWeekOutlet(item)) return null
  if (isBlackWeekBlanket(item.handles)) {
    if (blanketQuantity >= 2) {
      return {
        code: BW_BLANKET_MULTI_CODE,
        percent: BW_BLANKET_MULTI_PERCENT,
        description: BLANKET_MULTI_DESCRIPTION,
      }
    }
    return {
      code: BW_BLANKET_CODE,
      percent: BW_BLANKET_PERCENT,
      description: BLANKET_DESCRIPTION,
    }
  }
  if (isBlackWeekClothing(item.handles)) {
    return {
      code: BW_CLOTHING_CODE,
      percent: BW_CLOTHING_PERCENT,
      description: CLOTHING_DESCRIPTION,
    }
  }
  return null
}

const AMOUNT_EPSILON = 0.001

export function planBlackWeekAdjustments(args: {
  apply: boolean
  items: BlackWeekItem[]
  existing: BlackWeekExistingAdjustment[]
  amountFor: (unitPrice: number, quantity: number, percent: number) => number
}): {
  removeIds: string[]
  updates: Array<{ id: string; amount: number; code: string; description: string }>
  creates: Array<{ item_id: string; amount: number; code: string; description: string }>
} {
  if (!args.apply) {
    return {
      removeIds: args.existing.map((adjustment) => adjustment.id),
      updates: [],
      creates: [],
    }
  }

  const removeIds = new Set<string>()
  const updates: Array<{ id: string; amount: number; code: string; description: string }> = []
  const creates: Array<{ item_id: string; amount: number; code: string; description: string }> = []
  const byItem = new Map<string, BlackWeekExistingAdjustment[]>()

  for (const adjustment of args.existing) {
    const list = byItem.get(adjustment.item_id) ?? []
    list.push(adjustment)
    byItem.set(adjustment.item_id, list)
  }

  const blanketQuantity = blackWeekBlanketQuantity(args.items)
  const seenItems = new Set<string>()

  for (const item of args.items) {
    seenItems.add(item.id)
    const current = byItem.get(item.id) ?? []
    const offer = blackWeekOffer(item, blanketQuantity)
    const quantity = Number(item.quantity)
    if (!offer || !(item.unitPrice > 0) || !Number.isFinite(quantity) || quantity <= 0) {
      for (const adjustment of current) removeIds.add(adjustment.id)
      continue
    }

    const expected = args.amountFor(item.unitPrice, quantity, offer.percent)
    if (current.length === 0) {
      creates.push({
        item_id: item.id,
        amount: expected,
        code: offer.code,
        description: offer.description,
      })
      continue
    }

    const [first, ...rest] = current
    for (const adjustment of rest) removeIds.add(adjustment.id)
    const drifted =
      first.code !== offer.code || Math.abs(Number(first.amount) - expected) > AMOUNT_EPSILON
    if (drifted) {
      updates.push({
        id: first.id,
        amount: expected,
        code: offer.code,
        description: offer.description,
      })
    }
  }

  for (const adjustment of args.existing) {
    if (!seenItems.has(adjustment.item_id)) removeIds.add(adjustment.id)
  }

  return { removeIds: [...removeIds], updates, creates }
}
