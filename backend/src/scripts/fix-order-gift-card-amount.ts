/**
 * Corrige le montant des bons cadeaux dans les commandes existantes.
 * Le unit_price était stocké en centimes au lieu d'euros.
 *
 * Usage : npx medusa exec src/scripts/fix-order-gift-card-amount.ts
 */

import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

const ORDER_DISPLAY_IDS = [27, 37]

export default async function fixOrderGiftCardAmount({ container }: ExecArgs) {
  const orderModuleService = container.resolve(Modules.ORDER) as any
  const logger = container.resolve("logger") as any

  for (const displayId of ORDER_DISPLAY_IDS) {
    logger.info(`\n🔍 Recherche de la commande #${displayId}...`)

    const orders = await orderModuleService.listOrders(
      { display_id: displayId },
      { relations: ["items"], take: 1 }
    )

    if (orders.length === 0) {
      logger.error(`❌ Commande #${displayId} non trouvée.`)
      continue
    }

    const order = orders[0]
    logger.info(`📋 Commande trouvée: ${order.id}`)

    const gcItems = (order.items || []).filter((item: any) => {
      return (
        (item.metadata as any)?.is_gift_card === true ||
        String(item.product_title || item.title || "").toLowerCase().includes("bon cadeau") ||
        (item.variant_sku || "").startsWith("GC-")
      )
    })

    if (gcItems.length === 0) {
      logger.info("Aucun article bon cadeau trouvé dans cette commande.")
      continue
    }

    for (const item of gcItems) {
      const currentPrice = Number(item.unit_price)
      logger.info(`\n--- Item: ${item.title || item.product_title} ---`)
      logger.info(`   ID: ${item.id}`)
      logger.info(`   SKU: ${item.variant_sku}`)
      logger.info(`   unit_price actuel: ${currentPrice}`)

      // Un unit_price > 100 pour un bon cadeau signifie qu'il est en centimes
      if (currentPrice > 100) {
        const correctedPrice = currentPrice / 100
        logger.info(`   🔧 Correction: ${currentPrice} (centimes) → ${correctedPrice}€`)

        try {
          await orderModuleService.updateOrderItem(item.id, {
            unit_price: correctedPrice,
          })
          logger.info(`   ✅ unit_price corrigé à ${correctedPrice}€`)
        } catch (e: any) {
          logger.warn(`   ⚠️ updateOrderItem échoué: ${e.message}`)
          logger.info("   Tentative via SQL direct...")
          try {
            const query = container.resolve("query") as any
            await query.graph({
              entity: "order_line_item",
              filters: { id: item.id },
              update: { unit_price: correctedPrice },
            })
            logger.info(`   ✅ Corrigé via query`)
          } catch (e2: any) {
            logger.error(`   ❌ Impossible de corriger: ${e2.message}`)
          }
        }
      } else {
        logger.info(`   ✅ Montant déjà correct (${currentPrice}€)`)
      }
    }
  }

  logger.info("\n🎉 Terminé.")
}
