import { Modules } from "@medusajs/framework/utils"
import {
  INotificationModuleService,
  IOrderModuleService,
} from "@medusajs/framework/types"
import { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa"
import { createPromotionsWorkflow } from "@medusajs/medusa/core-flows"
import { EmailTemplates } from "../modules/email-notifications/templates"
import { generateGiftCardPDF, generateGiftCardCode } from "../utils/generate-gift-card-pdf"
import { syncGiftCardToOdoo } from "../utils/sync-gift-card-odoo"
import { ODOO_MODULE } from "../modules/odoo"
import OdooModuleService from "../modules/odoo/service"
import { GIFT_CARD_TRACKING_MODULE } from "../modules/gift-card-tracking/constants"

export default async function giftCardOrderedHandler({
  event: { data },
  container,
}: SubscriberArgs<any>) {
  const orderModuleService: IOrderModuleService = container.resolve(Modules.ORDER)
  const notificationModuleService: INotificationModuleService = container.resolve(
    Modules.NOTIFICATION
  )

  let giftCardTrackingService: any = null
  try {
    giftCardTrackingService = container.resolve(GIFT_CARD_TRACKING_MODULE)
  } catch (e) {
    console.warn("[GiftCard] Module gift-card-tracking non disponible")
  }

  try {
    const order = await orderModuleService.retrieveOrder(data.id, {
      relations: ["items", "shipping_address"],
    })

    const giftCardItems = order.items.filter(
      (item: any) => item.metadata?.is_gift_card === true
    )

    if (giftCardItems.length === 0) {
      return
    }

    console.log(
      `[GiftCard] ${giftCardItems.length} bon(s) cadeau(x) détecté(s) dans la commande ${order.id}`
    )

    let senderName = "Un(e) ami(e)"
    try {
      if (order.shipping_address?.id) {
        const address = await (orderModuleService as any).orderAddressService_.retrieve(
          order.shipping_address.id
        )
        if (address?.first_name) {
          senderName = `${address.first_name} ${address.last_name || ""}`.trim()
        }
      }
    } catch (e) {
      if ((order.shipping_address as any)?.first_name) {
        senderName = `${(order.shipping_address as any).first_name} ${(order.shipping_address as any).last_name || ""}`.trim()
      }
    }

    let odooService: OdooModuleService | null = null
    try {
      odooService = container.resolve(ODOO_MODULE)
    } catch (e) {
      console.log("[GiftCard] Module Odoo non configuré, pas de sync.")
    }

    for (const item of giftCardItems) {
      try {
        const metadata = item.metadata as Record<string, any>
        const recipientEmail = metadata.recipient_email
        const recipientName = metadata.recipient_name || "Cher(e) destinataire"
        const giftMessage = metadata.gift_message || ""
        const amount = Number(item.unit_price)

        const code = generateGiftCardCode()
        console.log(`[GiftCard] Code généré: ${code} (${amount}€ pour ${recipientEmail})`)

        // Create the Medusa promotion for checkout redemption
        // Medusa v2 promotion value/limit = unité principale (EUR), pas centimes
        let promotionId: string | null = null
        try {
          const createPromotions = createPromotionsWorkflow(container)
          const result = await createPromotions.run({
            input: {
              promotionsData: [
                {
                  code,
                  type: "standard",
                  status: "active",
                  is_automatic: false,
                  campaign: {
                    name: `Bon Cadeau ${code}`,
                    campaign_identifier: code,
                    budget: {
                      type: "spend",
                      limit: amount,
                      currency_code: "eur",
                    },
                  },
                  application_method: {
                    type: "fixed",
                    target_type: "order",
                    value: amount,
                    currency_code: "eur",
                  },
                },
              ],
            },
          })
          promotionId = result?.result?.[0]?.id ?? null
          console.log(`[GiftCard] Promotion créée pour le code ${code} (${amount}€) - ID: ${promotionId}`)
        } catch (promoError: any) {
          console.error(
            `[GiftCard] Erreur création promotion pour ${code}:`,
            promoError.message
          )
        }

        // Save to the gift-card-tracking module
        if (giftCardTrackingService) {
          try {
            await giftCardTrackingService.createGiftCards({
              code,
              original_amount: amount,
              balance: amount,
              recipient_email: recipientEmail,
              recipient_name: recipientName,
              sender_name: senderName,
              message: giftMessage,
              order_id: order.id,
              promotion_id: promotionId,
              status: "active",
            })
            console.log(`[GiftCard] Tracking record créé pour ${code}`)
          } catch (trackingError: any) {
            console.error(
              `[GiftCard] Erreur création tracking pour ${code}:`,
              trackingError.message
            )
          }
        }

        // Generate PDF
        const pdfBuffer = await generateGiftCardPDF({
          code,
          amount,
          recipientName,
          message: giftMessage,
          senderName,
        })
        console.log(`[GiftCard] PDF généré (${pdfBuffer.length} bytes)`)

        // Send email with PDF attachment
        try {
          await notificationModuleService.createNotifications({
            to: recipientEmail,
            channel: "email",
            template: EmailTemplates.GIFT_CARD_DELIVERY,
            attachments: [
              {
                content: Buffer.from(pdfBuffer).toString("base64"),
                filename: `bon-cadeau-lacabrade-${code}.pdf`,
                content_type: "application/pdf",
                disposition: "attachment",
              },
            ],
            data: {
              emailOptions: {
                replyTo: "contact@sellerie-lacabrade.be",
                subject: `Vous avez reçu un Bon Cadeau La Cabrade de ${amount}€ !`,
              },
              code,
              amount,
              recipientName,
              senderName,
              message: giftMessage,
              preview: `${senderName} vous a offert un bon cadeau de ${amount}€ !`,
            },
          } as any)

          console.log(
            `[GiftCard] Email envoyé à ${recipientEmail} avec le bon cadeau ${code}`
          )
        } catch (emailError: any) {
          console.error(
            `[GiftCard] Erreur d'envoi email pour ${code}:`,
            emailError.message
          )
        }

        // Sync to Odoo if configured
        if (odooService) {
          await syncGiftCardToOdoo(odooService, {
            code,
            amount,
            medusaOrderId: order.id,
          })
        }

        // Save code in order metadata for reference
        try {
          const existingGiftCards = ((order.metadata as any)?.gift_cards || []) as any[]
          await orderModuleService.updateOrders([
            {
              id: order.id,
              metadata: {
                ...(order.metadata || {}),
                gift_cards: [
                  ...existingGiftCards,
                  {
                    code,
                    amount,
                    recipient_email: recipientEmail,
                    recipient_name: recipientName,
                    created_at: new Date().toISOString(),
                  },
                ],
              },
            },
          ])
        } catch (updateError) {
          console.warn("[GiftCard] Impossible de sauvegarder le code dans la commande:", updateError)
        }
      } catch (itemError: any) {
        console.error(
          `[GiftCard] Erreur traitement bon cadeau pour item ${item.id}:`,
          itemError.message
        )
      }
    }

    console.log(`[GiftCard] Traitement terminé pour la commande ${order.id}`)
  } catch (error: any) {
    console.error("[GiftCard] Erreur générale:", error.message)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
