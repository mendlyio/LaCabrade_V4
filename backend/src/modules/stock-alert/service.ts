import { MedusaService } from "@medusajs/framework/utils"
import StockAlert from "./models/stock-alert"

class StockAlertModuleService extends MedusaService({ StockAlert }) {
  async createAlert(data: {
    product_id: string
    variant_id?: string
    customer_email: string
    customer_id?: string
  }) {
    // Vérifier si une alerte active existe déjà
    const existing = await this.listStockAlerts({
      product_id: data.product_id,
      customer_email: data.customer_email,
      notified: false,
      ...(data.variant_id ? { variant_id: data.variant_id } : {}),
    })

    if (existing && existing.length > 0) {
      throw new Error("Une alerte existe déjà pour ce produit et cet email")
    }

    return this.createStockAlerts({
      id: `salert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      product_id: data.product_id,
      variant_id: data.variant_id || null,
      customer_email: data.customer_email,
      customer_id: data.customer_id || null,
      notified: false,
    })
  }

  async getAlertsByProduct(productId: string, variantId?: string) {
    return this.listStockAlerts({
      product_id: productId,
      notified: false,
      ...(variantId ? { variant_id: variantId } : {}),
    })
  }

  async markAsNotified(alertIds: string[]) {
    return Promise.all(
      alertIds.map((id) => this.updateStockAlerts({ id, notified: true }))
    )
  }
}

export default StockAlertModuleService
