import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { NEWSLETTER_MODULE } from "../../../../modules/newsletter"

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params

  try {
    const newsletterService = req.scope.resolve(NEWSLETTER_MODULE) as any
    await newsletterService.updateNewsletterSubscribers({ id }, { status: "unsubscribed" })
    return res.json({ message: "Abonné désabonné avec succès" })
  } catch (err: any) {
    console.error("[Newsletter Admin] Erreur désabonnement:", err.message)
    return res.status(500).json({ message: err.message })
  }
}
