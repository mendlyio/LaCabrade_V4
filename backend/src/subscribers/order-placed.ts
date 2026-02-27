import { Modules } from '@medusajs/framework/utils'
import { INotificationModuleService, IOrderModuleService } from '@medusajs/framework/types'
import { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'
import { EmailTemplates } from '../modules/email-notifications/templates'
import { ODOO_MODULE } from '../modules/odoo'
import OdooModuleService from '../modules/odoo/service'

export default async function customOrderPlacedEmailHandler({
  event: { data },
  container,
}: SubscriberArgs<any>) {
  const orderModuleService: IOrderModuleService = container.resolve(Modules.ORDER)
  
  const order = await orderModuleService.retrieveOrder(data.id, { 
    relations: ['items', 'summary', 'shipping_address', 'shipping_methods'] 
  })
  
  // Récupération sécurisée de l'adresse (peut échouer si shipping_address est null, bien que rare sur order.placed)
  let shippingAddress
  try {
    if (order.shipping_address?.id) {
      shippingAddress = await (orderModuleService as any).orderAddressService_.retrieve(order.shipping_address.id)
    }
  } catch (e) {
    console.warn('⚠️ Impossible de récupérer l\'adresse complète:', e)
    shippingAddress = order.shipping_address
  }

  // 1. Envoyer l'email de confirmation
  try {
    const notificationModuleService: INotificationModuleService = container.resolve(Modules.NOTIFICATION)
    const orderData = {
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

    // Email au client
    await notificationModuleService.createNotifications({
      to: order.email,
      channel: 'email',
      template: EmailTemplates.ORDER_PLACED,
      data: orderData
    })

    // Email à l'équipe gestion des commandes
    await notificationModuleService.createNotifications({
      to: 'contact@la-cabrade.be',
      channel: 'email',
      template: EmailTemplates.ORDER_PLACED,
      data: {
        ...orderData,
        emailOptions: {
          ...orderData.emailOptions,
          subject: `[La Cabrade] Nouvelle commande #${(order as any).display_id || order.id}`
        }
      }
    })
    
    console.log(`✅ Order confirmation email sent for order ${order.id} (client + contact@la-cabrade.be)`)
  } catch (error: any) {
    console.error('❌ Error sending order confirmation notification:', error?.message ?? error)
    if (error?.code === 'MODULE_NOT_FOUND' || error?.message?.includes('NOTIFICATION')) {
      console.warn('💡 Vérifiez que RESEND_API_KEY et RESEND_FROM_EMAIL sont définis en production (Railway).')
    }
  }

  // 2. Synchroniser avec Odoo
  try {
    // Vérifier si le module Odoo est actif
    let odooService: OdooModuleService
    try {
      odooService = container.resolve(ODOO_MODULE)
    } catch (e) {
      console.log('ℹ️ Module Odoo non configuré, pas de sync commande.')
      return
    }

    if (odooService) {
      console.log(`🔄 Syncing order ${order.id} to Odoo...`)
      
      const items = order.items.map((item) => ({
        sku: item.variant_sku || '',
        quantity: item.quantity,
        price: item.unit_price,
        name: item.title // ou variant_title
      })).filter(i => i.sku) // On ne peut envoyer que les items avec SKU

      // Calcul du coût de livraison
      const shippingCost = order.shipping_methods?.reduce((acc, method) => acc + (Number(method.amount) || 0), 0) || 0

      if (items.length > 0) {
        // Récupérer le numéro de TVA et le nom de société depuis la metadata de la commande
        const vatNumber = (order.metadata as any)?.vat_number || null
        const companyName = shippingAddress?.company || null

        if (vatNumber) {
          console.log(`🏢 Commande avec TVA intracommunautaire: ${vatNumber} (société: ${companyName || 'N/A'})`)
        }

        const odooOrderId = await odooService.createOrder({
          customerEmail: order.email,
          customerName: shippingAddress ? `${shippingAddress.first_name} ${shippingAddress.last_name}` : 'Client Web',
          items: items,
          shippingCost: shippingCost,
          total: (order.summary as any)?.total || order.total || 0,
          shippingAddress: shippingAddress ? {
            address_1: shippingAddress.address_1,
            city: shippingAddress.city,
            postal_code: shippingAddress.postal_code,
            country_code: shippingAddress.country_code
          } : undefined,
          companyName: companyName || undefined,
          vatNumber: vatNumber || undefined,
        })
        console.log(`✅ Order synced to Odoo successfully! Odoo ID: ${odooOrderId}`)
      } else {
        console.warn(`⚠️ Order ${order.id} has no items with SKU, skipping Odoo sync.`)
      }
    }
  } catch (error: any) {
    console.error('❌ Error syncing order to Odoo:', error.message)
    // On ne throw pas pour ne pas bloquer le flow Medusa, mais on log l'erreur
  }
}

export const config: SubscriberConfig = {
  event: 'order.placed'
}
