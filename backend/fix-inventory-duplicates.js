const { Client } = require('pg')
require('dotenv').config()

async function fixDuplicates() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  })

  try {
    await client.connect()
    console.log('✅ Connecté\n')

    // 1. Trouver tous les SKUs avec doublons
    const duplicates = await client.query(`
      SELECT sku, COUNT(*) as count
      FROM inventory_item
      GROUP BY sku
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `)

    console.log(`📋 ${duplicates.rows.length} SKUs avec doublons:`)
    console.log('─'.repeat(80))
    
    if (duplicates.rows.length === 0) {
      console.log('✅ Aucun doublon trouvé !')
      return
    }

    duplicates.rows.slice(0, 10).forEach(row => {
      console.log(`   SKU ${row.sku}: ${row.count} inventory items`)
    })

    console.log('\n⚠️  Ces doublons peuvent empêcher l\'affichage du stock dans le backoffice.')
    console.log('\n💡 Pour les supprimer, je dois garder le plus récent pour chaque SKU.')
    console.log('    Les anciens seront supprimés.')
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const answer = await new Promise(resolve => {
      readline.question('\nSupprimer les doublons ? (oui/non): ', resolve)
    })
    readline.close()

    if (answer.toLowerCase() !== 'oui') {
      console.log('❌ Annulé')
      return
    }

    // 2. Pour chaque SKU en doublon, garder le plus récent
    let totalDeleted = 0
    
    for (const dup of duplicates.rows) {
      // Récupérer tous les inventory_items pour ce SKU
      const items = await client.query(`
        SELECT ii.id, ii.created_at, ii.sku,
               COUNT(pvii.variant_id) as variant_links
        FROM inventory_item ii
        LEFT JOIN product_variant_inventory_item pvii ON pvii.inventory_item_id = ii.id
        WHERE ii.sku = $1
        GROUP BY ii.id, ii.created_at, ii.sku
        ORDER BY ii.created_at DESC
      `, [dup.sku])

      // Garder le premier (le plus récent), supprimer les autres
      const toKeep = items.rows[0]
      const toDelete = items.rows.slice(1)

      console.log(`\n🔹 SKU ${dup.sku}:`)
      console.log(`   ✅ Garder: ${toKeep.id} (${toKeep.variant_links} liens)`)

      for (const item of toDelete) {
        console.log(`   🗑️  Supprimer: ${item.id} (${item.variant_links} liens)`)
        
        // Supprimer les niveaux de stock
        await client.query(`DELETE FROM inventory_level WHERE inventory_item_id = $1`, [item.id])
        
        // Supprimer les liens variant
        await client.query(`DELETE FROM product_variant_inventory_item WHERE inventory_item_id = $1`, [item.id])
        
        // Supprimer l'inventory_item
        await client.query(`DELETE FROM inventory_item WHERE id = $1`, [item.id])
        
        totalDeleted++
      }
    }

    console.log(`\n✅ ${totalDeleted} inventory items en doublon supprimés !`)
    console.log('\n🔄 Redémarre le backend Railway et rafraîchis le backoffice.')

  } catch (error) {
    console.error('❌ Erreur:', error.message)
  } finally {
    await client.end()
  }
}

fixDuplicates()
