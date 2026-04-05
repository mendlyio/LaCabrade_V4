import { Modules } from "@medusajs/framework/utils"
import type { ICartModuleService } from "@medusajs/framework/types"
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa"

/**
 * Gestion de la promotion automatique Pâques 2026 (PAQUES_10, -10%).
 *
 * Règles métier :
 * - Valable uniquement les 5 et 6 avril 2026 (heure belge, UTC+2)
 * - Non applicable sur les catégories : soins-et-alimentation, enfants, tondeuses-et-peignes
 *   (ainsi que leurs sous-catégories)
 * - Non cumulable avec : codes NL-, ANNIV-, tout autre code promo manuel
 *   (la non-cumulation avec l'outlet est déjà gérée par cart-outlet-promo-guard.ts
 *    qui retire tous les adjustments des articles outlet)
 */

const PAQUES_PROMO_CODE = "PAQUES_10"

// Handles des catégories exclues (et leurs sous-catégories)
const EXCLUDED_CATEGORY_HANDLES = [
  "soins-et-alimentation",
  "enfants",
  "tondeuses-et-peignes",
]

// Codes automatiques connus → ne constituent pas un conflit
const KNOWN_AUTOMATIC_CODES = new Set([
  PAQUES_PROMO_CODE,
  "OUTLET_50",
  "FREE_SHIPPING_75",
])

/**
 * Vérifie si on est dans la période de Pâques 2026
 * (5 ou 6 avril, heure belge = UTC+2 en avril)
 */
function isEasterPeriod(): boolean {
  const now = new Date()
  // Convertir en heure belge (CEST = UTC+2 en avril)
  const belgiumTime = new Date(now.getTime() + 2 * 60 * 60 * 1000)
  const year = belgiumTime.getUTCFullYear()
  const month = belgiumTime.getUTCMonth() + 1 // 1-indexed
  const day = belgiumTime.getUTCDate()
  return year === 2026 && month === 4 && (day === 5 || day === 6)
}

/**
 * Collecte tous les IDs d'une catégorie et ses descendants récursifs.
 */
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

export default async function cartPaquesGuardHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const cartId = data?.id
  if (!cartId) return

  let cartModuleService: ICartModuleService
  try {
    cartModuleService = container.resolve(Modules.CART) as ICartModuleService
  } catch {
    return
  }

  try {
    // 1. Charger le panier avec ses articles
    const cart = await (cartModuleService as any).retrieveCart(cartId, {
      relations: ["items"],
    })

    const items = (cart.items || []) as Array<{
      id: string
      product_id?: string | null
      metadata?: Record<string, unknown> | null
    }>

    if (items.length === 0) return

    const allItemIds = items.map((i) => i.id)

    // 2. Récupérer tous les adjustments du panier
    const allAdjustments: Array<{ id: string; code?: string | null; item_id?: string | null }> =
      await (cartModuleService as any).listLineItemAdjustments(
        { item_id: allItemIds },
        { take: 500 }
      )

    // Y a-t-il des adjustments PAQUES à traiter ?
    const paquesAdjs = allAdjustments.filter(
      (adj) => adj.code === PAQUES_PROMO_CODE
    )

    // Hors période Pâques → retirer tous les adjustments PAQUES restants et sortir
    if (!isEasterPeriod()) {
      if (paquesAdjs.length > 0) {
        await (cartModuleService as any).deleteLineItemAdjustments(
          paquesAdjs.map((a) => a.id)
        )
        console.log(
          `[PaquesGuard] Hors période : ${paquesAdjs.length} adjustment(s) PAQUES_10 retirés du panier ${cartId}`
        )
      }
      return
    }

    // 3. Vérifier la non-cumulation : présence d'un code promo manuel (NL-, ANNIV-, etc.)
    const hasConflictingPromo = allAdjustments.some(
      (adj) => adj.code && !KNOWN_AUTOMATIC_CODES.has(adj.code)
    )

    if (hasConflictingPromo) {
      if (paquesAdjs.length > 0) {
        await (cartModuleService as any).deleteLineItemAdjustments(
          paquesAdjs.map((a) => a.id)
        )
        console.log(
          `[PaquesGuard] Code promo en conflit : ${paquesAdjs.length} adjustment(s) PAQUES_10 retirés du panier ${cartId}`
        )
      }
      return
    }

    // 4. Retirer PAQUES_10 des articles en catégories exclues
    if (paquesAdjs.length === 0) return

    // Collecter les product_id des articles ayant un adjustment PAQUES
    const paquesAdjByItemId = new Map(paquesAdjs.map((a) => [a.item_id, a]))
    const itemsWithPaques = items.filter((i) => paquesAdjByItemId.has(i.id))
    const productIds = [
      ...new Set(
        itemsWithPaques
          .map((i) => i.product_id)
          .filter((id): id is string => Boolean(id))
      ),
    ]

    if (productIds.length === 0) return

    // Charger les catégories de ces produits via le module Product
    let productModule: any
    try {
      productModule = container.resolve(Modules.PRODUCT)
    } catch {
      return
    }

    // Récupérer toutes les catégories pour construire l'arbre (sous-catégories comprises)
    const allCategories: Array<{ id: string; handle?: string | null; parent_category_id?: string | null }> =
      await productModule.listProductCategories(
        {},
        { select: ["id", "handle", "parent_category_id"], take: 500 }
      )

    // Construire l'ensemble des IDs de catégories exclues (racines + descendants)
    const excludedCategoryIds = new Set<string>()
    for (const handle of EXCLUDED_CATEGORY_HANDLES) {
      const root = allCategories.find(
        (c) => (c.handle ?? "").toLowerCase() === handle
      )
      if (root) {
        for (const id of collectSubtreeIds(root.id, allCategories)) {
          excludedCategoryIds.add(id)
        }
      }
    }

    if (excludedCategoryIds.size === 0) return

    // Charger les produits avec leurs catégories
    const products: Array<{ id: string; categories?: Array<{ id: string }> }> =
      await productModule.listProducts(
        { id: productIds },
        { relations: ["categories"], select: ["id"] }
      )

    const productCategoryMap = new Map(
      products.map((p) => [p.id, (p.categories || []).map((c: any) => c.id)])
    )

    // Identifier les adjustments PAQUES à retirer (article en catégorie exclue)
    const adjIdsToRemove: string[] = []
    for (const item of itemsWithPaques) {
      if (!item.product_id) continue
      const categoryIds = productCategoryMap.get(item.product_id) ?? []
      const isExcluded = categoryIds.some((catId: string) =>
        excludedCategoryIds.has(catId)
      )
      if (isExcluded) {
        const adj = paquesAdjByItemId.get(item.id)
        if (adj) adjIdsToRemove.push(adj.id)
      }
    }

    if (adjIdsToRemove.length > 0) {
      await (cartModuleService as any).deleteLineItemAdjustments(adjIdsToRemove)
      console.log(
        `[PaquesGuard] Catégorie exclue : ${adjIdsToRemove.length} adjustment(s) PAQUES_10 retirés du panier ${cartId}`
      )
    }
  } catch (error) {
    console.error("[PaquesGuard] Erreur:", error)
  }
}

export const config: SubscriberConfig = {
  event: "cart.updated",
}
