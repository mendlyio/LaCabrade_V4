import { Modules } from '@medusajs/framework/utils'
import { INotificationModuleService, IProductModuleService } from '@medusajs/framework/types'
import { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'
import { EmailTemplates } from '../modules/email-notifications/templates'
import StockAlertService from '../services/stock-alert'

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
  const stockAlertService: StockAlertService = container.resolve('stockAlertService')
  
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

    // Vérifier si le stock est > 0
    const isInStock = (variant.inventory_quantity || 0) > 0

    if (!isInStock) {
      console.log('[StockAlert] Product still out of stock, skipping')
      return
    }

    // Récupérer les alertes pour ce produit/variante
    const alerts = await stockAlertService.getAlertsByProduct(product.id, variant.id)

    if (!alerts || alerts.length === 0) {
      console.log('[StockAlert] No alerts found for this product')
      return
    }

    console.log(`[StockAlert] Found ${alerts.length} alert(s) for product ${product.id}`)

    // Construire l'URL du produit
    const productUrl = `${process.env.STORE_URL || 'https://lacabrade.be'}/products/${product.handle}`

    // Envoyer un email à chaque personne en attente
    for (const alert of alerts) {
      try {
        await notificationModuleService.createNotifications({
          to: alert.customer_email,
          channel: 'email',
          template: EmailTemplates.STOCK_ALERT,
          data: {
            emailOptions: {
              replyTo: 'info@lacabrade.be',
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
    await stockAlertService.markAsNotified(alertIds)
    
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
