import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { IEventBusModuleService } from "@medusajs/framework/types"

/**
 * POST /admin/odoo/webhook/stock
 * Webhook pour recevoir les mises à jour de stock depuis Odoo
 * 
 * Configuration Odoo :
 * 1. Aller dans Settings → Technical → Automation → Automated Actions
 * 2. Créer une action sur product.product
 * 3. Trigger: On Update
 * 4. Action: Execute Python Code
 * 5. Code:
 *    import requests
 *    requests.post('https://your-medusa.com/admin/odoo/webhook/stock', json={
 *      'product_id': record.id,
 *      'sku': record.default_code,
 *      'qty_available': record.qty_available
 *    })
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { product_id, sku, qty_available } = req.body as {
      product_id: number
      sku: string
      qty_available: number
    }

    if (!sku) {
      return res.status(400).json({
        error: "SKU manquant",
      })
    }

    console.log(`📦 [ODOO WEBHOOK] Mise à jour stock reçue: ${sku} → ${qty_available} unités`)

    const inventoryService = req.scope.resolve(Modules.INVENTORY)
    const productService = req.scope.resolve(Modules.PRODUCT)

    // Trouver le variant Medusa par SKU
    const variants = await productService.listProductVariants({ sku: [sku] })

    if (!variants.length) {
      console.log(`⚠️  [ODOO WEBHOOK] Produit non trouvé dans Medusa: ${sku}`)
      return res.json({
        success: false,
        message: "Produit non trouvé dans Medusa",
      })
    }

    const variant = variants[0]
    
    // Récupérer les inventory items liés à ce variant
    const inventoryItems = await inventoryService.listInventoryItems({
      sku: [sku],
    })
    
    if (!inventoryItems.length) {
      console.log(`⚠️  [ODOO WEBHOOK] Pas d'inventory item pour ${sku}`)
      return res.json({
        success: false,
        message: "Inventory item non trouvé",
      })
    }
    
    const inventoryItem = inventoryItems[0]
    
    const levels = await inventoryService.listInventoryLevels({
      inventory_item_id: [inventoryItem.id],
    })

    if (levels.length > 0) {
      const reservedQty = levels[0].reserved_quantity || 0
      // available = qty_available_odoo → stocked = odooStock + reserved
      const targetStocked = qty_available + reservedQty

      await inventoryService.updateInventoryLevels({
        inventory_item_id: inventoryItem.id,
        location_id: levels[0].location_id,
        stocked_quantity: targetStocked,
      })
      
      console.log(`✅ [ODOO WEBHOOK] Stock mis à jour: ${sku} stocked=${targetStocked} (Odoo=${qty_available}, réservé=${reservedQty})`)

      // Émettre l'événement pour déclencher les alertes de retour en stock
      try {
        const eventBus: IEventBusModuleService = req.scope.resolve(Modules.EVENT_BUS)
        await eventBus.emit([{
          name: 'product-variant.updated',
          data: { variant_id: variant.id, inventory_item_id: inventoryItem.id },
        }])
        console.log(`📣 [ODOO WEBHOOK] Événement product-variant.updated émis pour variante ${variant.id}`)
      } catch (eventError: any) {
        console.warn(`⚠️ [ODOO WEBHOOK] Impossible d'émettre l'événement stock:`, eventError?.message)
      }
      
      return res.json({
        success: true,
        message: "Stock mis à jour",
        sku,
        odoo_quantity: qty_available,
        stocked_quantity: targetStocked,
        reserved_quantity: reservedQty,
        available_quantity: qty_available,
      })
    } else {
      console.log(`⚠️  [ODOO WEBHOOK] Pas de niveau de stock trouvé pour ${sku}`)
      return res.json({
        success: false,
        message: "Niveau de stock non trouvé",
      })
    }
  } catch (error: any) {
    console.error("❌ [ODOO WEBHOOK] Erreur:", error)
    return res.status(500).json({
      error: "Erreur lors de la mise à jour du stock",
      message: error.message,
    })
  }
}

