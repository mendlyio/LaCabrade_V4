import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { createPromotionsWorkflow } from "@medusajs/medusa/core-flows"
import { INotificationModuleService } from "@medusajs/framework/types"
import { NEWSLETTER_MODULE } from "../../../../modules/newsletter"
import { EmailTemplates } from "../../../../modules/email-notifications/templates"
import {
  generatePromoCode,
  buildNewsletterPromotionPayload,
} from "../../../../utils/newsletter-promo"

/**
 * Régénère un code NL- pour un abonné (promo manquante / déjà utilisée / cassée).
 * POST /admin/newsletter/:id/regenerate-promo
 * Body optionnel: { resend_email?: boolean }
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const { resend_email = true } = (req.body || {}) as { resend_email?: boolean }

  try {
    const newsletterService = req.scope.resolve(NEWSLETTER_MODULE) as any
    const [subscriber] = await newsletterService.listNewsletterSubscribers(
      { id },
      { take: 1 }
    )

    if (!subscriber) {
      return res.status(404).json({ message: "Abonné introuvable" })
    }

    const oldCode = subscriber.promo_code
    const promoCode = generatePromoCode("NL")

    const createPromotions = createPromotionsWorkflow(req.scope)
    const result = await createPromotions.run({
      input: {
        promotionsData: [buildNewsletterPromotionPayload(promoCode) as any],
      },
    })
    const promotionId = result?.result?.[0]?.id ?? null
    if (!promotionId) {
      throw new Error("Promotion créée sans ID")
    }

    // Désactiver l'ancien code s'il existe encore
    if (oldCode) {
      try {
        const promotionModule = req.scope.resolve(Modules.PROMOTION) as any
        const [oldPromo] = await promotionModule.listPromotions(
          { code: oldCode },
          { take: 1 }
        )
        if (oldPromo?.id) {
          await promotionModule.updatePromotions([
            { id: oldPromo.id, status: "inactive" },
          ])
          console.log(`[Newsletter Admin] Ancien code ${oldCode} désactivé`)
        }
      } catch (e: any) {
        console.warn(
          `[Newsletter Admin] Impossible de désactiver ${oldCode}:`,
          e.message
        )
      }
    }

    await newsletterService.updateNewsletterSubscribers(
      { id: subscriber.id },
      { promo_code: promoCode }
    )

    if (resend_email) {
      try {
        const notificationService: INotificationModuleService = req.scope.resolve(
          Modules.NOTIFICATION
        )
        await notificationService.createNotifications({
          to: subscriber.email,
          channel: "email",
          template: EmailTemplates.NEWSLETTER_WELCOME,
          data: {
            email: subscriber.email,
            promoCode,
            preview: `Votre nouveau code -10% est arrivé ! 🎁`,
            emailOptions: {
              subject: "🎁 Votre nouveau code -10% La Cabrade",
            },
          },
        } as any)
      } catch (emailErr: any) {
        console.error(
          "[Newsletter Admin] Erreur renvoi email:",
          emailErr.message
        )
      }
    }

    console.log(
      `[Newsletter Admin] Code régénéré pour ${subscriber.email}: ${oldCode} → ${promoCode}`
    )

    return res.json({
      message: "Code promo régénéré",
      email: subscriber.email,
      old_promo_code: oldCode,
      promo_code: promoCode,
      promotion_id: promotionId,
      email_resent: !!resend_email,
    })
  } catch (err: any) {
    console.error("[Newsletter Admin] Erreur régénération:", err.message)
    return res.status(500).json({ message: err.message })
  }
}
