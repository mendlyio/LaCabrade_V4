import type { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import StockAlertService from "../../../services/stock-alert"

/**
 * POST /store/stock-alerts
 * Créer une alerte de retour en stock
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { product_id, variant_id, email, customer_id } = req.body as {
    product_id: string
    variant_id?: string
    email: string
    customer_id?: string
  }

  // Validation
  if (!product_id || !email) {
    return res.status(400).json({
      message: "product_id et email sont requis",
    })
  }

  // Valider l'email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      message: "Email invalide",
    })
  }

  try {
    const stockAlertService: StockAlertService = req.scope.resolve("stockAlertService")
    const productModuleService = req.scope.resolve(Modules.PRODUCT)

    // Vérifier que le produit existe
    const product = await productModuleService.retrieveProduct(product_id, {
      relations: ["variants"],
    })

    if (!product) {
      return res.status(404).json({
        message: "Produit introuvable",
      })
    }

    // Si variant_id fourni, vérifier qu'il existe
    if (variant_id) {
      const variant = product.variants?.find((v: any) => v.id === variant_id)
      if (!variant) {
        return res.status(404).json({
          message: "Variante introuvable",
        })
      }
    }

    // Créer l'alerte
    const alert = await stockAlertService.createAlert({
      product_id,
      variant_id,
      customer_email: email,
      customer_id,
    })

    return res.status(201).json({
      message: "Alerte créée avec succès",
      alert,
    })
  } catch (error: any) {
    console.error("Error creating stock alert:", error)
    
    if (error.message?.includes("alerte existe déjà")) {
      return res.status(409).json({
        message: error.message,
      })
    }

    return res.status(500).json({
      message: "Erreur lors de la création de l'alerte",
      error: error.message,
    })
  }
}
