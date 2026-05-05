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

// TVA belge standard 21 % — Medusa V2 tax-inclusive : adjustment.amount est en HT.
// On calcule donc l'amount en HT pour que cart-amounts.ts × (1 + VAT_RATE) tombe juste.
const VAT_RATE = 0.21
const TIER_DISCOUNT = 0.20 // -20% pour cavalier et LC Equestrian
const GLOBAL_DISCOUNT = 0.10 // -10% global

/**
 * Calcule le montant HT d'un adjustment à partir du unit_price TTC.
 * unit_price (EUR TTC) → HT = unit_price / (1 + VAT_RATE) → amount HT = HT × % × qty
 */
function computeAmountHT(unitPriceTTC: number, quantity: number, discountPct: number): number {
  const ht = unitPriceTTC / (1 + VAT_RATE)
  return ht * discountPct * quantity
}

function compute20PctAmountHT(unitPriceTTC: number, quantity: number): number {
  return computeAmountHT(unitPriceTTC, quantity, TIER_DISCOUNT)
}

function compute10PctAmountHT(unitPriceTTC: number, quantity: number): number {
  return computeAmountHT(unitPriceTTC, quantity, GLOBAL_DISCOUNT)
}

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
    const adjsToUpdate: Array<{ id: string; amount?: number; code?: string; description?: string }> = []

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

      const isOutlet =
        (item.metadata as any)?.outlet_discount === true ||
        ((item as any).compare_at_unit_price != null &&
          Number((item as any).compare_at_unit_price) > Number(item.unit_price ?? 0))
      const handles = item.product_id
        ? (productCategoryHandles.get(item.product_id) ?? [])
        : []

      const isExcluded = handles.some((h) => EXCLUDED_HANDLES.has(h))
      const isCavalier = handles.some((h) => CAVALIER_HANDLES.has(h))
      const isLC = handles.some((h) => LC_HANDLES.has(h))

      // Indexer par code
      const globalAdjs = itemAdjs.filter((a) => a.code === PO_CODE)
      const cavalierAdjs = itemAdjs.filter((a) => a.code === PO_CAVALIER_CODE)
      const lcAdjs = itemAdjs.filter((a) => a.code === PO_LC_CODE)

      const unitPrice = Number(item.unit_price ?? 0)
      const qty = item.quantity ?? 1

      if (isOutlet || isExcluded) {
        // Retirer TOUS les adjustments PO de cet article
        for (const adj of itemAdjs) adjIdsToRemove.push(adj.id)
        continue
      }

      if (isCavalier || isLC) {
        const targetCode = isCavalier ? PO_CAVALIER_CODE : PO_LC_CODE
        const targetDescription = isCavalier
          ? "Portes Ouvertes 2026 − −20% Cavalier"
          : "Portes Ouvertes 2026 − −20% LC Equestrian"
        const expectedAmountHT = compute20PctAmountHT(unitPrice, qty)
        const epsilon = 0.001

        // Supprimer les adjustments custom orphelins (sans promotion_id) peu importe leur code
        const wrongTierAdjs = isCavalier ? lcAdjs : cavalierAdjs
        for (const adj of wrongTierAdjs) adjIdsToRemove.push(adj.id)

        // Stratégie : on MET À JOUR le PO_GLOBAL_10 existant (qui a un promotion_id)
        // pour qu'il reflète le -20%. Ainsi il reste visible dans le discount_total.
        // Les custom PO_LC_20/PO_CAVALIER_20 créés précédemment (sans promotion_id) sont nettoyés.
        const correctTierAdjs = isCavalier ? cavalierAdjs : lcAdjs
        for (const adj of correctTierAdjs) adjIdsToRemove.push(adj.id) // cleanup anciens customs

        if (globalAdjs.length > 0) {
          // Mettre à jour le premier PO_GLOBAL_10 (garder son promotion_id = visible API)
          const adjToUpdate = globalAdjs[0]
          const currentAmount = Number(adjToUpdate.amount ?? 0)
          if (Math.abs(currentAmount - expectedAmountHT) > epsilon) {
            adjsToUpdate.push({
              id: adjToUpdate.id,
              amount: expectedAmountHT,
              code: targetCode,
              description: targetDescription,
            })
          } else if (adjToUpdate.code !== targetCode) {
            // Montant déjà correct, juste renommer le code
            adjsToUpdate.push({ id: adjToUpdate.id, code: targetCode, description: targetDescription })
          }
          // Supprimer les doublons PO_GLOBAL_10 s'il y en a plusieurs
          for (let i = 1; i < globalAdjs.length; i++) {
            adjIdsToRemove.push(globalAdjs[i].id)
          }
        } else {
          // Pas de PO_GLOBAL_10 → créer un adjustment (sera sans promotion_id,
          // mais au moins le montant est bon pour le paiement Stripe)
          const existing = correctTierAdjs.find(
            (a) => Math.abs(Number(a.amount ?? 0) - expectedAmountHT) < epsilon
          )
          if (!existing) {
            adjsToCreate.push({
              item_id: item.id,
              amount: expectedAmountHT,
              code: targetCode,
              description: targetDescription,
            })
          }
        }
        continue
      }

      // Article éligible au -10% normal : retirer tout tier -20% parasite + garantir
      // que PO_GLOBAL_10 a le bon montant HT (Medusa stocke parfois en TTC, ce qui
      // cause une double-conversion × 1.21 dans cart-amounts.ts → -12% au lieu de -10%).
      for (const adj of cavalierAdjs) adjIdsToRemove.push(adj.id)
      for (const adj of lcAdjs) adjIdsToRemove.push(adj.id)

      const expectedGlobalHT = compute10PctAmountHT(unitPrice, qty)
      const epsilonGlobal = 0.001
      let globalKept = false
      for (const adj of globalAdjs) {
        const currentAmount = Number(adj.amount ?? 0)
        const amountIsCorrect = Math.abs(currentAmount - expectedGlobalHT) < epsilonGlobal
        if (!globalKept && amountIsCorrect) {
          globalKept = true
        } else {
          adjIdsToRemove.push(adj.id)
        }
      }
      if (!globalKept && unitPrice > 0) {
        adjsToCreate.push({
          item_id: item.id,
          amount: expectedGlobalHT,
          code: PO_CODE,
          description: "Portes Ouvertes 2026 − −10%",
        })
      }
    }

    // 8. Appliquer les suppressions
    if (adjIdsToRemove.length > 0) {
      await (cartModuleService as any).deleteLineItemAdjustments(adjIdsToRemove)
    }

    // 9. Mettre à jour les adjustments (upgrade -10% → -20% avec promotion_id conservé)
    if (adjsToUpdate.length > 0) {
      await (cartModuleService as any).updateLineItemAdjustments(adjsToUpdate)
    }

    // 10. Créer les nouveaux adjustments (fallback si pas de PO_GLOBAL_10 existant)
    if (adjsToCreate.length > 0) {
      await (cartModuleService as any).addLineItemAdjustments(adjsToCreate)
    }

    if (adjIdsToRemove.length > 0 || adjsToCreate.length > 0 || adjsToUpdate.length > 0) {
      console.log(
        `[PortesOuvertesGuard] Panier ${cartId} — retirés: ${adjIdsToRemove.length}, mis à jour: ${adjsToUpdate.length}, créés: ${adjsToCreate.length}`
      )
    }
  } catch (error) {
    console.error("[PortesOuvertesGuard] Erreur:", error)
  }
}

export const config: SubscriberConfig = {
  event: "cart.updated",
}
