const { Client } = require('pg')
require('dotenv').config()

async function checkFull(productId) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  })

  try {
    await client.connect()
    console.log('✅ Connecté à la base\n')

    // 1. Infos produit + canal de vente
    console.log('═'.repeat(80))
    console.log('📦 PRODUIT')
    console.log('═'.repeat(80))
    
    const product = await client.query(`
      SELECT p.id, p.title, p.handle, p.status
      FROM product p
      WHERE p.id = $1
    `, [productId])

    if (product.rows.length === 0) {
      console.log('❌ Produit non trouvé')
      return
    }

    console.log(`Titre: ${product.rows[0].title}`)
    console.log(`Handle: ${product.rows[0].handle}`)
    console.log(`Status: ${product.rows[0].status}`)

    // 2. Canaux de vente
    const salesChannels = await client.query(`
      SELECT sc.id, sc.name, sc.description
      FROM sales_channel sc
      INNER JOIN product_sales_channel psc ON psc.sales_channel_id = sc.id
      WHERE psc.product_id = $1
    `, [productId])

    console.log(`\n📺 CANAUX DE VENTE: ${salesChannels.rows.length}`)
    if (salesChannels.rows.length === 0) {
      console.log('   ❌ AUCUN CANAL DE VENTE ASSIGNÉ')
    } else {
      salesChannels.rows.forEach(sc => {
        console.log(`   ✅ ${sc.name} (${sc.id})`)
      })
    }

    // 3. Variantes (2 premières)
    console.log('\n' + '═'.repeat(80))
    console.log('🔹 VARIANTES (2 premières)')
    console.log('═'.repeat(80))
    
    const variants = await client.query(`
      SELECT id, title, sku
      FROM product_variant
      WHERE product_id = $1
      ORDER BY sku
      LIMIT 2
    `, [productId])

    for (const variant of variants.rows) {
      console.log(`\n📌 ${variant.title}`)
      console.log(`   SKU: ${variant.sku}`)
      console.log(`   ID: ${variant.id}`)

      // Prix
      const prices = await client.query(`
        SELECT p.amount, p.currency_code
        FROM price p
        INNER JOIN product_variant_price_set pvps ON pvps.price_set_id = p.price_set_id
        WHERE pvps.variant_id = $1
      `, [variant.id])

      if (prices.rows.length > 0) {
        const amount = prices.rows[0].amount
        const euros = (amount / 100).toFixed(2)
        console.log(`   💰 Prix: ${amount} centimes = ${euros}€`)
      } else {
        console.log(`   ❌ PAS DE PRIX`)
      }

      // Stock
      const stock = await client.query(`
        SELECT 
          il.stocked_quantity,
          il.reserved_quantity,
          sl.name as location_name
        FROM inventory_item ii
        INNER JOIN inventory_level il ON il.inventory_item_id = ii.id
        INNER JOIN stock_location sl ON sl.id = il.location_id
        WHERE ii.sku = $1
      `, [variant.sku])

      if (stock.rows.length > 0) {
        stock.rows.forEach(s => {
          console.log(`   📦 Stock à "${s.location_name}": ${s.stocked_quantity} disponible`)
        })
      } else {
        console.log(`   ❌ PAS DE STOCK`)
      }
    }

    console.log('\n' + '═'.repeat(80))

  } catch (error) {
    console.error('❌ Erreur:', error.message)
    console.error(error.stack)
  } finally {
    await client.end()
  }
}

const productId = process.argv[2] || 'prod_01KCPBVC4D2G4PW5T9E1PSADHP'
checkFull(productId)
