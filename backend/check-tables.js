/**
 * Script pour découvrir les tables de la base
 */

const { Client } = require('pg')

async function checkTables() {
  const client = new Client({
    connectionString: "postgresql://postgres:YIKujyFPHKidnMJIKJpXVpwyvRYCxCVV@shuttle.proxy.rlwy.net:52325/railway",
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('✅ Connecté\n')

    // Lister les tables qui contiennent "price"
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%price%'
      ORDER BY table_name
    `)

    console.log('📋 Tables contenant "price":')
    tables.rows.forEach(row => console.log(`  - ${row.table_name}`))

    // Lister les tables principales
    const mainTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('product', 'product_variant', 'price', 'price_set', 'money_amount')
      ORDER BY table_name
    `)

    console.log('\n📋 Tables principales:')
    mainTables.rows.forEach(row => console.log(`  - ${row.table_name}`))

    // Structure de product_variant
    const variantCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'product_variant'
      ORDER BY ordinal_position
      LIMIT 20
    `)

    console.log('\n📋 Colonnes de product_variant (20 premières):')
    variantCols.rows.forEach(row => console.log(`  - ${row.column_name}: ${row.data_type}`))

  } catch (error) {
    console.error('❌ Erreur:', error.message)
  } finally {
    await client.end()
  }
}

checkTables()

