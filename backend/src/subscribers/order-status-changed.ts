import { Modules } from '@medusajs/framework/utils'
import { INotificationModuleService, IOrderModuleService } from '@medusajs/framework/types'
import { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'
import { EmailTemplates } from '../modules/email-notifications/templates'

/**
 * Subscriber qui envoie un email au client à chaque changement de statut de commande.
 * Écoute order.canceled et order.updated.
 */
export default async function orderStatusChangedHandler({
  event: { name, data },
  container,
}: SubscriberArgs<any>) {
  const notificationModuleService: INotificationModuleService = container.resolve(Modules.NOTIFICATION)
  const orderModuleService: IOrderModuleService = container.resolve(Modules.ORDER)

  try {
    const orderId = data.id
    if (!orderId) {
      console.log('[OrderStatus] Pas d\'ID commande dans l\'event data')
      return
    }

    const order = await orderModuleService.retrieveOrder(orderId, {
      relations: ['items', 'summary'],
    })

    if (!order?.email) {
      console.log(`[OrderStatus] Commande ${orderId} sans email, ignoré`)
      return
    }

    const newStatus = (order as any).status || 'unknown'

    // Ne pas envoyer pour "pending" (c'est déjà géré par order.placed)
    // Ne pas envoyer pour des statuts qui n'intéressent pas le client
    const NOTIFIABLE_STATUSES = ['completed', 'canceled', 'requires_action']

    // Pour order.canceled, forcer le statut
    const effectiveStatus = name === 'order.canceled' ? 'canceled' : newStatus

    if (!NOTIFIABLE_STATUSES.includes(effectiveStatus)) {
      console.log(`[OrderStatus] Statut "${effectiveStatus}" pour commande ${orderId} non notifiable, ignoré`)
      return
    }

    const displayId = (order as any).display_id || order.id

    console.log(`📧 [OrderStatus] Envoi email statut "${effectiveStatus}" pour commande #${displayId} → ${order.email}`)

    await notificationModuleService.createNotifications({
      to: order.email,
      channel: 'email',
      template: EmailTemplates.ORDER_STATUS_UPDATED,
      data: {
        emailOptions: {
          replyTo: 'contact@sellerie-lacabrade.be',
          subject: `Mise à jour de votre commande #${displayId}`,
        },
        order: {
          id: order.id,
          display_id: displayId,
          email: order.email,
          status: effectiveStatus,
          created_at: (order as any).created_at,
        },
        newStatus: effectiveStatus,
        preview: `Votre commande #${displayId} a été mise à jour`,
      },
    })

    console.log(`✅ [OrderStatus] Email envoyé pour commande #${displayId} (${effectiveStatus})`)
  } catch (error: any) {
    console.error('❌ [OrderStatus] Erreur envoi email changement statut:', error?.message ?? error)
  }
}

export const config: SubscriberConfig = {
  event: ['order.canceled', 'order.updated'],
}
