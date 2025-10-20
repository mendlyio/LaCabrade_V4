const https = require('https');
const http = require('http');

async function createPublishableKey() {
  const postData = JSON.stringify({
    title: 'Local Development Key'
  });

  const options = {
    hostname: 'localhost',
    port: 9000,
    path: '/admin/publishable-api-keys',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      // Pas d'auth pour le moment, on teste
    }
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      if (res.statusCode === 200 || res.statusCode === 201) {
        const result = JSON.parse(data);
        console.log('\n✅ Publishable Key créée avec succès !');
        console.log('\n📋 Votre clé :', result.publishable_api_key.id);
        console.log('\nAjoutez-la dans storefront/.env.local :');
        console.log('NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=' + result.publishable_api_key.id);
      } else {
        console.log('❌ Erreur:', res.statusCode);
        console.log('Réponse:', data);
        console.log('\n💡 Solution: Créez la clé via l\'admin Medusa:');
        console.log('1. Allez sur http://localhost:9000/app');
        console.log('2. Connectez-vous avec: welcome@mendly.io / 0818Enchante!');
        console.log('3. Settings → API Key Management → Publishable API Keys');
        console.log('4. Create API Key');
        console.log('5. Copiez la clé dans storefront/.env.local');
      }
    });
  });

  req.on('error', (e) => {
    console.error('❌ Erreur:', e.message);
    console.log('\n💡 Le backend est-il démarré sur http://localhost:9000 ?');
  });

  req.write(postData);
  req.end();
}

createPublishableKey();




