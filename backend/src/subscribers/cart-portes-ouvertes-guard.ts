import { Modules } from "@medusajs/framework/utils"
import type { ICartModuleService } from "@medusajs/framework/types"
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa"

/**
 * Gestion des promotions automatiques Portes Ouvertes 2026 (1–9 mai 2026).
 *
 * Règles métier :
 * - Valable uniquement du 1er au 9 mai 2026 (heure belge, UTC+2)
 * - Non cumulable avec les codes promo manuels (NL-, ANNIV-, BIENVENU, newsletter, etc.)
 * - Catégories exclues de PO_GLOBAL_10 : tondeuses-et-peignes, soins-et-alimentation
 * - Articles outlet (outlet_discount: true) : tous les adjustments PO retirés
 *   (leur remise -60% est déjà appliquée sur unit_price par outlet-add-to-cart)
 * - Priorité : PO_CAVALIER_20 / PO_LC_20 > PO_GLOBAL_10
 *   (si un article a déjà -20%, on retire -10% pour éviter le cumul)
 */

const PO_GLOBAL_CODE = "PO_GLOBAL_10"
const PO_HIGH_CODES = new Set(["PO_CAVALIER_20", "PO_LC_20"])

// Heure belge (CEST = UTC+2 en mai)
const PO_START = new Date("2026-04-30T22:00:00.000Z") // 1 mai 00:00 BEL
const PO_END = new Date("2026-05-09T21:59:59.000Z")   // 9 mai 23:59 BEL

// Catégories exclues de la promo globale -10%
const EXCLUDED_CATEGORY_HANDLES = [
  "tondeuses-et-peignes",
  "complements-alimentaires",
  "selles",
]

// Codes automatiques connus → ne constituent pas un conflit
const KNOWN_AUTOMATIC_CODES = new Set([
  PO_GLOBAL_CODE,
  "PO_CAVALIER_20",
  "PO_LC_20",
  "OUTLET_50",
  "FREE_SHIPPING_75",
  "PAQUES_10",
])

/** Vérifie si on est dans la période Portes Ouvertes 2026 */
function isPortesOuvertesPeriod(): boolean {
  const now = new Date()
  return now >= PO_START && now <= PO_END
}

/** Collecte tous les IDs d'une catégorie et ses descendants récursifs */
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

export default async function cartPortesOuvertesGuardHandler({
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
    const allAdjustments: Array<{
      id: string
      code?: string | null
      item_id?: string | null
    }> = await (cartModuleService as any).listLineItemAdjustments(
      { item_id: allItemIds },
      { take: 500 }
    )

    // Y a-t-il des adjustments PO à traiter ?
    const poAdjs = allAdjustments.filter(
      (adj) => adj.code && (adj.code === PO_GLOBAL_CODE || PO_HIGH_CODES.has(adj.code))
    )

    // Hors période PO → retirer tous les adjustments PO restants et sortir
    if (!isPortesOuvertesPeriod()) {
      if (poAdjs.length > 0) {
        await (cartModuleService as any).deleteLineItemAdjustments(
          poAdjs.map((a) => a.id)
        )
        console.log(
          `[PortesOuvertesGuard] Hors période : ${poAdjs.length} adjustment(s) PO retirés du panier ${cartId}`
        )
      }
      return
    }

    // 3. Non-cumulation avec codes manuels (NL-, ANNIV-, BIENVENU, newsletter, etc.)
    const hasConflictingPromo = allAdjustments.some(
      (adj) => adj.code && !KNOWN_AUTOMATIC_CODES.has(adj.code)
    )

    if (hasConflictingPromo) {
      if (poAdjs.length > 0) {
        await (cartModuleService as any).deleteLineItemAdjustments(
          poAdjs.map((a) => a.id)
        )
        console.log(
          `[PortesOuvertesGuard] Code promo en conflit : ${poAdjs.length} adjustment(s) PO retirés du panier ${cartId}`
        )
      }
      return
    }

    if (poAdjs.length === 0) return

    // 4. Retirer TOUS les adjustments PO des articles outlet (unit_price déjà réduit -60%)
    const outletItemIds = new Set(
      items
        .filter((i) => (i.metadata as any)?.outlet_discount === true)
        .map((i) => i.id)
    )

    const adjIdsToRemove: string[] = []

    for (const adj of poAdjs) {
      if (adj.item_id && outletItemIds.has(adj.item_id)) {
        adjIdsToRemove.push(adj.id)
      }
    }

    // 5. Gérer les exclusions de catégories + priorité des tiers
    // Collecter les product_id des articles avec adjustments PO restants
    const remainingPoAdjs = poAdjs.filter((a) => !adjIdsToRemove.includes(a.id))
    if (remainingPoAdjs.length > 0) {
      const productIds = [
        ...new Set(
          items
            .filter((i) =>
              remainingPoAdjs.some((a) => a.item_id === i.id)
            )
            .map((i) => i.product_id)
            .filter((id): id is string => Boolean(id))
        ),
      ]

      if (productIds.length > 0) {
        let productModule: any
        try {
          productModule = container.resolve(Modules.PRODUCT)
        } catch {
          return
        }

        // Récupérer toutes les catégories pour l'arbre des exclusions
        const allCategories: Array<{
          id: string
          handle?: string | null
          parent_category_id?: string | null
        }> = await productModule.listProductCategories(
          {},
          { select: ["id", "handle", "parent_category_id"], take: 500 }
        )

        // IDs des catégories exclues (tondeuses, compléments + descendants)
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

        // Charger les produits avec leurs catégories
        const products: Array<{
          id: string
          categories?: Array<{ id: string }>
        }> = await productModule.listProducts(
          { id: productIds },
          { relations: ["categories"], select: ["id"] }
        )

        const productCategoryMap = new Map(
          products.map((p) => [
            p.id,
            (p.categories || []).map((c: any) => c.id),
          ])
        )

        // Grouper les adjustments PO par item_id
        const adjsByItemId = new Map<string, typeof remainingPoAdjs[0][]>()
        for (const adj of remainingPoAdjs) {
          if (!adj.item_id) continue
          const list = adjsByItemId.get(adj.item_id) ?? []
          list.push(adj)
          adjsByItemId.set(adj.item_id, list)
        }

        for (const item of items) {
          if (!item.product_id) continue
          const itemAdjs = adjsByItemId.get(item.id)
          if (!itemAdjs?.length) continue

          const categoryIds = productCategoryMap.get(item.product_id) ?? []

          // a) Catégorie exclue → retirer PO_GLOBAL_10 (et tout autre PO si applicable)
          if (
            excludedCategoryIds.size > 0 &&
            categoryIds.some((catId) => excludedCategoryIds.has(catId))
          ) {
            for (const adj of itemAdjs) {
              adjIdsToRemove.push(adj.id)
            }
            continue
          }

          // b) L'article a déjà un tier -20% → retirer PO_GLOBAL_10 (éviter cumul)
          const hasHighTier = itemAdjs.some(
            (a) => a.code && PO_HIGH_CODES.has(a.code)
          )
          if (hasHighTier) {
            for (const adj of itemAdjs) {
              if (adj.code === PO_GLOBAL_CODE) {
                adjIdsToRemove.push(adj.id)
              }
            }
          }
        }
      }
    }

    if (adjIdsToRemove.length > 0) {
      await (cartModuleService as any).deleteLineItemAdjustments(adjIdsToRemove)
      console.log(
        `[PortesOuvertesGuard] ${adjIdsToRemove.length} adjustment(s) PO retirés (outlet/exclu/priorité) du panier ${cartId}`
      )
    }
  } catch (error) {
    console.error("[PortesOuvertesGuard] Erreur:", error)
  }
}

export const config: SubscriberConfig = {
  event: "cart.updated",
}
