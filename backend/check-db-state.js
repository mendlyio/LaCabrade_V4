/**
 * Script pour vérifier l'état actuel de la base de données
 */

const { Client } = require('pg')
require('dotenv').config()

async function checkDBState() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:YIKujyFPHKidnMJIKJpXVpwyvRYCxCVV@shuttle.proxy.rlwy.net:52325/railway",
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('✅ Connecté à la base de données Railway\n')

    // 1. Nombre total de produits
    const productsCount = await client.query('SELECT COUNT(*) FROM product WHERE deleted_at IS NULL')
    console.log(`📦 Produits actifs: ${productsCount.rows[0].count}`)

    // 2. Nombre de variantes
    const variantsCount = await client.query('SELECT COUNT(*) FROM product_variant WHERE deleted_at IS NULL')
    console.log(`🔢 Variantes actives: ${variantsCount.rows[0].count}`)

    // 3. Prix suspects (probablement x100 par erreur)
    const suspectPrices = await client.query(`
      SELECT 
        p.title as product_title,
        pv.sku,
        pv.title as variant_title,
        pmp.amount,
        pmp.currency_code,
        ROUND(pmp.amount / 100.0, 2) as display_price,
        ROUND(pmp.amount / 100.0 / 100.0, 2) as corrected_price
      FROM price_money_amount pmp
      LEFT JOIN product_variant pv ON pv.id = pmp.variant_id
      LEFT JOIN product p ON p.id = pv.product_id
      WHERE pmp.amount >= 100 AND pmp.currency_code = 'eur'
      ORDER BY pmp.amount DESC
      LIMIT 20
    `)

    console.log(`\n💰 Top 20 des prix actuels (suspects - >= 100):`)
    console.log('─'.repeat(100))
    console.log('SKU'.padEnd(15), 'Produit'.padEnd(40), 'Prix stocké', 'Affiché', 'Devrait être')
    console.log('─'.repeat(100))
    
    suspectPrices.rows.forEach(row => {
      const sku = (row.sku || 'N/A').padEnd(15)
      const title = (row.product_title || 'N/A').substring(0, 38).padEnd(40)
      const stored = row.amount.toString().padEnd(12)
      const displayed = `${row.display_price}€`.padEnd(10)
      const corrected = `${row.corrected_price}€`
      console.log(sku, title, stored, displayed, corrected)
    })

    // 4. Produits Odoo (avec external_id)
    const odooProducts = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as active,
        COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END) as soft_deleted
      FROM product 
      WHERE metadata->>'external_id' IS NOT NULL
    `)
    
    console.log(`\n🔗 Produits importés depuis Odoo:`)
    console.log(`   Total: ${odooProducts.rows[0].total}`)
    console.log(`   Actifs: ${odooProducts.rows[0].active}`)
    console.log(`   Soft-deleted: ${odooProducts.rows[0].soft_deleted}`)

    // 5. Quelques exemples de produits spécifiques
    const specificProducts = await client.query(`
      SELECT 
        p.id,
        p.title,
        p.handle,
        p.metadata->>'external_id' as odoo_id,
        pv.sku,
        pmp.amount as price
      FROM product p
      LEFT JOIN product_variant pv ON pv.product_id = p.id AND pv.deleted_at IS NULL
      LEFT JOIN price_money_amount pmp ON pmp.variant_id = pv.id
      WHERE p.metadata->>'external_id' IN ('17302', '22529', '12629')
      AND p.deleted_at IS NULL
      ORDER BY p.id, pv.sku
      LIMIT 20
    `)

    console.log(`\n🎯 Produits test spécifiques (Odoo IDs: 17302, 22529, 12629):`)
    console.log('─'.repeat(100))
    specificProducts.rows.forEach(row => {
      console.log(`  Odoo ID: ${row.odoo_id} | SKU: ${row.sku || 'N/A'} | Prix: ${row.price || 'N/A'} | ${row.title}`)
    })

  } catch (error) {
    console.error('❌ Erreur:', error.message)
  } finally {
    await client.end()
  }
}

checkDBState()

