import { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'

/**
 * Subscriber Bpost — DÉSACTIVÉ
 *
 * La création du shipment et de l'étiquette est déjà gérée par
 * BpostFulfillmentProviderService.createFulfillment() dans
 * backend/src/modules/bpost-fulfillment/service.ts.
 *
 * Ce subscriber créait un doublon (2 shipments Bpost pour 1 fulfillment).
 * Il est conservé comme no-op au cas où on voudrait le réactiver.
 */
export default async function bpostCreateShipmentHandler({
  event: { data },
}: SubscriberArgs<any>) {
  // No-op — voir BpostFulfillmentProviderService.createFulfillment()
}

export const config: SubscriberConfig = {
  event: 'fulfillment.created',
}

