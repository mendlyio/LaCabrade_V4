/**
 * Corrige les paniers actifs avec des adjustments PO mal calculés.
 *
 * Problème : certains adjustments PO_LC_20 / PO_CAVALIER_20 ont été créés
 * avec amount en TTC au lieu de HT (parce qu'ils ont été dérivés via × 2 du
 * adjustment PO_GLOBAL_10 stocké parfois en TTC). cart-amounts.ts re-multiplie
 * par 1.21 → réduction trop forte au checkout.
 *
 * Ce script :
 *   1. Trouve tous les line items dont l'adjustment PO_*_20 a un montant
 *      différent de la valeur attendue (unit_price / 1.21 × 0.20)
 *   2. Supprime ces adjustments incorrects
 *   3. En recrée avec le bon montant HT
 *
 * Usage :
 *   DATABASE_URL=... REDIS_URL="" npx medusa exec src/scripts/fix-po-adjustments.ts
 */

import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

const VAT_RATE = 0.21
const PO_CODES = ["PO_CAVALIER_20", "PO_LC_20", "PO_GLOBAL_10"]

function expectedAmountHT(unitPriceTTC: number, quantity: number, code: string): number {
  const ht = unitPriceTTC / (1 + VAT_RATE)
  const pct = code === "PO_GLOBAL_10" ? 0.10 : 0.20
  return ht * pct * quantity
}

export default async function fixPoAdjustments({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const cartModule = container.resolve(Modules.CART) as any

  logger.info("🔧 Correction des adjustments PO sur paniers actifs...")

  // 1. Récupérer tous les adjustments PO
  const allAdjs: Array<{
    id: string
    item_id: string
    amount: number
    code: string
  }> = await cartModule.listLineItemAdjustments(
    { code: PO_CODES },
    { take: 5000 }
  )

  logger.info(`   ${allAdjs.length} adjustment(s) PO trouvé(s)`)

  if (allAdjs.length === 0) {
    logger.info("✅ Aucun adjustment à corriger.")
    return
  }

  // 2. Récupérer les line items concernés
  const itemIds = [...new Set(allAdjs.map((a) => a.item_id))]
  const items: Array<{
    id: string
    unit_price: number
    quantity: number
  }> = await cartModule.listLineItems(
    { id: itemIds },
    { take: 5000 }
  )

  const itemById = new Map(items.map((i) => [i.id, i]))

  // 3. Identifier les adjustments à corriger
  const toDelete: string[] = []
  const toCreate: Array<{ item_id: string; amount: number; code: string; description: string }> = []

  // Grouper par item_id + code pour gérer les doublons
  const byItemCode = new Map<string, typeof allAdjs>()
  for (const adj of allAdjs) {
    const key = `${adj.item_id}::${adj.code}`
    const list = byItemCode.get(key) ?? []
    list.push(adj)
    byItemCode.set(key, list)
  }

  for (const [key, adjs] of byItemCode) {
    const [itemId, code] = key.split("::")
    const item = itemById.get(itemId)
    if (!item) {
      // Item supprimé → on supprime tous les adjustments orphelins
      for (const adj of adjs) toDelete.push(adj.id)
      continue
    }

    const unitPrice = Number(item.unit_price ?? 0)
    const qty = item.quantity ?? 1
    const expected = expectedAmountHT(unitPrice, qty, code)
    const epsilon = 0.001

    // Garder le 1er adjustment correct, supprimer les autres
    let kept = false
    for (const adj of adjs) {
      const current = Number(adj.amount ?? 0)
      const isCorrect = Math.abs(current - expected) < epsilon
      if (!kept && isCorrect) {
        kept = true
      } else {
        toDelete.push(adj.id)
      }
    }

    if (!kept && unitPrice > 0) {
      const description =
        code === "PO_CAVALIER_20"
          ? "Portes Ouvertes 2026 − −20% Cavalier"
          : code === "PO_LC_20"
            ? "Portes Ouvertes 2026 − −20% LC Equestrian"
            : "Portes Ouvertes 2026 − −10%"
      toCreate.push({ item_id: itemId, amount: expected, code, description })
    }
  }

  logger.info(`   ${toDelete.length} adjustment(s) à supprimer`)
  logger.info(`   ${toCreate.length} adjustment(s) à recréer`)

  if (toDelete.length > 0) {
    await cartModule.deleteLineItemAdjustments(toDelete)
    logger.info(`✅ ${toDelete.length} adjustments supprimés.`)
  }
  if (toCreate.length > 0) {
    await cartModule.addLineItemAdjustments(toCreate)
    logger.info(`✅ ${toCreate.length} adjustments recréés avec le bon montant HT.`)
  }

  logger.info("🎉 Correction terminée.")
}
