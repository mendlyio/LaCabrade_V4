/**
 * Répare les codes newsletter NL- orphelins / incomplets.
 *
 * Pour chaque abonné actif dont le promo_code n'existe pas dans Medusa,
 * ou dont la promotion items n'a pas d'allocation, crée une nouvelle promo
 * correctement configurée (allocation: each) et met à jour l'abonné.
 *
 * Usage (prod Railway):
 *   npx medusa exec ./src/scripts/repair-newsletter-promos.ts
 *
 * Options via env:
 *   DRY_RUN=1          — log seulement, pas d'écriture
 *   RESEND_EMAIL=1     — renvoie l'email de bienvenue avec le nouveau code
 *   LIMIT=50           — max d'abonnés à traiter
 *   EMAIL=foo@bar.com  — ne traiter qu'un email
 */
import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createPromotionsWorkflow } from "@medusajs/medusa/core-flows"
import { NEWSLETTER_MODULE } from "../modules/newsletter"
import { EmailTemplates } from "../modules/email-notifications/templates"
import {
  generatePromoCode,
  buildNewsletterPromotionPayload,
} from "../utils/newsletter-promo"

export default async function repairNewsletterPromos({ container }: ExecArgs) {
  const dryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true"
  const resendEmail =
    process.env.RESEND_EMAIL === "1" || process.env.RESEND_EMAIL === "true"
  const limit = Math.min(parseInt(process.env.LIMIT || "200", 10) || 200, 1000)
  const onlyEmail = (process.env.EMAIL || "").trim().toLowerCase() || null

  const logger = console
  logger.log(
    `[Repair NL] Démarrage (dryRun=${dryRun}, resendEmail=${resendEmail}, limit=${limit}${onlyEmail ? `, email=${onlyEmail}` : ""})`
  )

  const newsletterService = container.resolve(NEWSLETTER_MODULE) as any
  const promotionModule = container.resolve(Modules.PROMOTION) as any
  const notificationService = container.resolve(Modules.NOTIFICATION) as any

  const filters: Record<string, any> = { status: "active" }
  if (onlyEmail) filters.email = onlyEmail

  const [subscribers] = await newsletterService.listAndCountNewsletterSubscribers(
    filters,
    { take: limit, order: { created_at: "DESC" } }
  )

  logger.log(`[Repair NL] ${subscribers.length} abonné(s) à analyser`)

  let fixed = 0
  let ok = 0
  let skipped = 0
  let errors = 0

  for (const sub of subscribers) {
    const code = sub.promo_code as string | null
    if (!code) {
      logger.log(`  ⏭  ${sub.email} — pas de promo_code`)
      skipped++
      continue
    }

    try {
      const [promo] = await promotionModule.listPromotions(
        { code },
        { take: 1 },
        // relations pour inspection allocation
      )

      let needsRepair = false
      let reason = ""

      if (!promo) {
        needsRepair = true
        reason = "promo absente de Medusa"
      } else if (promo.status !== "active") {
        needsRepair = true
        reason = `status=${promo.status}`
      } else {
        // Récupérer application_method si disponible
        let method: any = promo.application_method
        if (!method && promo.id) {
          try {
            const full = await promotionModule.retrievePromotion(promo.id, {
              relations: ["application_method"],
            })
            method = full?.application_method
          } catch {
            // ignore
          }
        }
        if (method?.target_type === "items" && !method?.allocation) {
          needsRepair = true
          reason = "items sans allocation"
        } else if (
          promo.usage_limit != null &&
          promo.usage_count != null &&
          promo.usage_count >= promo.usage_limit
        ) {
          needsRepair = true
          reason = `usage épuisé (${promo.usage_count}/${promo.usage_limit})`
        }
      }

      if (!needsRepair) {
        ok++
        continue
      }

      logger.log(`  🔧 ${sub.email} — ${code} → ${reason}`)

      if (dryRun) {
        fixed++
        continue
      }

      const newCode = generatePromoCode("NL")
      const createPromotions = createPromotionsWorkflow(container)
      const result = await createPromotions.run({
        input: {
          promotionsData: [buildNewsletterPromotionPayload(newCode) as any],
        },
      })
      const promotionId = result?.result?.[0]?.id
      if (!promotionId) {
        throw new Error("création sans ID")
      }

      if (promo?.id) {
        try {
          await promotionModule.updatePromotions([
            { id: promo.id, status: "inactive" },
          ])
        } catch (e: any) {
          logger.warn(`     ⚠️  désactivation ${code}: ${e.message}`)
        }
      }

      await newsletterService.updateNewsletterSubscribers(
        { id: sub.id },
        { promo_code: newCode }
      )

      if (resendEmail) {
        try {
          await notificationService.createNotifications({
            to: sub.email,
            channel: "email",
            template: EmailTemplates.NEWSLETTER_WELCOME,
            data: {
              email: sub.email,
              promoCode: newCode,
              preview: `Votre nouveau code -10% est arrivé ! 🎁`,
              emailOptions: {
                subject: "🎁 Votre nouveau code -10% La Cabrade",
              },
            },
          } as any)
        } catch (e: any) {
          logger.warn(`     ⚠️  email ${sub.email}: ${e.message}`)
        }
      }

      logger.log(`     ✅ ${code} → ${newCode} (${promotionId})`)
      fixed++
    } catch (e: any) {
      errors++
      logger.error(`  ❌ ${sub.email}: ${e.message}`)
    }
  }

  logger.log(
    `[Repair NL] Terminé — ok=${ok} fixed=${fixed} skipped=${skipped} errors=${errors}${dryRun ? " (DRY RUN)" : ""}`
  )
}
