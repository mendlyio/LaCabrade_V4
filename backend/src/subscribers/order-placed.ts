import { Modules } from '@medusajs/framework/utils'
import { INotificationModuleService, IOrderModuleService } from '@medusajs/framework/types'
import { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'
import { EmailTemplates } from '../modules/email-notifications/templates'

export default async function customOrderPlacedEmailHandler({
  event: { data },
  container,
}: SubscriberArgs<any>) {
  const notificationModuleService: INotificationModuleService = container.resolve(Modules.NOTIFICATION)
  const orderModuleService: IOrderModuleService = container.resolve(Modules.ORDER)
  
  const order = await orderModuleService.retrieveOrder(data.id, { relations: ['items', 'summary', 'shipping_address'] })
  const shippingAddress = await (orderModuleService as any).orderAddressService_.retrieve(order.shipping_address.id)

  try {
    await notificationModuleService.createNotifications({
      to: order.email,
      channel: 'email',
      template: EmailTemplates.ORDER_PLACED,
      data: {
        emailOptions: {
          replyTo: 'info@lacabrade.be',
          subject: `Confirmation de votre commande #${(order as any).display_id || order.id}`
        },
        order: {
          ...order,
          display_id: (order as any).display_id || order.id
        },
        shippingAddress,
        preview: 'Merci pour votre commande !'
      }
    })
    
    console.log(`✅ Order confirmation email sent for order ${order.id}`)
  } catch (error) {
    console.error('❌ Error sending order confirmation notification:', error)
  }
}

export const config: SubscriberConfig = {
  id: 'order-placed-handler',
  event: 'order.placed'
}
