#!/usr/bin/env tsx
/**
 * Script de test d'envoi d'email via Resend
 * Usage: cd backend && npm run email:test
 *
 * En cas d'erreur "Unable to fetch data" avec le SDK, le script tente
 * une requête HTTP directe vers l'API Resend.
 */
import 'dotenv/config'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@sellerie-lacabrade.be'
const TEST_TO = 'info@duplex38.com'

const html = `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #D97706;">Test d'envoi Resend</h2>
  <p>Ceci est un email de test envoyé depuis le backend La Cabrade.</p>
  <p>Si vous recevez ce message, la configuration Resend fonctionne correctement.</p>
  <p style="color: #6b7280; font-size: 12px;">Envoyé le ${new Date().toLocaleString('fr-BE')}</p>
</div>
`

async function sendViaFetch(): Promise<{ id?: string; error?: string }> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: [TEST_TO],
      subject: '[La Cabrade] Test email Resend',
      html,
    }),
  })

  const json = await res.json()
  if (!res.ok) {
    return { error: json.message || json.error || `HTTP ${res.status}` }
  }
  return { id: json.id }
}

async function main() {
  if (!RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY manquante dans .env')
    process.exit(1)
  }

  console.log(`📤 Envoi d'un email test vers ${TEST_TO}...`)
  console.log(`   Depuis: ${RESEND_FROM_EMAIL}`)

  const result = await sendViaFetch()

  if (result.error) {
    console.error('❌ Erreur Resend:', result.error)
    process.exit(1)
  }

  console.log('✅ Email envoyé avec succès!')
  console.log('   ID:', result.id)
  console.log(`   Vérifiez la boîte de réception de ${TEST_TO}`)
}

main()
