import { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa"
import { syncProductToIndex, removeProductFromIndex } from "../utils/meilisearch-index"
import { getMeiliClient } from "../utils/meilisearch"

/**
 * Maintient l'index Meilisearch à jour à chaque création / modification /
 * suppression de produit (y compris via la synchro Odoo qui émet product.updated).
 * No-op si Meilisearch n'est pas configuré.
 */
export default async function productMeilisearchSyncHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  if (!getMeiliClient()) return

  const productId = event.data?.id
  if (!productId) return

  try {
    if (event.name === "product.deleted") {
      await removeProductFromIndex(productId)
    } else {
      await syncProductToIndex(container, productId)
    }
  } catch (e: any) {
    console.warn(`[Meilisearch sync] ${event.name} ${productId}: ${e?.message}`)
  }
}

export const config: SubscriberConfig = {
  event: ["product.created", "product.updated", "product.deleted"],
}
