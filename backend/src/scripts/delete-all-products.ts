import { Modules } from "@medusajs/framework/utils"
import { MedusaApp } from "@medusajs/framework"

/**
 * Script pour supprimer TOUS les produits de la base de données
 * Usage: npx tsx src/scripts/delete-all-products.ts
 */
async function deleteAllProducts() {
  console.log("🗑️  Démarrage de la suppression de tous les produits...")
  
  const { runApp } = await MedusaApp({
    directory: process.cwd(),
  })

  const { container } = await runApp()
  const productService = container.resolve(Modules.PRODUCT)

  try {
    // Récupérer TOUS les produits (y compris soft-deleted)
    console.log("📊 Récupération de tous les produits...")
    const products = await productService.listProducts(
      {},
      {
        select: ["id", "title"],
        take: 10000,
        withDeleted: true, // Inclure les produits soft-deleted
      }
    )

    if (products.length === 0) {
      console.log("✅ Aucun produit à supprimer")
      process.exit(0)
    }

    console.log(`📦 ${products.length} produits trouvés`)
    
    // Demander confirmation
    console.log("\n⚠️  ATTENTION : Cette action va supprimer TOUS les produits de manière PERMANENTE")
    console.log("⚠️  Cela inclut les produits, variantes, prix, et inventory items")
    console.log("\n🔴 Pour continuer, set la variable d'environnement CONFIRM_DELETE=yes\n")
    
    if (process.env.CONFIRM_DELETE !== "yes") {
      console.log("❌ Suppression annulée (CONFIRM_DELETE != yes)")
      process.exit(1)
    }

    // Supprimer les produits par lots de 50
    const BATCH_SIZE = 50
    let deleted = 0
    
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE)
      const productIds = batch.map((p: any) => p.id)
      
      console.log(`🗑️  Suppression du lot ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(products.length / BATCH_SIZE)} (${batch.length} produits)...`)
      
      try {
        // Hard delete (suppression permanente, pas soft-delete)
        await productService.deleteProducts(productIds)
        deleted += batch.length
        
        // Afficher quelques produits supprimés
        batch.slice(0, 3).forEach((p: any) => {
          console.log(`  ✓ ${p.title} (${p.id})`)
        })
        if (batch.length > 3) {
          console.log(`  ... et ${batch.length - 3} autres`)
        }
      } catch (err: any) {
        console.error(`❌ Erreur lors de la suppression du lot:`, err.message)
      }
    }

    console.log(`\n✅ Suppression terminée: ${deleted}/${products.length} produits supprimés`)
    
    // Vérification finale
    const remaining = await productService.listProducts({}, { take: 1, withDeleted: true })
    if (remaining.length === 0) {
      console.log("✅ Base de données nettoyée avec succès")
    } else {
      console.log(`⚠️  ${remaining.length} produit(s) restant(s) dans la base`)
    }
    
  } catch (error: any) {
    console.error("❌ Erreur:", error.message)
    console.error(error.stack)
    process.exit(1)
  }
  
  process.exit(0)
}

deleteAllProducts()

