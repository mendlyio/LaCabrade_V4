import { ReactNode } from 'react'
import { MedusaError } from '@medusajs/framework/utils'
import { InviteUserEmail, INVITE_USER, isInviteUserData } from './invite-user'
import { OrderPlacedTemplate, ORDER_PLACED, isOrderPlacedTemplateData } from './order-placed'
import { OrderShippedTemplate, ORDER_SHIPPED, isOrderShippedTemplateData } from './order-shipped'
import { OrderStatusUpdatedTemplate, ORDER_STATUS_UPDATED, isOrderStatusUpdatedTemplateData } from './order-status-updated'
import { WelcomeTemplate, WELCOME, isWelcomeTemplateData } from './welcome'
import { StockAlertTemplate, STOCK_ALERT, isStockAlertTemplateData } from './stock-alert'
import { GiftCardDeliveryTemplate, GIFT_CARD_DELIVERY, isGiftCardDeliveryData } from './gift-card-delivery'
import { PasswordResetTemplate, PASSWORD_RESET, isPasswordResetTemplateData } from './password-reset'
import { NewsletterWelcomeTemplate, NEWSLETTER_WELCOME, isNewsletterWelcomeData } from './newsletter-welcome'
import { NewsletterBirthdayTemplate, NEWSLETTER_BIRTHDAY, isNewsletterBirthdayData } from './newsletter-birthday'
import { NewsletterBugfixReminderTemplate, NEWSLETTER_BUGFIX_REMINDER, isNewsletterBugfixReminderData } from './newsletter-bugfix-reminder'

export const EmailTemplates = {
  INVITE_USER,
  ORDER_PLACED,
  ORDER_SHIPPED,
  ORDER_STATUS_UPDATED,
  WELCOME,
  STOCK_ALERT,
  GIFT_CARD_DELIVERY,
  PASSWORD_RESET,
  NEWSLETTER_WELCOME,
  NEWSLETTER_BIRTHDAY,
  NEWSLETTER_BUGFIX_REMINDER,
} as const

export type EmailTemplateType = keyof typeof EmailTemplates

export function generateEmailTemplate(templateKey: string, data: unknown): ReactNode {
  switch (templateKey) {
    case EmailTemplates.INVITE_USER:
      if (!isInviteUserData(data)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Invalid data for template "${EmailTemplates.INVITE_USER}"`
        )
      }
      return <InviteUserEmail {...data} />

    case EmailTemplates.ORDER_PLACED:
      if (!isOrderPlacedTemplateData(data)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Invalid data for template "${EmailTemplates.ORDER_PLACED}"`
        )
      }
      return <OrderPlacedTemplate {...data} />

    case EmailTemplates.ORDER_SHIPPED:
      if (!isOrderShippedTemplateData(data)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Invalid data for template "${EmailTemplates.ORDER_SHIPPED}"`
        )
      }
      return <OrderShippedTemplate {...data} />

    case EmailTemplates.WELCOME:
      if (!isWelcomeTemplateData(data)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Invalid data for template "${EmailTemplates.WELCOME}"`
        )
      }
      return <WelcomeTemplate {...data} />

    case EmailTemplates.STOCK_ALERT:
      if (!isStockAlertTemplateData(data)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Invalid data for template "${EmailTemplates.STOCK_ALERT}"`
        )
      }
      return <StockAlertTemplate {...data} />

    case EmailTemplates.GIFT_CARD_DELIVERY:
      if (!isGiftCardDeliveryData(data)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Invalid data for template "${EmailTemplates.GIFT_CARD_DELIVERY}"`
        )
      }
      return <GiftCardDeliveryTemplate {...data} />

    case EmailTemplates.PASSWORD_RESET:
      if (!isPasswordResetTemplateData(data)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Invalid data for template "${EmailTemplates.PASSWORD_RESET}"`
        )
      }
      return <PasswordResetTemplate {...data} />

    case EmailTemplates.NEWSLETTER_WELCOME:
      if (!isNewsletterWelcomeData(data)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Invalid data for template "${EmailTemplates.NEWSLETTER_WELCOME}"`
        )
      }
      return <NewsletterWelcomeTemplate {...data} />

    case EmailTemplates.NEWSLETTER_BIRTHDAY:
      if (!isNewsletterBirthdayData(data)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Invalid data for template "${EmailTemplates.NEWSLETTER_BIRTHDAY}"`
        )
      }
      return <NewsletterBirthdayTemplate {...data} />

    case EmailTemplates.NEWSLETTER_BUGFIX_REMINDER:
      if (!isNewsletterBugfixReminderData(data)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Invalid data for template "${EmailTemplates.NEWSLETTER_BUGFIX_REMINDER}"`
        )
      }
      return <NewsletterBugfixReminderTemplate {...data} />

    case EmailTemplates.ORDER_STATUS_UPDATED:
      if (!isOrderStatusUpdatedTemplateData(data)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Invalid data for template "${EmailTemplates.ORDER_STATUS_UPDATED}"`
        )
      }
      return <OrderStatusUpdatedTemplate {...data} />

    default:
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Unknown template key: "${templateKey}"`
      )
  }
}

export { InviteUserEmail, OrderPlacedTemplate, OrderShippedTemplate, OrderStatusUpdatedTemplate, WelcomeTemplate, StockAlertTemplate, GiftCardDeliveryTemplate, PasswordResetTemplate, NewsletterWelcomeTemplate, NewsletterBirthdayTemplate, NewsletterBugfixReminderTemplate }
