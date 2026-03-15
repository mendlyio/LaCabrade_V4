import { Modules } from '@medusajs/framework/utils'
import { INotificationModuleService, IOrderModuleService, IFulfillmentModuleService, IProductModuleService } from '@medusajs/framework/types'
import { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'
import { EmailTemplates } from '../modules/email-notifications/templates'
import { STORE_URL } from '../lib/constants'

export default async function orderShippedEmailHandler({
  event: { data },
  container,
}: SubscriberArgs<any>) {
  const notificationModuleService: INotificationModuleService = container.resolve(Modules.NOTIFICATION)
  const orderModuleService: IOrderModuleService = container.resolve(Modules.ORDER)
  const fulfillmentModuleService: IFulfillmentModuleService = container.resolve(Modules.FULFILLMENT)
  
  try {
    // Récupérer le fulfillment
    const fulfillment = await fulfillmentModuleService.retrieveFulfillment(data.id, {
      relations: ['order', 'items']
    })

    const orderId = (fulfillment as any).order_id
    if (!orderId) {
      console.warn('Fulfillment has no order_id, skipping email')
      return
    }

    // Récupérer la commande
    const order = await orderModuleService.retrieveOrder(orderId, {
      relations: ['items', 'summary', 'shipping_address']
    })
    
    const shippingAddress = await (orderModuleService as any).orderAddressService_.retrieve(order.shipping_address.id)

    // Extraire les infos de suivi enrichies (ajoutées par notre BpostFulfillmentProvider)
    const fulfillmentData = (fulfillment as any).data || {}
    const publicTrackingUrl = fulfillmentData.public_tracking_url
    const labelUrl = fulfillmentData.label_url

    // Récupérer des produits suggérés
    let suggestedProducts: Array<{ title: string; thumbnail: string; url: string }> = []
    try {
      const productModuleService: IProductModuleService = container.resolve(Modules.PRODUCT)
      const products = await productModuleService.listProducts(
        {},
        { take: 30, select: ['id', 'title', 'handle', 'thumbnail'] }
      )
      suggestedProducts = products
        .filter((p) => p.thumbnail)
        .sort(() => 0.5 - Math.random())
        .slice(0, 2)
        .map((p) => ({
          title: p.title,
          thumbnail: p.thumbnail!,
          url: `${STORE_URL}/products/${p.handle}`,
        }))
    } catch (e: any) {
      console.warn('⚠️ Could not fetch suggested products for shipped email:', e?.message)
    }

    await notificationModuleService.createNotifications({
      to: order.email,
      channel: 'email',
      template: EmailTemplates.ORDER_SHIPPED,
      data: {
        emailOptions: {
          replyTo: 'contact@sellerie-lacabrade.be',
          subject: `Votre commande #${(order as any).display_id} a été expédiée !`
        },
        order: {
          ...order,
          display_id: (order as any).display_id || order.id
        },
        fulfillment: {
            ...fulfillment,
            data: {
                ...fulfillmentData,
                public_tracking_url: publicTrackingUrl,
                label_url: labelUrl
            }
        },
        shippingAddress,
        suggestedProducts,
        preview: 'Votre commande a été expédiée !'
      }
    })
    
    console.log(`✅ Order shipped email sent for order ${order.id}`)
  } catch (error) {
    console.error('❌ Error sending order shipped notification:', error)
  }
}

export const config: SubscriberConfig = {
  event: 'fulfillment.created'
}

