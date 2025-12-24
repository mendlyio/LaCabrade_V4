/**
 * Script pour corriger les prix dans la base de données
 * Divise tous les prix par 100 (car ils ont été multipliés par erreur)
 * 
 * Usage: node fix-prices.js
 */

const { Client } = require('pg')
require('dotenv').config()

async function fixPrices() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  })

  try {
    await client.connect()
    console.log('✅ Connecté à la base de données')

    // 1. Lister les prix actuels
    const currentPrices = await client.query(`
      SELECT 
        pmp.id,
        pmp.variant_id,
        pmp.amount,
        pmp.currency_code,
        pv.sku,
        p.title as product_title
      FROM price_money_amount pmp
      LEFT JOIN product_variant pv ON pv.id = pmp.variant_id
      LEFT JOIN product p ON p.id = pv.product_id
      WHERE pmp.amount >= 100
      ORDER BY pmp.amount DESC
      LIMIT 20
    `)

    console.log(`\n📊 Top 20 des prix actuels (>= 100 centimes):`)
    console.log('─'.repeat(80))
    currentPrices.rows.forEach(row => {
      const displayAmount = (row.amount / 100).toFixed(2)
      const newAmount = Math.round(row.amount / 100)
      const newDisplayAmount = (newAmount / 100).toFixed(2)
      console.log(`SKU: ${row.sku || 'N/A'} | Actuel: ${displayAmount}€ (${row.amount}) → Nouveau: ${newDisplayAmount}€ (${newAmount})`)
    })

    // 2. Demander confirmation
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const answer = await new Promise(resolve => {
      readline.question('\n⚠️  Voulez-vous diviser TOUS les prix par 100 ? (oui/non): ', resolve)
    })
    readline.close()

    if (answer.toLowerCase() !== 'oui') {
      console.log('❌ Opération annulée')
      await client.end()
      return
    }

    // 3. Corriger les prix (diviser par 100)
    console.log('\n🔄 Correction des prix en cours...')
    const result = await client.query(`
      UPDATE price_money_amount
      SET 
        amount = ROUND(amount / 100),
        updated_at = NOW()
      WHERE amount >= 100
      RETURNING id, amount
    `)

    console.log(`✅ ${result.rowCount} prix corrigés !`)

    // 4. Vérifier les nouveaux prix
    const newPrices = await client.query(`
      SELECT 
        pmp.id,
        pmp.variant_id,
        pmp.amount,
        pmp.currency_code,
        pv.sku,
        p.title as product_title
      FROM price_money_amount pmp
      LEFT JOIN product_variant pv ON pv.id = pmp.variant_id
      LEFT JOIN product p ON p.id = pv.product_id
      ORDER BY pmp.amount DESC
      LIMIT 20
    `)

    console.log(`\n📊 Top 20 des prix après correction:`)
    console.log('─'.repeat(80))
    newPrices.rows.forEach(row => {
      const displayAmount = (row.amount / 100).toFixed(2)
      console.log(`SKU: ${row.sku || 'N/A'} | ${displayAmount}€ (${row.amount} centimes)`)
    })

    console.log('\n✅ Correction terminée !')

  } catch (error) {
    console.error('❌ Erreur:', error.message)
    console.error(error.stack)
  } finally {
    await client.end()
  }
}

fixPrices()


