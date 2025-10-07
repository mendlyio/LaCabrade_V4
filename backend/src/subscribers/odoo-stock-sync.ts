import type { SubscriberConfig } from "@medusajs/framework"
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
}: any) {
  // Check if Odoo is configured
  if (!process.env.ODOO_URL || !process.env.ODOO_API_KEY) {
    console.log("⚠️  [ODOO STOCK] Odoo non configuré, synchronisation ignorée")
    return
  }

  try {
    console.log("📦 [ODOO STOCK] Événement de stock détecté:", data.id)

    const odooService: OdooModuleService = container.resolve(ODOO_MODULE)
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

    console.log(`📦 [ODOO STOCK] Synchronisation ${inventoryItem.variant.sku}: ${totalQuantity} unités`)

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

