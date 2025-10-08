import type { SubscriberConfig, SubscriberArgs } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { ODOO_MODULE } from "../modules/odoo"
import OdooModuleService from "../modules/odoo/service"

/**
 * Subscriber pour synchroniser le stock avec Odoo lors d'événements Medusa
 * 
 * Synchronise Medusa → Odoo quand:
 * - Une vente est effectuée (stock diminue)
 * - Un ajustement manuel de stock est fait
 * - Une réservation est créée
 */

export default async function odooStockSyncHandler({
  event: { data },
  container,
}: SubscriberArgs<any>) {
  // Check if Odoo is configured
  if (!process.env.ODOO_URL || !process.env.ODOO_API_KEY) {
    return // Silent skip si Odoo non configuré
  }

  try {
    // Vérifier si le module Odoo est enregistré
    let odooService: OdooModuleService
    try {
      odooService = container.resolve(ODOO_MODULE)
    } catch (error) {
      // Module Odoo non enregistré, skip silencieusement
      return
    }

    console.log("📦 [ODOO STOCK] Événement de stock détecté:", data.id)

    const inventoryService = container.resolve(Modules.INVENTORY)

    // Get inventory item details
    const inventoryItem = await inventoryService.retrieveInventoryItem(data.id, {
      relations: ["variant"],
    })

    if (!inventoryItem?.variant?.sku) {
      console.log("⚠️  [ODOO STOCK] Pas de SKU trouvé, synchronisation ignorée")
      return
    }

    // Get stock levels
    const levels = await inventoryService.listInventoryLevels({
      inventory_item_id: [data.id],
    })

    const totalQuantity = levels.reduce((sum, level) => sum + level.stocked_quantity, 0)

    // Vérifier le stock actuel dans Odoo pour éviter les mises à jour inutiles
    const odooStock = await odooService.getStockBySku(inventoryItem.variant.sku)

    if (odooStock === null) {
      console.log(`⚠️  [ODOO STOCK] ${inventoryItem.variant.sku} non trouvé dans Odoo`)
      return
    }

    // Ne mettre à jour que si le stock a changé
    if (odooStock === totalQuantity) {
      console.log(`⏭️  [ODOO STOCK] ${inventoryItem.variant.sku}: stock identique (${totalQuantity}), skip`)
      return
    }

    console.log(`📦 [ODOO STOCK] ${inventoryItem.variant.sku}: ${odooStock} → ${totalQuantity}`)

    // Update stock in Odoo
    await odooService.updateStock(inventoryItem.variant.sku, totalQuantity)

    console.log(`✅ [ODOO STOCK] Stock synchronisé pour ${inventoryItem.variant.sku}`)
  } catch (error: any) {
    console.error(`❌ [ODOO STOCK] Erreur de synchronisation:`, error.message)
    // Don't throw - we don't want to block Medusa operations if Odoo sync fails
  }
}

export const config: SubscriberConfig = {
  event: [
    "inventory-item.updated",
    "inventory-level.updated",
  ],
}

