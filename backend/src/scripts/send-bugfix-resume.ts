/**
 * Reprend l'envoi bugfix en excluant les 12 déjà envoyés.
 * Batch de 5, pause de 30 secondes entre chaque.
 */

import 'dotenv/config'
import pg from 'pg'
import { Resend } from 'resend'
import * as React from 'react'
import { renderAsync } from '@react-email/render'

const BATCH_SIZE = 5
const BATCH_INTERVAL_MS = 30_000 // 30 secondes

const ALREADY_SENT = new Set([
  'info@duplex38.com',
  'elethom@hotmail.de',
  'sophie.goor14@gmail.com',
  'roromisy@gmail.com',
  'elisaparmentier1@gmail.com',
  'lynebrandt@gmail.com',
  'lauralibert@hotmail.com',
  'cdnails99@gmail.com',
  'audrey.mossiat@hotmail.com',
  'veronique.babaja@live.be',
  'digiflavie23@icloud.com',
  'mazana66@yahoo.fr',
])

const RESEND_API_KEY = process.env.RESEND_API_KEY!
const RESEND_FROM = process.env.RESEND_FROM_EMAIL || 'noreply@sellerie-lacabrade.be'

async function main() {
  console.log('\n🚀 Reprise envoi bugfix (30s entre batchs)\n')

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL! })
  await client.connect()
  const result = await client.query(
    `SELECT email, promo_code FROM newsletter_subscribers
     WHERE status = 'active' AND promo_code IS NOT NULL AND promo_code != ''
     ORDER BY id`
  )
  await client.end()

  const remaining = (result.rows as Array<{ email: string; promo_code: string }>)
    .filter(s => !ALREADY_SENT.has(s.email))

  console.log(`📋 ${remaining.length} abonné(s) restants\n`)

  const { NewsletterBugfixReminderTemplate } = await import(
    '../modules/email-notifications/templates/newsletter-bugfix-reminder.js'
  )
  const resend = new Resend(RESEND_API_KEY)

  const totalBatches = Math.ceil(remaining.length / BATCH_SIZE)
  let sent = 0, errors = 0

  for (let i = 0; i < totalBatches; i++) {
    const batch = remaining.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    console.log(`── Batch ${i + 1}/${totalBatches} ──`)

    for (const sub of batch) {
      try {
        const html = await renderAsync(
          React.createElement(NewsletterBugfixReminderTemplate, {
            email: sub.email,
            promoCode: sub.promo_code,
          })
        )
        const r = await resend.emails.send({
          from: RESEND_FROM,
          to: sub.email,
          subject: 'Bonne nouvelle + votre code promo -10% 🎁',
          html,
        })
        if (r.error) {
          console.log(`  ❌ ${sub.email} → ${r.error.message}`)
          errors++
        } else {
          console.log(`  ✅ ${sub.email} → code ${sub.promo_code}`)
          sent++
        }
      } catch (err: any) {
        console.log(`  ❌ ${sub.email} → ${err.message}`)
        errors++
      }
    }

    if (i < totalBatches - 1) {
      console.log(`  ⏳ Pause 30s...\n`)
      await new Promise(r => setTimeout(r, BATCH_INTERVAL_MS))
    }
  }

  console.log(`\n${'═'.repeat(50)}`)
  console.log(`✅ Terminé : ${sent} envoyé(s), ${errors} erreur(s) sur ${remaining.length}`)
  console.log(`${'═'.repeat(50)}\n`)
}

main().catch(console.error)
