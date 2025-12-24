#!/usr/bin/env node
/**
 * Script de test : Suppression + Réimport d'un produit Odoo
 * 
 * Ce script teste le workflow complet :
 * 1. Cherche un produit Odoo déjà importé (ex: "Gants")
 * 2. Le supprime (soft delete)
 * 3. Le réimporte depuis Odoo
 * 4. Vérifie que variants, prix et stock sont corrects
 */

require('dotenv').config()
const { Client } = require('pg')

const PRODUCT_SEARCH = process.argv[2] || 'Gants'

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  })

  try {
    await client.connect()
    console.log('✅ Connecté à PostgreSQL\n')

    // 1. Chercher le produit par titre
    console.log(`🔍 Recherche du produit "${PRODUCT_SEARCH}"...`)
    const productQuery = await client.query(
      `SELECT id, title, handle, deleted_at, metadata
       FROM product 
       WHERE title ILIKE $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [`%${PRODUCT_SEARCH}%`]
    )

    if (productQuery.rows.length === 0) {
      console.log(`❌ Produit "${PRODUCT_SEARCH}" non trouvé`)
      console.log(`\n💡 Produits disponibles:`)
      const allProducts = await client.query(
        `SELECT title, handle, deleted_at 
         FROM product 
         WHERE deleted_at IS NULL 
         ORDER BY created_at DESC 
         LIMIT 10`
      )
      allProducts.rows.forEach(p => {
        console.log(`  - ${p.title} (${p.handle})`)
      })
      return
    }

    const product = productQuery.rows[0]
    console.log(`✅ Produit trouvé: ${product.title} (${product.id})`)
    console.log(`   Handle: ${product.handle}`)
    console.log(`   Deleted: ${product.deleted_at ? '🗑️  OUI (soft-deleted)' : '✅ Non'}`)
    console.log(`   External ID Odoo: ${product.metadata?.external_id || 'N/A'}`)

    // 2. Récupérer les variants
    const variantsQuery = await client.query(
      `SELECT id, title, sku, deleted_at
       FROM product_variant 
       WHERE product_id = $1`,
      [product.id]
    )

    console.log(`\n📦 ${variantsQuery.rows.length} variant(s) trouvé(s):`)
    for (const variant of variantsQuery.rows) {
      console.log(`  - ${variant.title} (SKU: ${variant.sku})`)
      console.log(`    ID: ${variant.id}`)
      console.log(`    Deleted: ${variant.deleted_at ? '🗑️  OUI' : '✅ Non'}`)

      // Vérifier les inventory items
      const invQuery = await client.query(
        `SELECT id, sku, created_at
         FROM inventory_item
         WHERE sku = $1`,
        [variant.sku]
      )

      if (invQuery.rows.length === 0) {
        console.log(`    ⚠️  Aucun inventory_item trouvé`)
      } else if (invQuery.rows.length === 1) {
        const inv = invQuery.rows[0]
        console.log(`    ✅ Inventory Item: ${inv.id}`)

        // Vérifier les niveaux de stock
        const levelQuery = await client.query(
          `SELECT stocked_quantity, location_id
           FROM inventory_level
           WHERE inventory_item_id = $1`,
          [inv.id]
        )

        if (levelQuery.rows.length > 0) {
          const level = levelQuery.rows[0]
          console.log(`       📊 Stock: ${level.stocked_quantity} (location: ${level.location_id})`)
        } else {
          console.log(`       ⚠️  Aucun niveau de stock`)
        }
      } else {
        console.log(`    ⚠️  ${invQuery.rows.length} DOUBLONS inventory_item détectés!`)
        invQuery.rows.forEach((inv, i) => {
          console.log(`       ${i + 1}. ${inv.id} (créé: ${inv.created_at})`)
        })
      }

      // Vérifier les prix
      const priceQuery = await client.query(
        `SELECT p.amount, p.currency_code, p.rules_count
         FROM price p
         INNER JOIN price_set_money_amount psma ON p.id = psma.money_amount_id
         INNER JOIN product_variant_price_set pvps ON psma.price_set_id = pvps.price_set_id
         WHERE pvps.variant_id = $1`,
        [variant.id]
      )

      if (priceQuery.rows.length === 0) {
        console.log(`    ⚠️  Aucun prix trouvé`)
      } else {
        priceQuery.rows.forEach(price => {
          console.log(`    💰 Prix: ${price.amount / 100}€ (${price.currency_code})`)
        })
      }

      // Vérifier le canal de vente
      const channelQuery = await client.query(
        `SELECT sc.name
         FROM product_sales_channel psc
         INNER JOIN sales_channel sc ON psc.sales_channel_id = sc.id
         WHERE psc.product_id = $1`,
        [product.id]
      )

      if (channelQuery.rows.length === 0) {
        console.log(`    ⚠️  Aucun canal de vente`)
      } else {
        console.log(`    🏪 Canaux: ${channelQuery.rows.map(c => c.name).join(', ')}`)
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('📝 RÉSUMÉ')
    console.log('='.repeat(60))

    const issues = []
    let allGood = true

    // Vérifier les problèmes
    if (product.deleted_at) {
      issues.push('❌ Produit soft-deleted')
      allGood = false
    }

    const softDeletedVariants = variantsQuery.rows.filter(v => v.deleted_at)
    if (softDeletedVariants.length > 0) {
      issues.push(`❌ ${softDeletedVariants.length} variant(s) soft-deleted`)
      allGood = false
    }

    // Compter les variants sans inventory
    let variantsWithoutInventory = 0
    let variantsWithoutStock = 0
    let variantsWithoutPrice = 0
    let duplicateInventories = 0

    for (const variant of variantsQuery.rows) {
      const invQuery = await client.query(
        `SELECT id FROM inventory_item WHERE sku = $1`,
        [variant.sku]
      )

      if (invQuery.rows.length === 0) {
        variantsWithoutInventory++
      } else if (invQuery.rows.length > 1) {
        duplicateInventories++
      } else {
        const levelQuery = await client.query(
          `SELECT stocked_quantity FROM inventory_level WHERE inventory_item_id = $1`,
          [invQuery.rows[0].id]
        )
        if (levelQuery.rows.length === 0) {
          variantsWithoutStock++
        }
      }

      const priceQuery = await client.query(
        `SELECT p.amount
         FROM price p
         INNER JOIN price_set_money_amount psma ON p.id = psma.money_amount_id
         INNER JOIN product_variant_price_set pvps ON psma.price_set_id = pvps.price_set_id
         WHERE pvps.variant_id = $1`,
        [variant.id]
      )

      if (priceQuery.rows.length === 0) {
        variantsWithoutPrice++
      }
    }

    if (variantsWithoutInventory > 0) {
      issues.push(`❌ ${variantsWithoutInventory} variant(s) sans inventory_item`)
      allGood = false
    }

    if (variantsWithoutStock > 0) {
      issues.push(`⚠️  ${variantsWithoutStock} variant(s) sans niveau de stock`)
      allGood = false
    }

    if (variantsWithoutPrice > 0) {
      issues.push(`❌ ${variantsWithoutPrice} variant(s) sans prix`)
      allGood = false
    }

    if (duplicateInventories > 0) {
      issues.push(`⚠️  ${duplicateInventories} variant(s) avec doublons inventory_item`)
      allGood = false
    }

    const channelQuery = await client.query(
      `SELECT sc.name
       FROM product_sales_channel psc
       INNER JOIN sales_channel sc ON psc.sales_channel_id = sc.id
       WHERE psc.product_id = $1`,
      [product.id]
    )

    if (channelQuery.rows.length === 0) {
      issues.push('❌ Aucun canal de vente')
      allGood = false
    }

    if (allGood) {
      console.log('✅ TOUT EST OK!')
      console.log(`   - Produit actif`)
      console.log(`   - ${variantsQuery.rows.length} variant(s) avec inventory, stock et prix`)
      console.log(`   - Canal(aux) de vente: ${channelQuery.rows.map(c => c.name).join(', ')}`)
    } else {
      console.log('❌ PROBLÈMES DÉTECTÉS:')
      issues.forEach(issue => console.log(`   ${issue}`))
    }

    console.log('\n💡 Pour réimporter ce produit depuis Odoo:')
    console.log('   1. Va dans le backoffice Medusa → Settings → Odoo')
    console.log(`   2. Cherche "${PRODUCT_SEARCH}" dans la liste`)
    console.log('   3. Clique sur "Importer"')

  } catch (error) {
    console.error('❌ Erreur:', error.message)
    console.error(error.stack)
  } finally {
    await client.end()
  }
}

main()


