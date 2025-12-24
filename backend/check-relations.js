const { Client } = require('pg')
require('dotenv').config()

async function checkRelations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  })

  try {
    await client.connect()
    console.log('✅ Connecté\n')

    const variantId = 'variant_01KCPBVC6MMJW41XRREKFEGTM2' // SKU 70224

    console.log('🔍 Vérification VARIANTE:', variantId)
    console.log('═'.repeat(80))

    // 1. Lien avec price_set
    const priceSetLink = await client.query(`
      SELECT pvps.variant_id, pvps.price_set_id
      FROM product_variant_price_set pvps
      WHERE pvps.variant_id = $1
    `, [variantId])

    console.log('\n📊 LIEN PRICE_SET:')
    if (priceSetLink.rows.length === 0) {
      console.log('   ❌ PAS DE LIEN product_variant_price_set')
    } else {
      console.log(`   ✅ price_set_id: ${priceSetLink.rows[0].price_set_id}`)
      
      // Vérifier si des prix existent pour ce price_set
      const prices = await client.query(`
        SELECT id, amount, currency_code
        FROM price
        WHERE price_set_id = $1
      `, [priceSetLink.rows[0].price_set_id])
      
      console.log(`   📋 Nombre de prix: ${prices.rows.length}`)
      prices.rows.forEach(p => {
        console.log(`      - ${p.amount} centimes (${(p.amount/100).toFixed(2)}€)`)
      })
    }

    // 2. Inventory Items
    const inventoryItems = await client.query(`
      SELECT ii.id, ii.sku
      FROM inventory_item ii
      WHERE ii.sku = '70224'
    `)

    console.log('\n📦 INVENTORY ITEMS pour SKU 70224:')
    console.log(`   Nombre d'items: ${inventoryItems.rows.length}`)
    
    if (inventoryItems.rows.length > 1) {
      console.log('   ⚠️ DOUBLON DÉTECTÉ !')
    }
    
    inventoryItems.rows.forEach((item, idx) => {
      console.log(`   ${idx + 1}. ${item.id}`)
    })

    // 3. Lien variant -> inventory_item
    const variantInventoryLink = await client.query(`
      SELECT variant_id, inventory_item_id
      FROM product_variant_inventory_item
      WHERE variant_id = $1
    `, [variantId])

    console.log('\n🔗 LIEN VARIANT → INVENTORY_ITEM:')
    if (variantInventoryLink.rows.length === 0) {
      console.log('   ❌ PAS DE LIEN product_variant_inventory_item')
    } else {
      variantInventoryLink.rows.forEach(link => {
        console.log(`   ✅ inventory_item_id: ${link.inventory_item_id}`)
      })
    }

    console.log('\n' + '═'.repeat(80))

  } catch (error) {
    console.error('❌ Erreur:', error.message)
  } finally {
    await client.end()
  }
}

checkRelations()
