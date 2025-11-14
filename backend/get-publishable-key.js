const { Client } = require('pg');

async function getPublishableKey() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/medusa-db'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    // Récupérer toutes les publishable keys
    const result = await client.query(`
      SELECT id, title, created_at 
      FROM publishable_api_key 
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    if (result.rows.length === 0) {
      console.log('\n❌ Aucune publishable key trouvée dans la base');
      console.log('\nCréez-en une via:');
      console.log('1. Admin dashboard: https://backend-production-7bbb.up.railway.app/app');
      console.log('2. Ou avec: node backend/create-publishable-key.js');
      return;
    }
    
    console.log('\n📋 Publishable Keys trouvées:\n');
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.id}`);
      console.log(`   Titre: ${row.title}`);
      console.log(`   Créée: ${row.created_at}`);
      console.log('');
    });
    
    console.log('\n🎯 Utilisez cette clé pour le frontend:');
    console.log(`NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=${result.rows[0].id}`);
    console.log('\n📝 Ajoutez-la dans Railway → Storefront → Variables');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await client.end();
  }
}

getPublishableKey();





