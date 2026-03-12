#!/usr/bin/env node
/**
 * Vérifie le format des prix (euros vs centimes) en DB et via l'API Store.
 * Usage: node verify-prices.js
 */

require('dotenv').config()
const { Client } = require('pg')

const BACKEND_URL = process.env.BACKEND_PUBLIC_URL || 'https://backend-production-7bbb.up.railway.app'

async function checkDb() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : undefined
  })

  try {
    await client.connect()
    console.log('✅ Connecté à la base\n')

    const { rows } = await client.query(`
      SELECT 
        pv.sku,
        p2.title as product_title,
        p2.handle,
        pr.amount as raw_amount,
        pr.currency_code
      FROM product_variant pv
      LEFT JOIN product p2 ON p2.id = pv.product_id
      LEFT JOIN product_variant_price_set pvps ON pvps.variant_id = pv.id
      LEFT JOIN price pr ON pr.price_set_id = pvps.price_set_id AND pr.currency_code = 'eur'
      WHERE pv.deleted_at IS NULL AND pr.amount IS NOT NULL
      ORDER BY pr.amount DESC
      LIMIT 15
    `)

    console.log('📋 Prix en base (raw amount):')
    console.log('─'.repeat(90))
    console.log('SKU'.padEnd(12), 'Produit'.padEnd(35), 'Raw amount'.padEnd(12), 'Si euros'.padEnd(12), 'Si centimes')
    console.log('─'.repeat(90))

    rows.forEach(row => {
      const raw = Number(row.raw_amount)
      const asEuros = raw
      const asCentimes = (raw / 100).toFixed(2)
      console.log(
        (row.sku || 'N/A').padEnd(12),
        (row.product_title || '').substring(0, 33).padEnd(35),
        raw.toString().padEnd(12),
        `${asEuros}€`.padEnd(12),
        `${asCentimes}€`
      )
    })

    console.log('\n💡 Interprétation:')
    const sample = rows[0]
    if (sample) {
      const raw = Number(sample.raw_amount)
      const isLikelyEuros = raw < 10000 && (raw % 1 !== 0 || raw < 1000)
      console.log(`   - Exemple: ${sample.product_title} = ${raw}`)
      console.log(`   - Si EUROS (Odoo): affichage = ${raw}€`)
      console.log(`   - Si CENTIMES: affichage = ${(raw/100).toFixed(2)}€`)
      console.log(`   - Format probable: ${isLikelyEuros ? 'EUROS' : 'CENTIMES'}`)
    }

    await client.end()
  } catch (err) {
    console.error('❌ DB:', err.message)
  }
}

async function checkStoreApi() {
  console.log('\n🔗 API Store (produits):')
  try {
    const res = await fetch(`${BACKEND_URL}/store/products?limit=3`)
    if (!res.ok) throw new Error(res.status)
    const data = await res.json()
    const products = data.products || data

    if (!products?.length) {
      console.log('   Aucun produit trouvé')
      return
    }

    products.slice(0, 3).forEach(p => {
      const v = p.variants?.[0]
      const cp = v?.calculated_price
      const amount = cp?.calculated_amount ?? cp?.original_amount ?? v?.prices?.[0]?.amount
      console.log(`   - ${p.title}: amount=${amount}`)
    })
  } catch (err) {
    console.log('   ⚠️ API inaccessible:', err.message)
  }
}

async function main() {
  console.log('🔍 Vérification des prix Medusa/Odoo\n')
  await checkDb()
  await checkStoreApi()
  console.log('\n✅ Done')
}

main()
