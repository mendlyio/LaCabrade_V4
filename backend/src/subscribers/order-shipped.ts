import { Modules } from '@medusajs/framework/utils'
import { INotificationModuleService, IOrderModuleService, IFulfillmentModuleService } from '@medusajs/framework/types'
import { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'
import { EmailTemplates } from '../modules/email-notifications/templates'

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

    // Envoyer l'email
    await notificationModuleService.createNotifications({
      to: order.email,
      channel: 'email',
      template: EmailTemplates.ORDER_SHIPPED,
      data: {
        emailOptions: {
          replyTo: 'contact@sellerie-lacabrade.be',
          subject: `Votre commande #${(order as any).display_id} a été expédiée ! 🚀`
        },
        order: {
          ...order,
          display_id: (order as any).display_id || order.id
        },
        fulfillment: {
            ...fulfillment,
            // On injecte les données personnalisées ici pour le template
            data: {
                ...fulfillmentData,
                public_tracking_url: publicTrackingUrl,
                label_url: labelUrl
            }
        },
        shippingAddress,
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

