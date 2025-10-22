const fetch = require('node-fetch');

const BACKEND_URL = process.env.BACKEND_URL || 'https://backend-production-7bbb.up.railway.app';

async function createPublishableKey() {
  try {
    console.log('🔑 Création d\'une Publishable Key via l\'API Admin...\n');
    
    // Step 1: Login admin (utilisez vos credentials)
    const email = process.env.ADMIN_EMAIL || 'admin@medusa-test.com';
    const password = process.env.ADMIN_PASSWORD || 'supersecret';
    
    console.log(`📧 Tentative de connexion avec: ${email}`);
    
    const loginResponse = await fetch(`${BACKEND_URL}/auth/user/emailpass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (!loginResponse.ok) {
      const error = await loginResponse.text();
      console.error(`❌ Échec de connexion (${loginResponse.status}):`, error);
      console.log('\n💡 Essayez:');
      console.log(`   ADMIN_EMAIL="votre@email.com" ADMIN_PASSWORD="motdepasse" node ${__filename}`);
      return;
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    
    console.log('✅ Connexion réussie!\n');
    
    // Step 2: Create publishable key
    console.log('🔑 Création de la Publishable Key...');
    
    const keyResponse = await fetch(`${BACKEND_URL}/admin/publishable-api-keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'Production Storefront Key'
      })
    });
    
    if (!keyResponse.ok) {
      const error = await keyResponse.text();
      console.error(`❌ Échec création clé (${keyResponse.status}):`, error);
      return;
    }
    
    const keyData = await keyResponse.json();
    const publishableKey = keyData.publishable_api_key?.id;
    
    if (!publishableKey) {
      console.error('❌ Impossible de récupérer la clé créée');
      return;
    }
    
    console.log('\n✅ Publishable Key créée avec succès!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Votre Publishable Key:');
    console.log(`   ${publishableKey}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🚀 Ajoutez-la dans Railway:');
    console.log('   1. Railway → Storefront service → Variables');
    console.log('   2. Ajoutez:');
    console.log(`      NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=${publishableKey}`);
    console.log('   3. Redéployez le frontend\n');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

createPublishableKey();
