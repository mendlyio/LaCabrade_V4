import type { SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

/**
 * Subscriber pour synchroniser le stock avec Odoo lors d'événements Medusa
 * 
 * TODO: Implémenter la synchronisation bi-directionnelle du stock
 * - Lors d'une vente dans Medusa → diminuer stock dans Odoo
 * - Lors d'un ajustement de stock dans Medusa → mettre à jour Odoo
 * - Configurer un webhook Odoo → mettre à jour Medusa quand stock change dans Odoo
 */

export default async function odooStockSyncHandler({
  event: { data },
  container,
}: any) {
  console.log("📦 [ODOO STOCK] Événement de stock détecté:", data)
  
  // TODO: Résoudre le service Odoo
  // const odooService = container.resolve("odoo")
  
  // TODO: Implémenter la logique de synchronisation
  // Exemple:
  // if (data.variantId && data.quantity) {
  //   await odooService.updateStock(data.variantId, data.quantity)
  // }
  
  console.log("⚠️  [ODOO STOCK] Synchronisation du stock non implémentée (TODO)")
}

export const config: SubscriberConfig = {
  event: [
    // Événements liés au stock
    "inventory-item.updated",
    "reservation-item.created",
    // Ajouter d'autres événements selon les besoins
  ],
}

