import { Modules } from "@medusajs/framework/utils"
import { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa"
import {
  fieldsFromFulfillmentData,
  persistBpostLabelOnOrder,
} from "../modules/bpost/persist-label-metadata"

/**
 * Subscriber Bpost — persistance metadata uniquement
 *
 * La création du shipment et de l'étiquette reste dans
 * BpostFulfillmentProviderService.createFulfillment().
 * Ce handler ne recrée PAS de shipment (doublon historique).
 *
 * createFulfillment ne peut pas écrire order.metadata : son container
 * est le cradle Awilix du module fulfillment (pas de .resolve).
 * On copie fulfillment.data → order.metadata ici, avec le scope app.
 */
export default async function bpostCreateShipmentHandler({
  event: { data },
  container,
}: SubscriberArgs<any>) {
  try {
    const fulfillmentId = data?.id
    if (!fulfillmentId) {
      return
    }

    const fulfillmentModule = container.resolve(Modules.FULFILLMENT) as any
    const orderModule = container.resolve(Modules.ORDER) as any

    const fulfillment = await fulfillmentModule.retrieveFulfillment(fulfillmentId, {
      relations: ["order"],
    })
    const fd = (fulfillment?.data || {}) as Record<string, any>

    if (fd.auto_label_skipped) {
      return
    }

    const providerId = String(fulfillment?.provider_id || "").toLowerCase()
    const looksBpost =
      providerId.includes("bpost") ||
      Boolean(fd.label_data || fd.label_url || fd.shipmentId || fd.clientReference)
    if (!looksBpost) {
      return
    }

    const orderId =
      data?.order_id ||
      fulfillment?.order_id ||
      fulfillment?.order?.id
    if (!orderId) {
      console.warn(
        `[Bpost] fulfillment.created ${fulfillmentId}: pas d'order_id, metadata non persistées`
      )
      return
    }

    const persisted = await persistBpostLabelOnOrder(
      orderModule,
      orderId,
      fieldsFromFulfillmentData(fd)
    )
    if (persisted) {
      console.log(`[Bpost] Métadonnées étiquette persistées sur ${orderId}`)
    }
  } catch (e: any) {
    console.warn(
      `[Bpost] persist metadata after fulfillment.created: ${e?.message}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "fulfillment.created",
}
