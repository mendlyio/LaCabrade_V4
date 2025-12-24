const fetch = require('node-fetch')

async function testAPI() {
  try {
    // Tester l'API Medusa Admin pour récupérer le produit
    const productId = 'prod_01KCPBVC4D2G4PW5T9E1PSADHP'
    const apiUrl = 'https://backend-production-c7a4.up.railway.app'
    
    console.log('🔍 Test API Medusa Admin\n')
    console.log('URL:', `${apiUrl}/admin/products/${productId}`)
    console.log('─'.repeat(80))
    
    const response = await fetch(`${apiUrl}/admin/products/${productId}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      console.log('❌ Erreur:', response.status, response.statusText)
      return
    }
    
    const data = await response.json()
    const product = data.product
    
    console.log('\n📦 Produit:', product.title)
    console.log(`\n📊 Variantes (${product.variants?.length || 0}):`)
    
    // Afficher les 3 premières variantes
    const variants = product.variants?.slice(0, 3) || []
    variants.forEach(v => {
      console.log(`\n🔹 ${v.title} (SKU: ${v.sku})`)
      
      // Prix
      if (v.prices && v.prices.length > 0) {
        console.log('   💰 Prix:')
        v.prices.forEach(p => {
          const amount = p.amount / 100
          console.log(`      - ${amount.toFixed(2)}€`)
        })
      } else {
        console.log('   ❌ Pas de prix dans l\'API')
      }
      
      // Stock
      if (v.inventory_quantity !== undefined) {
        console.log(`   📦 Stock: ${v.inventory_quantity}`)
      } else {
        console.log('   ❌ Pas de stock dans l\'API')
      }
    })
    
    console.log('\n' + '─'.repeat(80))
    
  } catch (error) {
    console.error('❌ Erreur:', error.message)
  }
}

testAPI()
