/**
 * Script pour vérifier les prix et stock d'un produit dans la base
 * 
 * Usage: node check-product.js prod_01KCPBVC4D2G4PW5T9E1PSADHP
 */

const { Client } = require('pg')
require('dotenv').config()

async function checkProduct(productId) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  })

  try {
    await client.connect()
    console.log('✅ Connecté à la base de données\n')

    // 1. Infos produit
    const product = await client.query(`
      SELECT id, title, handle, status
      FROM product
      WHERE id = $1
    `, [productId])

    if (product.rows.length === 0) {
      console.log('❌ Produit non trouvé:', productId)
      return
    }

    console.log('📦 PRODUIT:', product.rows[0].title)
    console.log('─'.repeat(80))

    // 2. Variantes
    const variants = await client.query(`
      SELECT id, title, sku, barcode
      FROM product_variant
      WHERE product_id = $1
      ORDER BY sku
    `, [productId])

    console.log(`\n📊 VARIANTES (${variants.rows.length}):`)
    console.log('─'.repeat(80))
    
    for (const variant of variants.rows) {
      console.log(`\n🔹 ${variant.title} (SKU: ${variant.sku})`)
      
      // Prix de cette variante
      const prices = await client.query(`
        SELECT 
          pmp.id,
          pmp.amount,
          pmp.currency_code,
          pmp.min_quantity,
          pmp.max_quantity
        FROM price_money_amount pmp
        WHERE pmp.variant_id = $1
      `, [variant.id])

      if (prices.rows.length > 0) {
        console.log('   💰 Prix:')
        prices.rows.forEach(p => {
          const display = (p.amount / 100).toFixed(2)
          console.log(`      - ${p.amount} centimes (${display}€) [${p.currency_code}]`)
        })
      } else {
        console.log('   ❌ Aucun prix trouvé')
      }

      // Stock de cette variante
      const inventory = await client.query(`
        SELECT 
          ii.id as inventory_item_id,
          ii.sku,
          il.stocked_quantity,
          il.reserved_quantity,
          il.incoming_quantity,
          sl.name as location_name
        FROM inventory_item ii
        LEFT JOIN inventory_level il ON il.inventory_item_id = ii.id
        LEFT JOIN stock_location sl ON sl.id = il.location_id
        WHERE ii.sku = $1
      `, [variant.sku])

      if (inventory.rows.length > 0) {
        console.log('   📦 Stock:')
        inventory.rows.forEach(inv => {
          console.log(`      - Emplacement: ${inv.location_name || 'N/A'}`)
          console.log(`      - Disponible: ${inv.stocked_quantity || 0}`)
          console.log(`      - Réservé: ${inv.reserved_quantity || 0}`)
        })
      } else {
        console.log('   ❌ Aucun stock trouvé')
      }
    }

    console.log('\n' + '─'.repeat(80))

  } catch (error) {
    console.error('❌ Erreur:', error.message)
  } finally {
    await client.end()
  }
}

const productId = process.argv[2] || 'prod_01KCPBVC4D2G4PW5T9E1PSADHP'
checkProduct(productId)


