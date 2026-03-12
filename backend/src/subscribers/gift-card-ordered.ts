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

/**
 * Subscriber qui gère la livraison des bons cadeaux après une commande.
 *
 * Déclenché sur `order.placed`, il :
 * 1. Détecte les items "Gift Card" via la metadata `is_gift_card`
 * 2. Génère un code unique pour chaque bon cadeau
 * 3. Crée une promotion Medusa (utilisable comme code au checkout)
 * 4. Génère un PDF avec le design La Cabrade
 * 5. Envoie un email au destinataire avec le PDF en pièce jointe
 * 6. Synchronise le bon cadeau vers Odoo (si configuré)
 */
export default async function giftCardOrderedHandler({
  event: { data },
  container,
}: SubscriberArgs<any>) {
  const orderModuleService: IOrderModuleService = container.resolve(Modules.ORDER)
  const notificationModuleService: INotificationModuleService = container.resolve(
    Modules.NOTIFICATION
  )

  try {
    const order = await orderModuleService.retrieveOrder(data.id, {
      relations: ["items", "shipping_address"],
    })

    // Filtrer les items qui sont des bons cadeaux
    const giftCardItems = order.items.filter(
      (item: any) => item.metadata?.is_gift_card === true
    )

    if (giftCardItems.length === 0) {
      return // Pas de bon cadeau dans cette commande
    }

    console.log(
      `[GiftCard] 🎁 ${giftCardItems.length} bon(s) cadeau(x) détecté(s) dans la commande ${order.id}`
    )

    // Récupérer le nom de l'expéditeur
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
      // Fallback: utiliser les infos de base
      if ((order.shipping_address as any)?.first_name) {
        senderName = `${(order.shipping_address as any).first_name} ${(order.shipping_address as any).last_name || ""}`.trim()
      }
    }

    // Résoudre le service Odoo (optionnel)
    let odooService: OdooModuleService | null = null
    try {
      odooService = container.resolve(ODOO_MODULE)
    } catch (e) {
      console.log("[GiftCard] ℹ️ Module Odoo non configuré, pas de sync.")
    }

    // Traiter chaque bon cadeau
    for (const item of giftCardItems) {
      try {
        const metadata = item.metadata as Record<string, any>
        const recipientEmail = metadata.recipient_email
        const recipientName = metadata.recipient_name || "Cher(e) destinataire"
        const giftMessage = metadata.gift_message || ""
        const amount = Number(item.unit_price) / 100 // Convertir de centimes en euros

        // 1. Générer un code unique
        const code = generateGiftCardCode()
        console.log(`[GiftCard] 🔑 Code généré: ${code} (${amount}€ pour ${recipientEmail})`)

        // 2. Créer une promotion Medusa pour que le code soit utilisable au checkout
        const amountInCents = Math.round(amount * 100)
        try {
          const createPromotions = createPromotionsWorkflow(container)
          await createPromotions.run({
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
                      limit: amountInCents,
                      currency_code: "eur",
                    },
                  },
                  application_method: {
                    type: "fixed",
                    target_type: "items",
                    allocation: "across",
                    value: amountInCents,
                    currency_code: "eur",
                  },
                },
              ],
            },
          })
          console.log(`[GiftCard] ✅ Promotion créée pour le code ${code} (${amount}€)`)
        } catch (promoError: any) {
          console.error(
            `[GiftCard] ❌ Erreur création promotion pour ${code}:`,
            promoError.message
          )
          // On continue quand même : le code est dans order.metadata, le destinataire reçoit l'email
        }

        // 3. Générer le PDF
        const pdfBuffer = await generateGiftCardPDF({
          code,
          amount,
          recipientName,
          message: giftMessage,
          senderName,
        })
        console.log(`[GiftCard] 📄 PDF généré (${pdfBuffer.length} bytes)`)

        // 4. Envoyer l'email au destinataire avec le PDF en PJ
        try {
          await notificationModuleService.createNotifications({
            to: recipientEmail,
            channel: "email",
            template: EmailTemplates.GIFT_CARD_DELIVERY,
            data: {
              emailOptions: {
                replyTo: "contact@sellerie-lacabrade.be",
                subject: `🎁 Vous avez reçu un Bon Cadeau La Cabrade de ${amount}€ !`,
                attachments: [
                  {
                    content: Buffer.from(pdfBuffer).toString("base64"),
                    filename: `bon-cadeau-lacabrade-${code}.pdf`,
                    content_type: "application/pdf",
                    disposition: "attachment",
                  },
                ],
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
            `[GiftCard] ✅ Email envoyé à ${recipientEmail} avec le bon cadeau ${code}`
          )
        } catch (emailError: any) {
          console.error(
            `[GiftCard] ❌ Erreur d'envoi email pour ${code}:`,
            emailError.message
          )
        }

        // 5. Synchroniser vers Odoo (si configuré)
        if (odooService) {
          await syncGiftCardToOdoo(odooService, {
            code,
            amount,
            medusaOrderId: order.id,
          })
        }

        // 6. Sauvegarder le code dans les metadata de la commande pour référence
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
          console.warn("[GiftCard] ⚠️ Impossible de sauvegarder le code dans la commande:", updateError)
        }
      } catch (itemError: any) {
        console.error(
          `[GiftCard] ❌ Erreur traitement bon cadeau pour item ${item.id}:`,
          itemError.message
        )
        // Continuer avec les autres items
      }
    }

    console.log(`[GiftCard] ✅ Traitement terminé pour la commande ${order.id}`)
  } catch (error: any) {
    console.error("[GiftCard] ❌ Erreur générale:", error.message)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
