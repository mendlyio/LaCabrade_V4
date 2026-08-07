import type { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { createPromotionsWorkflow } from "@medusajs/medusa/core-flows"
import { INotificationModuleService } from "@medusajs/framework/types"
import { NEWSLETTER_MODULE } from "../../../modules/newsletter"
import { EmailTemplates } from "../../../modules/email-notifications/templates"
import {
  generatePromoCode,
  buildNewsletterPromotionPayload,
} from "../../../utils/newsletter-promo"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { email, birthday, website } = req.body as {
    email?: string
    birthday?: string
    website?: string
  }

  // Honeypot : succès silencieux si le champ caché est rempli (bot détecté)
  if (website) {
    return res.status(201).json({
      message: "Inscription réussie ! Vérifiez votre boîte email pour votre code -10%.",
    })
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "Adresse email invalide" })
  }

  // birthday format: YYYY-MM-DD (on ne garde que MM-DD)
  let birthdayMD: string | null = null
  if (birthday) {
    const match = birthday.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (match) {
      birthdayMD = `${match[2]}-${match[3]}`
    }
  }

  try {
    const newsletterService = req.scope.resolve(NEWSLETTER_MODULE) as any

    // Vérifier si l'email existe déjà
    const [existing] = await newsletterService.listNewsletterSubscribers(
      { email },
      { take: 1 }
    )

    if (existing) {
      return res.status(200).json({
        message: "Vous êtes déjà inscrit(e) à notre newsletter.",
        already_subscribed: true,
        promo_code: existing.promo_code,
      })
    }

    // Générer un code promo unique
    const promoCode = generatePromoCode("NL")

    // Créer la promotion Medusa (-10%, usage unique) — obligatoire avant l'email
    let promotionId: string | null = null
    try {
      const createPromotions = createPromotionsWorkflow(req.scope)
      const result = await createPromotions.run({
        input: {
          promotionsData: [buildNewsletterPromotionPayload(promoCode) as any],
        },
      })
      promotionId = result?.result?.[0]?.id ?? null
      if (!promotionId) {
        throw new Error("Promotion créée sans ID")
      }
      console.log(`[Newsletter] Promotion créée: ${promoCode} (ID: ${promotionId})`)
    } catch (promoErr: any) {
      console.error("[Newsletter] Erreur création promotion:", promoErr.message)
      return res.status(500).json({
        message:
          "Impossible de générer votre code promo pour le moment. Réessayez dans quelques minutes.",
        error: promoErr.message,
      })
    }

    // Sauvegarder l'abonné
    const subscriber = await newsletterService.createNewsletterSubscribers({
      email,
      birthday: birthdayMD,
      promo_code: promoCode,
      status: "active",
    })

    // Envoyer l'email de bienvenue avec le code promo
    try {
      const notificationService: INotificationModuleService = req.scope.resolve(
        Modules.NOTIFICATION
      )
      await notificationService.createNotifications({
        to: email,
        channel: "email",
        template: EmailTemplates.NEWSLETTER_WELCOME,
        data: {
          email,
          promoCode,
          preview: `Votre code -10% est arrivé ! 🎁`,
          emailOptions: {
            subject: "🎁 Votre code -10% La Cabrade vous attend",
          },
        },
      } as any)
      console.log(`[Newsletter] Email de bienvenue envoyé à ${email}`)
    } catch (emailErr: any) {
      console.error("[Newsletter] Erreur envoi email:", emailErr.message)
      // L'abonné et la promo existent : on confirme quand même (code visible en réponse)
    }

    return res.status(201).json({
      message: "Inscription réussie ! Vérifiez votre boîte email pour votre code -10%.",
      promo_code: promoCode,
      subscriber: {
        id: subscriber.id,
        email: subscriber.email,
        birthday: subscriber.birthday,
        status: subscriber.status,
      },
    })
  } catch (err: any) {
    console.error("[Newsletter] Erreur:", err.message)
    return res.status(500).json({ message: "Erreur lors de l'inscription", error: err.message })
  }
}
