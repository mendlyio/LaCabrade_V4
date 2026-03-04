import { Modules } from '@medusajs/framework/utils'
import { INotificationModuleService, ICustomerModuleService } from '@medusajs/framework/types'
import { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'
import { EmailTemplates } from '../modules/email-notifications/templates'

export default async function customerCreatedEmailHandler({
  event: { data },
  container,
}: SubscriberArgs<any>) {
  const notificationModuleService: INotificationModuleService = container.resolve(Modules.NOTIFICATION)
  const customerModuleService: ICustomerModuleService = container.resolve(Modules.CUSTOMER)
  
  try {
    // Récupérer le client
    const customer = await customerModuleService.retrieveCustomer(data.id)

    if (!customer.email) {
      console.warn('Customer has no email, skipping welcome email')
      return
    }

    // Envoyer l'email de bienvenue
    await notificationModuleService.createNotifications({
      to: customer.email,
      channel: 'email',
      template: EmailTemplates.WELCOME,
      data: {
        emailOptions: {
          replyTo: 'info@sellerie-lacabrade.be',
          subject: '🐴 Bienvenue chez La Cabrade !'
        },
        firstName: customer.first_name || 'Cher(e) client(e)',
        email: customer.email,
        promoCode: 'BIENVENUE10',
        preview: 'Bienvenue chez La Cabrade !'
      }
    })
    
    console.log(`✅ Welcome email sent to ${customer.email}`)
  } catch (error) {
    console.error('❌ Error sending welcome notification:', error)
  }
}

export const config: SubscriberConfig = {
  event: 'customer.created'
}
