const { createRequire } = require('module');
const require2 = createRequire(__filename);
const { Client } = require2('pg');

async function createPublishableKey() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/medusa-db'
  });

  try {
    await client.connect();
    
    // Générer un ID unique
    const keyId = 'pk_' + Math.random().toString(36).substring(2, 15);
    
    // Créer la publishable key
    const result = await client.query(`
      INSERT INTO publishable_api_key (id, created_by, title, created_at, updated_at)
      VALUES ($1, NULL, 'Local Dev Key', NOW(), NOW())
      RETURNING id
    `, [keyId]);
    
    console.log('\n✅ Publishable Key créée avec succès !');
    console.log('\n📋 Votre clé : ' + keyId);
    console.log('\nAjoutez-la dans storefront/.env.local :');
    console.log('NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=' + keyId);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await client.end();
  }
}

createPublishableKey();



