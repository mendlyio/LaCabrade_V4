/**
 * Script pour nettoyer les doublons d'inventory items
 * À lancer UNE SEULE FOIS pour nettoyer la base existante
 * 
 * Usage: node clean-inventory-duplicates.js
 */

const { Client } = require('pg')
require('dotenv').config()

async function cleanDuplicates() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  })

  try {
    await client.connect()
    console.log('✅ Connecté à la base\n')

    // 1. Trouver tous les SKUs avec doublons
    const duplicates = await client.query(`
      SELECT sku, COUNT(*) as count, array_agg(id ORDER BY created_at DESC) as item_ids
      FROM inventory_item
      WHERE sku IS NOT NULL
      GROUP BY sku
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `)

    console.log('═'.repeat(80))
    console.log(`📋 ${duplicates.rows.length} SKUs avec doublons détectés`)
    console.log('═'.repeat(80))
    
    if (duplicates.rows.length === 0) {
      console.log('\n✅ Aucun doublon trouvé ! La base est propre.')
      return
    }

    // Afficher un aperçu
    console.log('\n📊 Aperçu des 10 premiers:')
    duplicates.rows.slice(0, 10).forEach(row => {
      console.log(`   SKU ${row.sku}: ${row.count} items`)
    })

    console.log('\n⚠️  ATTENTION:')
    console.log('   - Les doublons seront supprimés')
    console.log('   - Le plus récent sera conservé pour chaque SKU')
    console.log('   - Les niveaux de stock seront fusionnés')
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const answer = await new Promise(resolve => {
      readline.question('\nContinuer le nettoyage ? (oui/non): ', resolve)
    })
    readline.close()

    if (answer.toLowerCase() !== 'oui') {
      console.log('❌ Opération annulée')
      return
    }

    // 2. Pour chaque SKU en doublon, garder le plus récent
    let totalDeleted = 0
    let totalKept = 0
    
    console.log('\n' + '═'.repeat(80))
    console.log('🧹 NETTOYAGE EN COURS')
    console.log('═'.repeat(80) + '\n')
    
    for (const dup of duplicates.rows) {
      const itemIds = dup.item_ids // Déjà triés par created_at DESC
      const toKeep = itemIds[0]
      const toDelete = itemIds.slice(1)

      console.log(`\n🔹 SKU ${dup.sku} (${dup.count} items):`)
      console.log(`   ✅ Garder: ${toKeep}`)

      // Pour chaque item à supprimer
      for (const itemId of toDelete) {
        try {
          // 1. Récupérer les niveaux de stock avant suppression
          const levels = await client.query(`
            SELECT location_id, stocked_quantity, reserved_quantity
            FROM inventory_level
            WHERE inventory_item_id = $1
          `, [itemId])

          // 2. Fusionner le stock dans l'item à garder
          for (const level of levels.rows) {
            // Vérifier si un niveau existe déjà pour cet emplacement
            const existing = await client.query(`
              SELECT id, stocked_quantity, reserved_quantity
              FROM inventory_level
              WHERE inventory_item_id = $1 AND location_id = $2
            `, [toKeep, level.location_id])

            if (existing.rows.length > 0) {
              // Additionner le stock
              const newStocked = (existing.rows[0].stocked_quantity || 0) + (level.stocked_quantity || 0)
              const newReserved = (existing.rows[0].reserved_quantity || 0) + (level.reserved_quantity || 0)
              
              await client.query(`
                UPDATE inventory_level
                SET stocked_quantity = $1, reserved_quantity = $2, updated_at = NOW()
                WHERE id = $3
              `, [newStocked, newReserved, existing.rows[0].id])
              
              console.log(`      📦 Stock fusionné: +${level.stocked_quantity} → total ${newStocked}`)
            } else {
              // Déplacer le niveau vers l'item à garder
              await client.query(`
                UPDATE inventory_level
                SET inventory_item_id = $1, updated_at = NOW()
                WHERE inventory_item_id = $2 AND location_id = $3
              `, [toKeep, itemId, level.location_id])
              
              console.log(`      📦 Stock déplacé: ${level.stocked_quantity}`)
            }
          }

          // 3. Supprimer les liens variant (si restants)
          await client.query(`
            DELETE FROM product_variant_inventory_item
            WHERE inventory_item_id = $1
          `, [itemId])

          // 4. Supprimer les niveaux restants
          await client.query(`
            DELETE FROM inventory_level
            WHERE inventory_item_id = $1
          `, [itemId])

          // 5. Supprimer l'inventory item
          await client.query(`
            DELETE FROM inventory_item
            WHERE id = $1
          `, [itemId])

          console.log(`      🗑️  Supprimé: ${itemId}`)
          totalDeleted++

        } catch (err) {
          console.error(`      ❌ Erreur sur ${itemId}:`, err.message)
        }
      }

      totalKept++
    }

    console.log('\n' + '═'.repeat(80))
    console.log('✅ NETTOYAGE TERMINÉ')
    console.log('═'.repeat(80))
    console.log(`   ${totalKept} SKUs nettoyés`)
    console.log(`   ${totalDeleted} doublons supprimés`)
    console.log(`\n🔄 Redémarre le backend Railway et rafraîchis le backoffice Medusa.`)
    console.log('   Les prix et stock devraient maintenant s\'afficher correctement !')

  } catch (error) {
    console.error('❌ Erreur:', error.message)
    console.error(error.stack)
  } finally {
    await client.end()
  }
}

cleanDuplicates()


