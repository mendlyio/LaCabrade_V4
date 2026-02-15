import { ReactNode } from 'react'
import { MedusaError } from '@medusajs/framework/utils'
import { InviteUserEmail, INVITE_USER, isInviteUserData } from './invite-user'
import { OrderPlacedTemplate, ORDER_PLACED, isOrderPlacedTemplateData } from './order-placed'
import { OrderShippedTemplate, ORDER_SHIPPED, isOrderShippedTemplateData } from './order-shipped'
import { WelcomeTemplate, WELCOME, isWelcomeTemplateData } from './welcome'
import { StockAlertTemplate, STOCK_ALERT, isStockAlertTemplateData } from './stock-alert'
import { GiftCardDeliveryTemplate, GIFT_CARD_DELIVERY, isGiftCardDeliveryData } from './gift-card-delivery'

export const EmailTemplates = {
  INVITE_USER,
  ORDER_PLACED,
  ORDER_SHIPPED,
  WELCOME,
  STOCK_ALERT,
  GIFT_CARD_DELIVERY,
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

    default:
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Unknown template key: "${templateKey}"`
      )
  }
}

export { InviteUserEmail, OrderPlacedTemplate, OrderShippedTemplate, WelcomeTemplate, StockAlertTemplate, GiftCardDeliveryTemplate }
