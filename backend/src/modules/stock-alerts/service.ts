import { MedusaService } from "@medusajs/framework/utils"
import StockAlert from "./models/stock-alert"

type CreateStockAlertDTO = {
  product_id: string
  variant_id?: string
  customer_email: string
  customer_id?: string
}

class StockAlertService extends MedusaService({
  StockAlert,
}) {
  async createAlert(data: CreateStockAlertDTO) {
    // Vérifier si une alerte existe déjà pour ce produit/variante et cet email
    const existingAlert = await this.listStockAlerts({
      filters: {
        product_id: data.product_id,
        variant_id: data.variant_id || null,
        customer_email: data.customer_email,
        notified: false,
      },
    })

    if (existingAlert && existingAlert.length > 0) {
      throw new Error("Une alerte existe déjà pour ce produit et cet email")
    }

    return await this.createStockAlerts(data)
  }

  async getAlertsByProduct(productId: string, variantId?: string) {
    return await this.listStockAlerts({
      filters: {
        product_id: productId,
        variant_id: variantId || null,
        notified: false,
      },
    })
  }

  async markAsNotified(alertIds: string[]) {
    return await this.updateStockAlerts(
      alertIds.map((id) => ({
        id,
        notified: true,
      }))
    )
  }

  async deleteAlert(alertId: string) {
    return await this.deleteStockAlerts([alertId])
  }

  async deleteAlertsByEmail(email: string) {
    const alerts = await this.listStockAlerts({
      filters: {
        customer_email: email,
        notified: false,
      },
    })

    if (alerts && alerts.length > 0) {
      const alertIds = alerts.map((alert) => alert.id)
      return await this.deleteStockAlerts(alertIds)
    }

    return { deleted: 0 }
  }
}

export default StockAlertService
