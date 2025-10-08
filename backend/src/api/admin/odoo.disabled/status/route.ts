import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ODOO_MODULE } from "../../../../modules/odoo"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    // Vérifier si le module Odoo est configuré
    const hasOdooConfig = !!(
      process.env.ODOO_URL &&
      process.env.ODOO_DB_NAME &&
      process.env.ODOO_USERNAME &&
      process.env.ODOO_API_KEY
    )

    if (!hasOdooConfig) {
      return res.json({
        configured: false,
        message: "Module Odoo non configuré. Veuillez ajouter les variables d'environnement ODOO_URL, ODOO_DB_NAME, ODOO_USERNAME et ODOO_API_KEY.",
      })
    }

    // Essayer de résoudre le service Odoo
    try {
      const odooService = req.scope.resolve(ODOO_MODULE)
      
      return res.json({
        configured: true,
        connected: true,
        url: process.env.ODOO_URL,
        database: process.env.ODOO_DB_NAME,
        username: process.env.ODOO_USERNAME,
        message: "Module Odoo configuré et actif",
      })
    } catch (error) {
      return res.json({
        configured: true,
        connected: false,
        message: "Module Odoo configuré mais non disponible",
        error: error.message,
      })
    }
  } catch (error) {
    return res.status(500).json({
      configured: false,
      connected: false,
      message: "Erreur lors de la vérification du statut",
      error: error.message,
    })
  }
}

