import { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createPromotionsWorkflow } from "@medusajs/medusa/core-flows"
import { INotificationModuleService } from "@medusajs/framework/types"
import { NEWSLETTER_MODULE } from "../modules/newsletter"
import { EmailTemplates } from "../modules/email-notifications/templates"
import {
  generatePromoCode,
  buildNewsletterPromotionPayload,
} from "../utils/newsletter-promo"

export default async function sendBirthdayPromosJob(container: MedusaContainer) {
  const today = new Date()
  const mm = String(today.getMonth() + 1).padStart(2, "0")
  const dd = String(today.getDate()).padStart(2, "0")
  const todayMD = `${mm}-${dd}`

  console.log(`[Birthday Job] Vérification des anniversaires du ${todayMD}...`)

  try {
    const newsletterService = container.resolve(NEWSLETTER_MODULE) as any
    const notificationService: INotificationModuleService = container.resolve(Modules.NOTIFICATION)

    const [subscribers] = await newsletterService.listAndCountNewsletterSubscribers(
      { birthday: todayMD, status: "active" },
      { take: 500 }
    )

    if (subscribers.length === 0) {
      console.log("[Birthday Job] Aucun anniversaire aujourd'hui.")
      return
    }

    console.log(`[Birthday Job] ${subscribers.length} anniversaire(s) détecté(s).`)

    for (const subscriber of subscribers) {
      try {
        const promoCode = generatePromoCode("ANNIV")

        // Créer la promotion Medusa (-10%, usage unique)
        // Note: expiresAt calculé pour log/future campagne ; non branché sur Medusa campaign pour l'instant
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7)

        try {
          const createPromotions = createPromotionsWorkflow(container)
          const result = await createPromotions.run({
            input: {
              promotionsData: [buildNewsletterPromotionPayload(promoCode) as any],
            },
          })
          const promotionId = result?.result?.[0]?.id ?? null
          if (!promotionId) {
            throw new Error("Promotion créée sans ID")
          }
          console.log(
            `[Birthday Job] Promotion anniversaire créée: ${promoCode} pour ${subscriber.email} (expire ${expiresAt.toISOString().slice(0, 10)})`
          )
        } catch (promoErr: any) {
          console.error(
            `[Birthday Job] Erreur création promotion pour ${subscriber.email}:`,
            promoErr.message
          )
          // Ne pas envoyer d'email avec un code mort
          continue
        }

        // Mettre à jour le champ birthday_promo_code de l'abonné
        await newsletterService.updateNewsletterSubscribers(
          { id: subscriber.id },
          { birthday_promo_code: promoCode }
        )

        // Envoyer l'email d'anniversaire
        await notificationService.createNotifications({
          to: subscriber.email,
          channel: "email",
          template: EmailTemplates.NEWSLETTER_BIRTHDAY,
          data: {
            email: subscriber.email,
            promoCode,
            preview: `Joyeux anniversaire ! 🎂 Votre cadeau -10% vous attend`,
            emailOptions: {
              subject: "🎂 Joyeux anniversaire ! Votre cadeau La Cabrade",
            },
          },
        } as any)

        console.log(`[Birthday Job] Email anniversaire envoyé à ${subscriber.email} (code: ${promoCode})`)
      } catch (subErr: any) {
        console.error(`[Birthday Job] Erreur pour ${subscriber.email}:`, subErr.message)
      }
    }

    console.log(`[Birthday Job] Terminé. ${subscribers.length} email(s) traité(s).`)
  } catch (err: any) {
    console.error("[Birthday Job] Erreur générale:", err.message)
  }
}

export const config = {
  name: "send-birthday-promos",
  schedule: "0 9 * * *", // Chaque jour à 9h00
}
