import type { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { STOCK_ALERT_MODULE } from "../../../modules/stock-alert"

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
    const stockAlertService = req.scope.resolve(STOCK_ALERT_MODULE) as any
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

    // Vérifier si alerte déjà existante
    const existing = await stockAlertService.listStockAlerts({
      product_id,
      customer_email: email,
      notified: false,
    })
    if (existing && existing.length > 0) {
      return res.status(409).json({ message: "Une alerte existe déjà pour ce produit et cet email" })
    }

    // Créer l'alerte
    const alert = await stockAlertService.createStockAlerts({
      id: `salert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      product_id,
      variant_id: variant_id || null,
      customer_email: email,
      customer_id: customer_id || null,
      notified: false,
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
