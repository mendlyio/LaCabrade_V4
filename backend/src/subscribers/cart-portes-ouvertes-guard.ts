import { Modules } from "@medusajs/framework/utils"
import type { ICartModuleService } from "@medusajs/framework/types"
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa"

/**
 * Gestion des promotions automatiques Portes Ouvertes 2026 (1–9 mai 2026).
 *
 * Architecture :
 *   - UNE seule promotion Medusa automatique : PO_GLOBAL_10 (-10% sur tout)
 *   - Ce subscriber gère TOUTE la logique métier :
 *       1. Hors période → retire PO_GLOBAL_10
 *       2. Code promo manuel présent → retire PO_GLOBAL_10 (non-cumul)
 *       3. Article outlet → retire PO_GLOBAL_10 (remise via unit_price)
 *       4. Catégorie exclue → retire PO_GLOBAL_10
 *       5. Cavalier ou LC Equestrian → crée un adjustment -20% (code PO_CAVALIER_20
 *          ou PO_LC_20) et retire PO_GLOBAL_10
 *       6. Nettoyage : retire tout adjustment PO_CAVALIER_20/PO_LC_20 sur des
 *          articles qui ne sont plus éligibles au tier -20%
 *
 * Montant du -20% : 2× le montant de l'adjustment PO_GLOBAL_10 existant.
 * Cette méthode est robuste car elle utilise le même calcul HT/TTC que Medusa.
 */

// ─── Constantes ───────────────────────────────────────────────────────────────
const PO_CODE = "PO_GLOBAL_10"
const PO_CAVALIER_CODE = "PO_CAVALIER_20"
const PO_LC_CODE = "PO_LC_20"
const ALL_PO_CODES = new Set([PO_CODE, PO_CAVALIER_CODE, PO_LC_CODE])

// Période PO (heure belge CEST = UTC+2)
const PO_START = new Date("2026-04-30T22:00:00.000Z") // 1 mai 00:00 BEL
const PO_END = new Date("2026-05-09T21:59:59.000Z")   // 9 mai 23:59 BEL

// Handles de catégories pour la détection des tiers (== active-promo.ts tiers)
const CAVALIER_HANDLES = new Set(["cavalier"])
const LC_HANDLES = new Set(["lc-equestrian", "lc_equestrian", "la-cabrade"])

// Catégories exclues (résolution exacte — pas de récursion)
const EXCLUDED_HANDLES = new Set([
  "tondeuses-et-peignes",
  "complements-alimentaires", "compléments-alimentaires",
  "systeme-renal", "systeme-circulatoire", "systeme-lymphatique",
  "immunite", "systeme-locomoteur", "systeme-hepatique", "système-hépatique",
  "systeme-digestif", "système-digestif",
  "vitamines-et-mineraux", "vitamines-et-minéraux",
  "muscles-et-recuperation", "muscles,-récupérations-et-performance",
  "metabolisme", "métabolisme",
  "sabots", "sabots-et-crins", "sabots,-robe-et-crins",
  "systeme-respiratoire", "système-respiratoire",
  "nervosite-et-comportement", "nervosité-et-comportement",
  "criniere", "soins-robe-et-criniere",
  "selles", "selles-sur-mesure",
])

// Codes automatiques connus (pas des codes manuels)
const KNOWN_AUTO_CODES = new Set([
  PO_CODE, PO_CAVALIER_CODE, PO_LC_CODE,
  "OUTLET_50", "FREE_SHIPPING_75", "PAQUES_10",
])

function isPortesOuvertesPeriod(): boolean {
  const now = new Date()
  return now >= PO_START && now <= PO_END
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
  } catch { return }

  try {
    // 1. Charger le panier avec items (unit_price nécessaire pour créer les ajustements)
    const cart = await (cartModuleService as any).retrieveCart(cartId, {
      relations: ["items"],
    })

    const items = (cart.items || []) as Array<{
      id: string
      product_id?: string | null
      unit_price?: number | null
      quantity?: number | null
      metadata?: Record<string, unknown> | null
    }>

    if (items.length === 0) return
    const allItemIds = items.map((i) => i.id)

    // 2. Récupérer tous les adjustments du panier
    const allAdjs: Array<{
      id: string
      code?: string | null
      item_id?: string | null
      amount?: number | null
    }> = await (cartModuleService as any).listLineItemAdjustments(
      { item_id: allItemIds },
      { take: 500 }
    )

    // Adjustments PO actifs (PO_GLOBAL_10 automatique + PO_CAVALIER_20/PO_LC_20 custom)
    const poAdjs = allAdjs.filter((a) => a.code && ALL_PO_CODES.has(a.code))
    if (poAdjs.length === 0) return

    const adjIdsToRemove: string[] = []
    const adjsToCreate: Array<{ item_id: string; amount: number; code: string; description: string }> = []

    // 3. Hors période → tout supprimer
    if (!isPortesOuvertesPeriod()) {
      await (cartModuleService as any).deleteLineItemAdjustments(poAdjs.map((a) => a.id))
      console.log(`[PortesOuvertesGuard] Hors période — ${poAdjs.length} adjustment(s) PO retirés du panier ${cartId}`)
      return
    }

    // 4. Code promo manuel → tout supprimer (non-cumul)
    const hasManualCode = allAdjs.some((a) => a.code && !KNOWN_AUTO_CODES.has(a.code))
    if (hasManualCode) {
      await (cartModuleService as any).deleteLineItemAdjustments(poAdjs.map((a) => a.id))
      console.log(`[PortesOuvertesGuard] Code manuel détecté — ${poAdjs.length} adjustment(s) PO retirés du panier ${cartId}`)
      return
    }

    // 5. Indexer les adjustments PO par item
    const poAdjsByItem = new Map<string, typeof poAdjs[0][]>()
    for (const adj of poAdjs) {
      if (!adj.item_id) continue
      const list = poAdjsByItem.get(adj.item_id) ?? []
      list.push(adj)
      poAdjsByItem.set(adj.item_id, list)
    }

    // 6. Items avec au moins un adjustment PO → charger leurs catégories
    const productIds = [...new Set(
      items
        .filter((i) => poAdjsByItem.has(i.id) && i.product_id)
        .map((i) => i.product_id!)
    )]

    // Map product_id → category handles
    const productCategoryHandles = new Map<string, string[]>()
    if (productIds.length > 0) {
      let productModule: any
      try { productModule = container.resolve(Modules.PRODUCT) } catch { return }

      const products: Array<{
        id: string
        categories?: Array<{ id: string; handle?: string | null }>
      }> = await productModule.listProducts(
        { id: productIds },
        { relations: ["categories"], select: ["id"] }
      )
      for (const p of products) {
        productCategoryHandles.set(
          p.id,
          (p.categories || []).map((c) => (c.handle ?? "").toLowerCase())
        )
      }
    }

    // 7. Pour chaque item avec adjustments PO — appliquer les règles
    for (const item of items) {
      const itemAdjs = poAdjsByItem.get(item.id)
      if (!itemAdjs?.length) continue

      const isOutlet = (item.metadata as any)?.outlet_discount === true
      const handles = item.product_id
        ? (productCategoryHandles.get(item.product_id) ?? [])
        : []

      const isExcluded = handles.some((h) => EXCLUDED_HANDLES.has(h))
      const isCavalier = handles.some((h) => CAVALIER_HANDLES.has(h))
      const isLC = handles.some((h) => LC_HANDLES.has(h))

      // Trouver les adjustments existants par code
      const globalAdj = itemAdjs.find((a) => a.code === PO_CODE)
      const cavalierAdj = itemAdjs.find((a) => a.code === PO_CAVALIER_CODE)
      const lcAdj = itemAdjs.find((a) => a.code === PO_LC_CODE)

      if (isOutlet || isExcluded) {
        // Retirer TOUS les adjustments PO de cet article
        for (const adj of itemAdjs) adjIdsToRemove.push(adj.id)
        continue
      }

      if (isCavalier) {
        // Retirer PO_GLOBAL_10 et tout LC parasite
        if (globalAdj) adjIdsToRemove.push(globalAdj.id)
        if (lcAdj) adjIdsToRemove.push(lcAdj.id)
        // Créer PO_CAVALIER_20 si absent
        if (!cavalierAdj && globalAdj && globalAdj.amount != null) {
          adjsToCreate.push({
            item_id: item.id,
            amount: Number(globalAdj.amount) * 2,
            code: PO_CAVALIER_CODE,
            description: "Portes Ouvertes 2026 − −20% Cavalier",
          })
        }
        continue
      }

      if (isLC) {
        // Retirer PO_GLOBAL_10 et tout cavalier parasite
        if (globalAdj) adjIdsToRemove.push(globalAdj.id)
        if (cavalierAdj) adjIdsToRemove.push(cavalierAdj.id)
        // Créer PO_LC_20 si absent
        if (!lcAdj && globalAdj && globalAdj.amount != null) {
          adjsToCreate.push({
            item_id: item.id,
            amount: Number(globalAdj.amount) * 2,
            code: PO_LC_CODE,
            description: "Portes Ouvertes 2026 − −20% LC Equestrian",
          })
        }
        continue
      }

      // Article éligible au -10% normal : retirer tout tier -20% parasite
      if (cavalierAdj) adjIdsToRemove.push(cavalierAdj.id)
      if (lcAdj) adjIdsToRemove.push(lcAdj.id)
      // Garder PO_GLOBAL_10
    }

    // 8. Appliquer les suppressions
    if (adjIdsToRemove.length > 0) {
      await (cartModuleService as any).deleteLineItemAdjustments(adjIdsToRemove)
    }

    // 9. Créer les nouveaux adjustments -20%
    if (adjsToCreate.length > 0) {
      await (cartModuleService as any).addLineItemAdjustments(adjsToCreate)
    }

    if (adjIdsToRemove.length > 0 || adjsToCreate.length > 0) {
      console.log(
        `[PortesOuvertesGuard] Panier ${cartId} — retirés: ${adjIdsToRemove.length}, créés: ${adjsToCreate.length}`
      )
    }
  } catch (error) {
    console.error("[PortesOuvertesGuard] Erreur:", error)
  }
}

export const config: SubscriberConfig = {
  event: "cart.updated",
}
