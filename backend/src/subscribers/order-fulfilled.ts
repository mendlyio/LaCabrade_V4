import { Modules } from '@medusajs/framework/utils'
import { INotificationModuleService, IOrderModuleService } from '@medusajs/framework/types'
import { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'
import { EmailTemplates } from '../modules/email-notifications/templates'

export default async function orderFulfilledHandler({
  event: { data },
  container,
}: SubscriberArgs<any>) {
  const notificationModuleService: INotificationModuleService = container.resolve(Modules.NOTIFICATION)
  const orderModuleService: IOrderModuleService = container.resolve(Modules.ORDER)
  
  try {
    // Récupérer la commande et ses relations
    const order = await orderModuleService.retrieveOrder(data.order_id, { 
      relations: ['shipping_address'] 
    })
    
    // Récupérer l'adresse de livraison
    const shippingAddress = await (orderModuleService as any).orderAddressService_.retrieve(order.shipping_address.id)
    
    // Récupérer le fulfillment
    const fulfillment = await (orderModuleService as any).fulfillmentService_.retrieve(data.fulfillment_id, {
      relations: ['tracking_links']
    })

    // Envoyer l'email de commande expédiée
    await notificationModuleService.createNotifications({
      to: order.email,
      channel: 'email',
      template: EmailTemplates.ORDER_SHIPPED,
      data: {
        emailOptions: {
          replyTo: 'info@lacabrade.be',
          subject: `📦 Votre commande #${order.display_id} est en route !`
        },
        order,
        fulfillment,
        shippingAddress,
        preview: 'Votre commande a été expédiée !'
      }
    })
    
    console.log(`✅ Email d'expédition envoyé pour la commande ${order.display_id}`)
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email d\'expédition:', error)
  }
}

export const config: SubscriberConfig = {
  id: 'order-fulfilled-handler',
  event: 'order.fulfillment_created'
}


