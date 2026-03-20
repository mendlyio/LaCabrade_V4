/**
 * Envoie un email de rappel aux abonnés newsletter ayant un code promo.
 * Informe de la correction du bug de paiement + rappelle leur code -10%.
 *
 * Envoi par batch de 5 emails toutes les 5 minutes pour éviter le spam.
 * À exécuter UNE SEULE FOIS.
 *
 * Usage :
 *   cd backend && npx tsx src/scripts/send-bugfix-reminder.ts
 *
 * Mode dry-run (sans envoyer) :
 *   cd backend && DRY_RUN=1 npx tsx src/scripts/send-bugfix-reminder.ts
 */

import 'dotenv/config'
import { Resend } from 'resend'
import * as React from 'react'
import { renderAsync } from '@react-email/render'

const BATCH_SIZE = 5
const BATCH_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
const DRY_RUN = process.env.DRY_RUN === '1'

const RESEND_API_KEY = process.env.RESEND_API_KEY!
const RESEND_FROM = process.env.RESEND_FROM_EMAIL || 'noreply@sellerie-lacabrade.be'
const DATABASE_URL = process.env.DATABASE_URL!

if (!RESEND_API_KEY || !DATABASE_URL) {
  console.error('❌ RESEND_API_KEY et DATABASE_URL sont requis dans le .env')
  process.exit(1)
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════╗')
  console.log('║  ENVOI RAPPEL BUGFIX — Newsletter La Cabrade     ║')
  console.log('╚══════════════════════════════════════════════════╝\n')

  if (DRY_RUN) {
    console.log('🔸 MODE DRY-RUN : aucun email ne sera envoyé\n')
  }

  // 1. Connexion à la DB pour récupérer les abonnés
  const { default: pg } = await import('pg')
  const client = new pg.Client({ connectionString: DATABASE_URL })
  await client.connect()

  const result = await client.query(
    `SELECT id, email, promo_code
     FROM newsletter_subscribers
     WHERE status = 'active'
       AND promo_code IS NOT NULL
       AND promo_code != ''
     ORDER BY id`
  )

  const subscribers = result.rows as Array<{ id: string; email: string; promo_code: string }>
  await client.end()

  console.log(`📋 ${subscribers.length} abonné(s) avec code promo actif trouvé(s)\n`)

  if (subscribers.length === 0) {
    console.log('Rien à envoyer.')
    return
  }

  // 2. Import du template
  const { NewsletterBugfixReminderTemplate } = await import(
    '../modules/email-notifications/templates/newsletter-bugfix-reminder.js'
  )

  const resend = new Resend(RESEND_API_KEY)

  // 3. Envoi par batch
  const totalBatches = Math.ceil(subscribers.length / BATCH_SIZE)
  let sent = 0
  let errors = 0

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const batch = subscribers.slice(batchIdx * BATCH_SIZE, (batchIdx + 1) * BATCH_SIZE)
    const batchNum = batchIdx + 1

    console.log(`\n── Batch ${batchNum}/${totalBatches} (${batch.length} email(s)) ──`)

    for (const sub of batch) {
      try {
        const html = await renderAsync(
          React.createElement(NewsletterBugfixReminderTemplate, {
            email: sub.email,
            promoCode: sub.promo_code,
          })
        )

        if (DRY_RUN) {
          console.log(`  🔸 [DRY] ${sub.email} → code ${sub.promo_code}`)
        } else {
          const result = await resend.emails.send({
            from: RESEND_FROM,
            to: sub.email,
            subject: 'Bonne nouvelle + votre code promo -10% 🎁',
            html,
          })

          if (result.error) {
            console.log(`  ❌ ${sub.email} → ${result.error.message}`)
            errors++
          } else {
            console.log(`  ✅ ${sub.email} → code ${sub.promo_code} (ID: ${result.data?.id})`)
            sent++
          }
        }
      } catch (err: any) {
        console.log(`  ❌ ${sub.email} → ${err.message}`)
        errors++
      }
    }

    if (DRY_RUN) {
      sent += batch.length
    }

    // Pause entre les batchs (sauf le dernier)
    if (batchIdx < totalBatches - 1) {
      const minutes = BATCH_INTERVAL_MS / 60000
      console.log(`\n  ⏳ Pause de ${minutes} minutes avant le batch suivant...`)
      if (!DRY_RUN) {
        await sleep(BATCH_INTERVAL_MS)
      } else {
        console.log('  🔸 [DRY] Pause ignorée')
      }
    }
  }

  // 4. Résumé
  console.log('\n══════════════════════════════════════════════════')
  console.log(`✅ Terminé : ${sent} envoyé(s), ${errors} erreur(s) sur ${subscribers.length} abonné(s)`)
  if (DRY_RUN) {
    console.log('🔸 Mode DRY-RUN — aucun email réellement envoyé')
    console.log('   Pour envoyer : npx tsx src/scripts/send-bugfix-reminder.ts')
  }
  console.log('══════════════════════════════════════════════════\n')
}

main().catch((err) => {
  console.error('❌ Erreur fatale:', err)
  process.exit(1)
})
