import { Modules } from '@medusajs/framework/utils'
import { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'
import { INotificationModuleService } from '@medusajs/framework/types'
import { EmailTemplates } from '../modules/email-notifications/templates'
import { STORE_URL } from '../lib/constants'

type PasswordResetPayload = {
  entity_id: string
  token: string
  actor_type: string
}

export default async function passwordResetHandler({
  event: { data },
  container,
}: SubscriberArgs<PasswordResetPayload>) {
  const { entity_id: email, token, actor_type } = data

  if (actor_type !== 'customer') {
    return
  }

  try {
    const notificationModuleService: INotificationModuleService = container.resolve(Modules.NOTIFICATION)
    const baseUrl = STORE_URL.replace(/\/$/, '')
    const resetUrl = `${baseUrl}/be/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`

    await notificationModuleService.createNotifications({
      to: email,
      channel: 'email',
      template: EmailTemplates.PASSWORD_RESET,
      data: {
        reset_url: resetUrl,
        email,
        emailOptions: {
          subject: 'Réinitialisation de votre mot de passe - La Cabrade',
        },
      },
    })

    console.log(`✅ Password reset email sent to ${email}`)
  } catch (error: any) {
    console.error('❌ Error sending password reset email:', error?.message ?? error)
  }
}

export const config: SubscriberConfig = {
  event: 'auth.password_reset',
}
