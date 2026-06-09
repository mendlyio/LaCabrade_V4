import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { GIFT_CARD_TRACKING_MODULE } from "../../../../../modules/gift-card-tracking/constants"
import { generateGiftCardPDF } from "../../../../../utils/generate-gift-card-pdf"

/**
 * GET /admin/gift-cards/:id/pdf
 *
 * Régénère et renvoie le PDF du bon cadeau (à partir des données stockées dans
 * gift_card_tracking) pour téléchargement depuis le backoffice.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const giftCardService = req.scope.resolve(GIFT_CARD_TRACKING_MODULE) as any
    const { id } = req.params

    const gc = await giftCardService.retrieveGiftCard(id)
    if (!gc) {
      return res.status(404).json({ message: "Bon cadeau introuvable" })
    }

    const code = gc.code
    const amount = Number(gc.original_amount)
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

    res.setHeader("Content-Type", "application/pdf")
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="bon-cadeau-lacabrade-${code}.pdf"`
    )
    res.setHeader("Content-Length", String(pdfBuffer.length))
    return res.status(200).send(Buffer.from(pdfBuffer))
  } catch (error: any) {
    console.error("[GiftCard Admin] Error generating PDF:", error.message)
    return res.status(500).json({ message: error.message })
  }
}
