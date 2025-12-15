import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { IRegionModuleService } from "@medusajs/framework/types"

/**
 * Script pour activer les prix TTC (toutes taxes comprises)
 * En Belgique, les prix doivent être affichés TTC avec la TVA de 21% déjà incluse
 */
export default async function enableTaxInclusivePricing({ container }: ExecArgs) {
  const regionModuleService: IRegionModuleService = container.resolve(Modules.REGION)
  
  console.log("\n🔧 Activation des prix TTC (tax-inclusive pricing)...\n")
  
  try {
    // Récupérer toutes les régions
    const regions = await regionModuleService.listRegions()
    
    if (!regions || regions.length === 0) {
      console.error("❌ Aucune région trouvée. Créez d'abord une région.")
      return
    }
    
    console.log(`📍 ${regions.length} région(s) trouvée(s):\n`)
    
    for (const region of regions) {
      console.log(`   - ${region.name} (${region.currency_code.toUpperCase()})`)
      console.log(`     Avant: tax_inclusive = ${(region as any).automatic_taxes || false}`)
      
      // Mettre à jour la région pour activer les prix TTC
      await regionModuleService.updateRegions([{
        selector: { id: region.id },
        update: { 
          automatic_taxes: true,
          // @ts-ignore - tax_inclusive_pricing existe mais pas dans les types
          tax_inclusive_pricing: true,
        },
      }])
      
      console.log(`     ✅ Après: tax_inclusive = true\n`)
    }
    
    console.log("✅ Prix TTC activés pour toutes les régions !\n")
    console.log("📝 Note importante:")
    console.log("   Les prix des produits et de la livraison sont maintenant")
    console.log("   considérés comme incluant déjà la TVA de 21%.\n")
    console.log("   Exemple:")
    console.log("   - Prix affiché: 10€ TTC")
    console.log("   - Prix HT calculé: 8.26€")
    console.log("   - TVA (21%): 1.74€")
    console.log("   - Total client: 10€\n")
    
  } catch (error) {
    console.error("❌ Erreur lors de l'activation des prix TTC:", error)
    throw error
  }
}

