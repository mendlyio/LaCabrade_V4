import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

/**
 * Route admin pour activer les prix TTC (à appeler une seule fois)
 * GET /admin/fix-taxes
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const regionService = req.scope.resolve(Modules.REGION)
    
    // Récupérer toutes les régions
    const regions = await regionService.listRegions()
    
    const results = []
    
    for (const region of regions) {
      const before = (region as any).automatic_taxes || false
      
      // Activer les prix TTC
      await regionService.updateRegions(region.id, {
        automatic_taxes: true,
      })
      
      results.push({
        region: region.name,
        currency: region.currency_code,
        before_tax_inclusive: before,
        after_tax_inclusive: true,
      })
      
      console.log(`✅ Prix TTC activés pour région ${region.name}`)
    }
    
    return res.json({
      success: true,
      message: "Prix TTC activés pour toutes les régions !",
      regions: results,
      note: "Les prix affichés (10€, 5€) incluent maintenant la TVA. Le client paiera exactement ce qui est affiché."
    })
    
  } catch (e: any) {
    console.error("[FixTaxes] Erreur:", e)
    return res.status(500).json({ 
      success: false, 
      error: e.message 
    })
  }
}

