import type { SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

/**
 * Subscriber pour créer des commandes dans Odoo lors de commandes Medusa
 * 
 * TODO: Implémenter la création de sale.order dans Odoo
 * - Récupérer les détails de la commande Medusa
 * - Mapper les données vers le format Odoo (sale.order + sale.order.line)
 * - Créer la commande dans Odoo via API JSON-RPC
 * - Stocker l'ID Odoo dans metadata de la commande Medusa
 */

export default async function odooOrderSyncHandler({
  event: { data },
  container,
}: any) {
  console.log("🛒 [ODOO ORDER] Commande créée dans Medusa:", data.id)
  
  // TODO: Résoudre les services nécessaires
  // const odooService = container.resolve("odoo")
  // const orderService = container.resolve(Modules.ORDER)
  
  // TODO: Récupérer la commande complète
  // const order = await orderService.retrieve(data.id, {
  //   relations: ["items", "items.variant", "shipping_address", "billing_address"]
  // })
  
  // TODO: Mapper et créer dans Odoo
  // const odooOrderData = {
  //   partner_id: ..., // Client Odoo ou créer
  //   order_line: order.items.map(item => [...]),
  //   // ... autres champs
  // }
  // const odooOrderId = await odooService.createOrder(odooOrderData)
  
  // TODO: Sauvegarder l'ID Odoo dans metadata
  // await orderService.update(data.id, {
  //   metadata: { odoo_order_id: odooOrderId }
  // })
  
  console.log("⚠️  [ODOO ORDER] Création de commande Odoo non implémentée (TODO)")
}

export const config: SubscriberConfig = {
  event: [
    "order.placed",
    // Ou utiliser "order.completed" selon votre workflow
  ],
}

