import type { SubscriberConfig, SubscriberArgs } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { ODOO_MODULE } from "../modules/odoo"
import OdooModuleService from "../modules/odoo/service"

/**
 * Subscriber pour créer des commandes dans Odoo lors de commandes Medusa
 * 
 * Crée une sale.order dans Odoo avec:
 * - Client (res.partner)
 * - Lignes de commande (sale.order.line)
 * - Stocke l'ID Odoo dans metadata de la commande Medusa
 */

export default async function odooOrderSyncHandler({
  event: { data },
  container,
}: SubscriberArgs<any>) {
  // Check if Odoo is configured
  if (!process.env.ODOO_URL || !process.env.ODOO_API_KEY) {
    return // Silent skip si Odoo non configuré
  }

  try {
    // Vérifier si le module Odoo est enregistré
    let odooService: OdooModuleService
    try {
      odooService = container.resolve(ODOO_MODULE)
    } catch (error) {
      // Module Odoo non enregistré, skip silencieusement
      return
    }

    console.log("🛒 [ODOO ORDER] Commande Medusa créée:", data.id)

    const orderService = container.resolve(Modules.ORDER)

    // Retrieve full order details
    const order = await orderService.retrieveOrder(data.id, {
      relations: ["items", "items.variant", "shipping_address", "billing_address", "customer"],
    })

    // Prepare order data for Odoo
    const orderData = {
      customerEmail: order.email || order.customer?.email || "noemail@medusa.com",
      customerName:
        order.shipping_address?.first_name && order.shipping_address?.last_name
          ? `${order.shipping_address.first_name} ${order.shipping_address.last_name}`
          : order.customer?.first_name && order.customer?.last_name
          ? `${order.customer.first_name} ${order.customer.last_name}`
          : "Customer",
      items: order.items.map((item: any) => ({
        sku: item.variant?.sku || item.variant_sku || `MEDUSA-${item.id}`,
        quantity: item.quantity,
        price: item.unit_price,
        name: item.title,
      })),
      total: order.total,
      shippingAddress: order.shipping_address
        ? {
            address_1: order.shipping_address.address_1,
            city: order.shipping_address.city,
            postal_code: order.shipping_address.postal_code,
            country_code: order.shipping_address.country_code,
          }
        : undefined,
    }

    console.log(`🛒 [ODOO ORDER] Création dans Odoo pour ${orderData.customerEmail}`)

    // Create order in Odoo
    const odooOrderId = await odooService.createOrder(orderData)

    console.log(`✅ [ODOO ORDER] Commande créée dans Odoo: ID ${odooOrderId}`)

    // Store Odoo order ID in Medusa order metadata
    await orderService.updateOrders(data.id, {
      metadata: {
        ...order.metadata,
        odoo_order_id: odooOrderId,
      },
    })

    console.log(`✅ [ODOO ORDER] ID Odoo sauvegardé dans metadata Medusa`)
  } catch (error: any) {
    console.error(`❌ [ODOO ORDER] Erreur de synchronisation:`, error.message)
    // Don't throw - we don't want to block order placement if Odoo sync fails
  }
}

export const config: SubscriberConfig = {
  event: [
    "order.placed",
  ],
}

