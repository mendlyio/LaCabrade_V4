import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { odooSyncCache } from "../lib/odoo-cache"

/**
 * Subscriber: Invalide le cache Odoo quand un produit est supprimé
 * Permet de mettre à jour le statut de synchronisation dans le widget
 */
export default async function productDeletedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  console.log(`🗑️  [ODOO] Produit supprimé (${data.id}), invalidation du cache`)
  
  // Invalider le cache pour que le widget Odoo affiche le bon statut
  odooSyncCache.invalidate()
}

export const config: SubscriberConfig = {
  event: "product.deleted",
}

