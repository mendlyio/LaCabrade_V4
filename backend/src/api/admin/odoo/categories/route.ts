import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ODOO_MODULE } from "../../../../modules/odoo"
import OdooModuleService from "../../../../modules/odoo/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    let odooService: OdooModuleService
    try {
      odooService = req.scope.resolve(ODOO_MODULE)
    } catch (e) {
      return res.status(503).json({ error: "Odoo module not available" })
    }

    const categories = await odooService.fetchCategories()
    
    // Sort alphabetically
    categories.sort((a, b) => a.name.localeCompare(b.name))

    return res.json({ categories })
  } catch (error: any) {
    console.error("Error fetching categories:", error)
    return res.status(500).json({ error: error.message })
  }
}

