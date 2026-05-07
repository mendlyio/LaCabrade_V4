import type { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa"

/**
 * Filet de sécurité asynchrone pour la livraison des paniers 100% bons cadeau.
 *
 * La logique principale est dans le hook synchrone
 * backend/src/workflows/restore-outlet-prices-hook.ts qui s'exécute
 * dans refreshCartItemsWorkflow avant que la réponse soit renvoyée au
 * storefront.
 *
 * Ce subscriber est conservé comme no-op pour ne pas casser d'éventuelles
 * références. La logique est entièrement dans le hook.
 */
export default async function cartGiftCardShippingFixHandler(
  _args: SubscriberArgs<{ id: string }>
) {
  // Logique déplacée dans src/workflows/restore-outlet-prices-hook.ts
}

export const config: SubscriberConfig = {
  event: "cart.updated",
}
