import { Modules } from '@medusajs/framework/utils'
import { INotificationModuleService, IProductModuleService, IInventoryService } from '@medusajs/framework/types'
import { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'
import { EmailTemplates } from '../modules/email-notifications/templates'
import { STOCK_ALERT_MODULE } from '../modules/stock-alert'

/**
 * Subscriber qui écoute les mises à jour de stock
 * et envoie des emails aux personnes en attente
 */
export default async function stockAlertNotificationHandler({
  event: { data },
  container,
}: SubscriberArgs<any>) {
  const notificationModuleService: INotificationModuleService = container.resolve(Modules.NOTIFICATION)
  const productModuleService: IProductModuleService = container.resolve(Modules.PRODUCT)
  const inventoryModuleService: IInventoryService = container.resolve(Modules.INVENTORY)
  const stockAlertService = container.resolve(STOCK_ALERT_MODULE) as any
  
  try {
    const { variant_id, inventory_item_id } = data

    if (!variant_id && !inventory_item_id) {
      console.log('[StockAlert] No variant_id or inventory_item_id in event data')
      return
    }

    // Récupérer la variante
    let variant
    if (variant_id) {
      variant = await productModuleService.retrieveProductVariant(variant_id, {
        relations: ['product']
      })
    }

    if (!variant || !variant.product) {
      console.log('[StockAlert] Variant or product not found')
      return
    }

    const product = variant.product

    // Vérifier le stock réel via les inventory levels (Medusa v2)
    // variant.inventory_quantity n'est pas fiable quand le module inventory est activé
    let isInStock = false
    try {
      const variantInventoryLinks = await (productModuleService as any).listProductVariantInventoryItems?.({
        variant_id: variant.id,
      }) || []

      if (variantInventoryLinks.length > 0) {
        const inventoryItemId = variantInventoryLinks[0].inventory_item_id
        const levels = await inventoryModuleService.listInventoryLevels({
          inventory_item_id: [inventoryItemId],
        })
        const availableQty = levels.reduce(
          (sum: number, l: any) => sum + Math.max(0, (l.stocked_quantity || 0) - (l.reserved_quantity || 0)),
          0
        )
        isInStock = availableQty > 0
      } else {
        // Fallback sur inventory_quantity si pas de lien d'inventaire
        isInStock = (variant.inventory_quantity || 0) > 0
      }
    } catch {
      // Fallback silencieux
      isInStock = (variant.inventory_quantity || 0) > 0
    }

    if (!isInStock) {
      console.log('[StockAlert] Product still out of stock, skipping')
      return
    }

    // Récupérer les alertes pour ce produit/variante
    const alerts = await stockAlertService.listStockAlerts({
      product_id: product.id,
      notified: false,
    })

    if (!alerts || alerts.length === 0) {
      console.log('[StockAlert] No alerts found for this product')
      return
    }

    console.log(`[StockAlert] Found ${alerts.length} alert(s) for product ${product.id}`)

    // Construire l'URL du produit
    const productUrl = `${process.env.STORE_URL || 'https://www.sellerie-lacabrade.be'}/products/${product.handle}`

    // Envoyer un email à chaque personne en attente
    for (const alert of alerts) {
      try {
        await notificationModuleService.createNotifications({
          to: alert.customer_email,
          channel: 'email',
          template: EmailTemplates.STOCK_ALERT,
          data: {
            emailOptions: {
              replyTo: 'contact@sellerie-lacabrade.be',
              subject: `🎉 ${product.title} est de retour en stock !`
            },
            productTitle: product.title,
            productUrl,
            productImage: product.thumbnail,
            customerEmail: alert.customer_email,
            preview: 'Bonne nouvelle ! Le produit est de retour en stock !'
          }
        })
        
        console.log(`✅ Stock alert email sent to ${alert.customer_email}`)
      } catch (emailError) {
        console.error(`❌ Error sending stock alert email to ${alert.customer_email}:`, emailError)
      }
    }

    // Marquer toutes les alertes comme notifiées
    const alertIds = alerts.map((alert: any) => alert.id)
    await Promise.all(
      alertIds.map((id: string) => stockAlertService.updateStockAlerts({ id, notified: true }))
    )
    
    console.log(`✅ Marked ${alertIds.length} alert(s) as notified`)
  } catch (error) {
    console.error('❌ Error in stock alert notification handler:', error)
  }
}

export const config: SubscriberConfig = {
  event: [
    'product-variant.updated',
    'inventory.updated'
  ]
}
