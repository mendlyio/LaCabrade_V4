/**
 * Script pour supprimer TOUS les produits importés depuis Odoo
 * Permet de repartir sur une base propre et réimporter correctement
 * 
 * ⚠️ ATTENTION: Suppression DÉFINITIVE (pas de soft-delete)
 * 
 * Usage: node delete-all-odoo-products.js
 */

const { Client } = require('pg')
require('dotenv').config()

async function deleteAllOdooProducts() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  })

  try {
    await client.connect()
    console.log('✅ Connecté à la base\n')

    // 1. Trouver tous les produits Odoo (avec external_id)
    const products = await client.query(`
      SELECT id, title, metadata
      FROM product
      WHERE metadata->>'external_id' IS NOT NULL
      ORDER BY title
    `)

    console.log('═'.repeat(80))
    console.log(`📦 ${products.rows.length} produits Odoo trouvés`)
    console.log('═'.repeat(80))

    if (products.rows.length === 0) {
      console.log('\n✅ Aucun produit Odoo à supprimer')
      return
    }

    // Afficher les 10 premiers
    console.log('\n📋 Aperçu des 10 premiers produits:')
    products.rows.slice(0, 10).forEach(p => {
      console.log(`   - ${p.title} (Odoo ID: ${p.metadata.external_id})`)
    })

    if (products.rows.length > 10) {
      console.log(`   ... et ${products.rows.length - 10} autres`)
    }

    console.log('\n⚠️  ATTENTION IMPORTANTE:')
    console.log('   ❌ Suppression DÉFINITIVE (pas de soft-delete)')
    console.log('   ❌ Toutes les variantes seront supprimées')
    console.log('   ❌ Tous les prix seront supprimés')
    console.log('   ❌ Tous les stocks seront supprimés')
    console.log('   ✅ Permet de réimporter proprement depuis Odoo')
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const answer = await new Promise(resolve => {
      readline.question('\nSupprimer TOUS ces produits ? (tapez "OUI" en majuscules): ', resolve)
    })
    readline.close()

    if (answer !== 'OUI') {
      console.log('❌ Opération annulée (il fallait taper "OUI" en majuscules)')
      return
    }

    console.log('\n' + '═'.repeat(80))
    console.log('🗑️  SUPPRESSION EN COURS')
    console.log('═'.repeat(80) + '\n')

    let deletedProducts = 0
    let deletedVariants = 0
    let deletedInventoryItems = 0

    // 2. Pour chaque produit
    for (const product of products.rows) {
      try {
        console.log(`\n🔹 Suppression: ${product.title}`)

        // a) Récupérer les variantes
        const variants = await client.query(`
          SELECT id, sku
          FROM product_variant
          WHERE product_id = $1
        `, [product.id])

        console.log(`   📦 ${variants.rows.length} variantes`)

        // b) Pour chaque variante, supprimer inventory items et stock
        for (const variant of variants.rows) {
          // Supprimer les inventory items pour ce SKU
          const inventoryItems = await client.query(`
            SELECT id FROM inventory_item WHERE sku = $1
          `, [variant.sku])

          for (const item of inventoryItems.rows) {
            // Supprimer les niveaux de stock
            await client.query(`DELETE FROM inventory_level WHERE inventory_item_id = $1`, [item.id])
            
            // Supprimer les liens variant
            await client.query(`DELETE FROM product_variant_inventory_item WHERE inventory_item_id = $1`, [item.id])
            
            // Supprimer l'inventory item
            await client.query(`DELETE FROM inventory_item WHERE id = $1`, [item.id])
            
            deletedInventoryItems++
          }
        }

        // c) Supprimer les liens sales channel
        await client.query(`DELETE FROM product_sales_channel WHERE product_id = $1`, [product.id])

        // d) Supprimer les liens variant-price_set
        await client.query(`
          DELETE FROM product_variant_price_set
          WHERE variant_id IN (
            SELECT id FROM product_variant WHERE product_id = $1
          )
        `, [product.id])

        // e) Supprimer les variantes
        const deletedVars = await client.query(`
          DELETE FROM product_variant WHERE product_id = $1
        `, [product.id])
        deletedVariants += deletedVars.rowCount || 0

        // f) Supprimer les options
        await client.query(`DELETE FROM product_option WHERE product_id = $1`, [product.id])

        // g) Supprimer le produit
        await client.query(`DELETE FROM product WHERE id = $1`, [product.id])
        
        console.log(`   ✅ Supprimé`)
        deletedProducts++

      } catch (err) {
        console.error(`   ❌ Erreur:`, err.message)
      }
    }

    console.log('\n' + '═'.repeat(80))
    console.log('✅ SUPPRESSION TERMINÉE')
    console.log('═'.repeat(80))
    console.log(`   ${deletedProducts} produits supprimés`)
    console.log(`   ${deletedVariants} variantes supprimées`)
    console.log(`   ${deletedInventoryItems} inventory items supprimés`)
    
    console.log('\n📝 PROCHAINES ÉTAPES:')
    console.log('   1. Redémarre le backend Railway')
    console.log('   2. Rafraîchis le backoffice Medusa')
    console.log('   3. Dans le module Odoo, importe les produits souhaités')
    console.log('   4. Tous les prix, stocks et variantes seront corrects ! ✨')

  } catch (error) {
    console.error('❌ Erreur:', error.message)
    console.error(error.stack)
  } finally {
    await client.end()
  }
}

deleteAllOdooProducts()


