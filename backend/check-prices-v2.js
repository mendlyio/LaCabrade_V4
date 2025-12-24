/**
 * Script pour vérifier l'état des prix (Medusa v2)
 */

const { Client } = require('pg')

async function checkPrices() {
  const client = new Client({
    connectionString: "postgresql://postgres:YIKujyFPHKidnMJIKJpXVpwyvRYCxCVV@shuttle.proxy.rlwy.net:52325/railway",
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('✅ Connecté à la base Railway\n')

    // 1. Structure de la table price
    const priceStructure = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'price'
      ORDER BY ordinal_position
    `)

    console.log('📋 Structure de la table "price":')
    priceStructure.rows.forEach(row => console.log(`  - ${row.column_name}: ${row.data_type}`))

    // 2. Quelques exemples de prix
    const samplePrices = await client.query(`
      SELECT 
        p.id,
        p.amount,
        p.currency_code,
        p.price_set_id,
        pvps.variant_id
      FROM price p
      LEFT JOIN product_variant_price_set pvps ON pvps.price_set_id = p.price_set_id
      WHERE p.currency_code = 'eur'
      ORDER BY p.amount DESC
      LIMIT 10
    `)

    console.log('\n💰 Top 10 des prix (en centimes):')
    console.log('─'.repeat(60))
    samplePrices.rows.forEach(row => {
      const euros = (row.amount / 100).toFixed(2)
      console.log(`Variant: ${row.variant_id || 'N/A'} | ${row.amount} centimes = ${euros}€`)
    })

    // 3. Prix avec SKU
    const pricesWithSku = await client.query(`
      SELECT 
        pv.sku,
        pv.title as variant_title,
        p2.title as product_title,
        pr.amount,
        pr.currency_code,
        ROUND(pr.amount / 100.0, 2) as price_euros
      FROM product_variant pv
      LEFT JOIN product p2 ON p2.id = pv.product_id
      LEFT JOIN product_variant_price_set pvps ON pvps.variant_id = pv.id
      LEFT JOIN price pr ON pr.price_set_id = pvps.price_set_id AND pr.currency_code = 'eur'
      WHERE pv.deleted_at IS NULL
      AND pr.amount IS NOT NULL
      ORDER BY pr.amount DESC
      LIMIT 20
    `)

    console.log('\n🎯 Top 20 des prix par SKU:')
    console.log('─'.repeat(100))
    console.log('SKU'.padEnd(15), 'Produit'.padEnd(40), 'Centimes', 'Euros')
    console.log('─'.repeat(100))
    
    pricesWithSku.rows.forEach(row => {
      const sku = (row.sku || 'N/A').padEnd(15)
      const title = (row.product_title || 'N/A').substring(0, 38).padEnd(40)
      const centimes = row.amount.toString().padEnd(10)
      const euros = `${row.price_euros}€`
      console.log(sku, title, centimes, euros)
    })

    // 4. Produits spécifiques (SKU 34542, 70224, 9989)
    const specificSkus = await client.query(`
      SELECT 
        pv.sku,
        p2.title as product_title,
        p2.metadata->>'external_id' as odoo_id,
        pr.amount,
        ROUND(pr.amount / 100.0, 2) as price_euros,
        ROUND(pr.amount / 100.0 / 100.0, 2) as corrected_price
      FROM product_variant pv
      LEFT JOIN product p2 ON p2.id = pv.product_id
      LEFT JOIN product_variant_price_set pvps ON pvps.variant_id = pv.id
      LEFT JOIN price pr ON pr.price_set_id = pvps.price_set_id AND pr.currency_code = 'eur'
      WHERE pv.sku IN ('34542', '70224', '9989', '28516')
      AND pv.deleted_at IS NULL
    `)

    console.log('\n🔬 Produits test spécifiques:')
    console.log('─'.repeat(80))
    specificSkus.rows.forEach(row => {
      console.log(`SKU: ${row.sku}`)
      console.log(`  Odoo ID: ${row.odoo_id}`)
      console.log(`  Produit: ${row.product_title}`)
      console.log(`  Prix stocké: ${row.amount} centimes`)
      console.log(`  Affiché: ${row.price_euros}€`)
      console.log(`  Devrait être: ${row.corrected_price}€ (si erreur x100)`)
      console.log()
    })

  } catch (error) {
    console.error('❌ Erreur:', error.message)
    console.error(error.stack)
  } finally {
    await client.end()
  }
}

checkPrices()

