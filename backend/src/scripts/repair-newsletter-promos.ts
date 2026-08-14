/**
 * Répare les codes newsletter NL-/ANNIV- orphelins ou mal configurés.
 *
 * Usage prod:
 *   npx medusa exec ./src/scripts/repair-newsletter-promos.ts
 *
 * Env:
 *   DRY_RUN=1
 *   RESEND_EMAIL=1
 *   LIMIT=200
 *   EMAIL=foo@bar.com
 */
import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { NEWSLETTER_MODULE } from "../modules/newsletter"
import { EmailTemplates } from "../modules/email-notifications/templates"
import { ensureNewsletterPromotionUsable } from "../utils/newsletter-promo"

export default async function repairNewsletterPromos({ container }: ExecArgs) {
  const dryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true"
  const resendEmail =
    process.env.RESEND_EMAIL === "1" || process.env.RESEND_EMAIL === "true"
  const limit = Math.min(parseInt(process.env.LIMIT || "500", 10) || 500, 2000)
  const onlyEmail = (process.env.EMAIL || "").trim().toLowerCase() || null

  console.log(
    `[Repair NL] dryRun=${dryRun} resendEmail=${resendEmail} limit=${limit}${onlyEmail ? ` email=${onlyEmail}` : ""}`
  )

  const newsletterService = container.resolve(NEWSLETTER_MODULE) as any
  const notificationService = container.resolve(Modules.NOTIFICATION) as any
  const promotionModule = container.resolve(Modules.PROMOTION) as any

  // 1) Corriger allocation NULL en masse via list + update
  const [allNl] = await promotionModule.listAndCountPromotions(
    {},
    { take: 2000 }
  ).catch(() => [[], 0])

  let allocationFixed = 0
  for (const p of allNl || []) {
    const code = p.code || ""
    if (!code.startsWith("NL-") && !code.startsWith("ANNIV-")) continue
    try {
      if (dryRun) {
        allocationFixed++
        continue
      }
      const result = await ensureNewsletterPromotionUsable(container, code)
      if (result.repaired) allocationFixed++
    } catch (e: any) {
      console.warn(`  ⚠️  ${code}: ${e.message}`)
    }
  }
  console.log(`[Repair NL] allocation/recreate traités: ${allocationFixed}`)

  // 2) Abonnés actifs
  const filters: Record<string, any> = { status: "active" }
  if (onlyEmail) filters.email = onlyEmail

  const [subscribers] = await newsletterService.listAndCountNewsletterSubscribers(
    filters,
    { take: limit, order: { created_at: "DESC" } }
  )

  let fixed = 0
  let ok = 0
  let errors = 0

  for (const sub of subscribers) {
    try {
      if (!sub.promo_code) {
        ok++
        continue
      }
      if (dryRun) {
        fixed++
        continue
      }
      const result = await ensureNewsletterPromotionUsable(
        container,
        sub.promo_code
      )
      if (result.code !== sub.promo_code) {
        await newsletterService.updateNewsletterSubscribers(
          { id: sub.id },
          { promo_code: result.code }
        )
      }
      if (result.repaired || result.created) {
        fixed++
        if (resendEmail) {
          try {
            await notificationService.createNotifications({
              to: sub.email,
              channel: "email",
              template: EmailTemplates.NEWSLETTER_WELCOME,
              data: {
                email: sub.email,
                promoCode: result.code,
                preview: `Votre code -10% est arrivé ! 🎁`,
                emailOptions: {
                  subject: "🎁 Votre code -10% La Cabrade (mis à jour)",
                },
              },
            } as any)
          } catch (e: any) {
            console.warn(`  ⚠️  email ${sub.email}: ${e.message}`)
          }
        }
        console.log(`  ✅ ${sub.email}: ${sub.promo_code} → ${result.code}`)
      } else {
        ok++
      }
    } catch (e: any) {
      errors++
      console.error(`  ❌ ${sub.email}: ${e.message}`)
    }
  }

  console.log(
    `[Repair NL] Terminé — ok=${ok} fixed=${fixed} errors=${errors}${dryRun ? " (DRY RUN)" : ""}`
  )
}
