import type { Logger } from "@medusajs/framework/types"

type StockAlertData = {
  id: string
  product_id: string
  variant_id?: string | null
  customer_email: string
  customer_id?: string | null
  notified: boolean
  created_at: Date
  updated_at: Date
}

type CreateStockAlertInput = {
  product_id: string
  variant_id?: string
  customer_email: string
  customer_id?: string
}

/**
 * Service simple pour gérer les alertes de retour en stock
 * Compatible Medusa v2 avec injection de dépendances standard
 */
class StockAlertService {
  protected readonly logger_: Logger
  protected readonly manager_: any

  constructor(container: any) {
    this.logger_ = container.logger
    this.manager_ = container.manager
  }

  /**
   * Créer une alerte de retour en stock
   */
  async createAlert(data: CreateStockAlertInput): Promise<StockAlertData> {
    const manager = this.manager_

    // Vérifier si une alerte existe déjà
    const existing = await manager.execute(
      `SELECT * FROM stock_alerts 
       WHERE product_id = $1 
       AND customer_email = $2 
       AND notified = false
       AND (variant_id = $3 OR (variant_id IS NULL AND $3 IS NULL))
       AND deleted_at IS NULL`,
      [data.product_id, data.customer_email, data.variant_id || null]
    )

    if (existing && existing.length > 0) {
      throw new Error("Une alerte existe déjà pour ce produit et cet email")
    }

    // Générer un ID unique
    const id = `salert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Créer l'alerte
    await manager.execute(
      `INSERT INTO stock_alerts 
       (id, product_id, variant_id, customer_email, customer_id, notified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, false, NOW(), NOW())`,
      [id, data.product_id, data.variant_id || null, data.customer_email, data.customer_id || null]
    )

    this.logger_.info(`Stock alert created: ${id} for product ${data.product_id}`)

    return {
      id,
      product_id: data.product_id,
      variant_id: data.variant_id || null,
      customer_email: data.customer_email,
      customer_id: data.customer_id || null,
      notified: false,
      created_at: new Date(),
      updated_at: new Date()
    }
  }

  /**
   * Récupérer les alertes pour un produit/variante
   */
  async getAlertsByProduct(productId: string, variantId?: string): Promise<StockAlertData[]> {
    const manager = this.manager_

    const alerts = await manager.execute(
      variantId
        ? `SELECT * FROM stock_alerts 
           WHERE product_id = $1 
           AND variant_id = $2 
           AND notified = false 
           AND deleted_at IS NULL`
        : `SELECT * FROM stock_alerts 
           WHERE product_id = $1 
           AND notified = false 
           AND deleted_at IS NULL`,
      variantId ? [productId, variantId] : [productId]
    )

    return alerts || []
  }

  /**
   * Marquer des alertes comme notifiées
   */
  async markAsNotified(alertIds: string[]): Promise<void> {
    if (!alertIds || alertIds.length === 0) return

    const manager = this.manager_
    const placeholders = alertIds.map((_, i) => `$${i + 1}`).join(',')

    await manager.execute(
      `UPDATE stock_alerts 
       SET notified = true, updated_at = NOW() 
       WHERE id IN (${placeholders})`,
      alertIds
    )

    this.logger_.info(`Marked ${alertIds.length} stock alerts as notified`)
  }

  /**
   * Supprimer une alerte (soft delete)
   */
  async deleteAlert(alertId: string): Promise<void> {
    const manager = this.manager_
    
    await manager.execute(
      `UPDATE stock_alerts 
       SET deleted_at = NOW() 
       WHERE id = $1`,
      [alertId]
    )

    this.logger_.info(`Stock alert deleted: ${alertId}`)
  }
}

export default StockAlertService
