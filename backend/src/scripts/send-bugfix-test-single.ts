/**
 * Envoie un email de test bugfix à UN seul destinataire.
 * Usage : cd backend && npx tsx src/scripts/send-bugfix-test-single.ts
 */

import 'dotenv/config'
import pg from 'pg'
import { Resend } from 'resend'
import * as React from 'react'
import { renderAsync } from '@react-email/render'

const TARGET_EMAIL = 'info@duplex38.com'
const RESEND_API_KEY = process.env.RESEND_API_KEY!
const RESEND_FROM = process.env.RESEND_FROM_EMAIL || 'noreply@sellerie-lacabrade.be'
const DATABASE_URL = process.env.DATABASE_URL!

async function main() {
  console.log(`\n📧 Envoi test bugfix → ${TARGET_EMAIL}\n`)

  const client = new pg.Client({ connectionString: DATABASE_URL })
  await client.connect()

  const result = await client.query(
    `SELECT email, promo_code FROM newsletter_subscribers WHERE email = $1 AND status = 'active'`,
    [TARGET_EMAIL]
  )
  await client.end()

  if (result.rows.length === 0) {
    console.log(`❌ Aucun abonné actif trouvé pour ${TARGET_EMAIL}`)
    return
  }

  const sub = result.rows[0] as { email: string; promo_code: string }
  console.log(`✅ Trouvé : ${sub.email} → code ${sub.promo_code}`)

  const { NewsletterBugfixReminderTemplate } = await import(
    '../modules/email-notifications/templates/newsletter-bugfix-reminder.js'
  )

  const html = await renderAsync(
    React.createElement(NewsletterBugfixReminderTemplate, {
      email: sub.email,
      promoCode: sub.promo_code,
    })
  )

  const resend = new Resend(RESEND_API_KEY)
  const sendResult = await resend.emails.send({
    from: RESEND_FROM,
    to: sub.email,
    subject: 'Bonne nouvelle + votre code promo -10% 🎁',
    html,
  })

  if (sendResult.error) {
    console.log(`❌ Erreur envoi : ${sendResult.error.message}`)
  } else {
    console.log(`✅ Email envoyé ! (ID: ${sendResult.data?.id})`)
  }
}

main().catch(console.error)
