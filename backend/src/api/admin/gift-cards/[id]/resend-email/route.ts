import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { INotificationModuleService } from "@medusajs/framework/types"
import { GIFT_CARD_TRACKING_MODULE } from "../../../../../modules/gift-card-tracking/constants"
import { EmailTemplates } from "../../../../../modules/email-notifications/templates"
import { generateGiftCardPDF } from "../../../../../utils/generate-gift-card-pdf"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const giftCardService = req.scope.resolve(GIFT_CARD_TRACKING_MODULE) as any
    const notificationModuleService: INotificationModuleService = req.scope.resolve(
      Modules.NOTIFICATION
    )
    const { id } = req.params

    const gc = await giftCardService.retrieveGiftCard(id)

    if (!gc) {
      return res.status(404).json({ message: "Bon cadeau introuvable" })
    }

    const code = gc.code
    const amount = Number(gc.original_amount)
    const recipientEmail = gc.recipient_email
    const recipientName = gc.recipient_name || "Cher(e) destinataire"
    const senderName = gc.sender_name || "Un(e) ami(e)"
    const giftMessage = gc.message || ""

    const pdfBuffer = await generateGiftCardPDF({
      code,
      amount,
      recipientName,
      message: giftMessage,
      senderName,
    })

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

    return res.json({
      success: true,
      message: `Email renvoyé avec succès à ${recipientEmail}`,
      gift_card: {
        id: gc.id,
        code,
        recipient_email: recipientEmail,
        recipient_name: recipientName,
      },
    })
  } catch (error: any) {
    console.error("[GiftCard Admin] Error resending gift card email:", error.message)
    return res.status(500).json({ message: error.message })
  }
}
