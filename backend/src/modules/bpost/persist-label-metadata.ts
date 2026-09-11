/**
 * Fusionne les champs d'étiquette Bpost dans order.metadata
 * sans écraser les clés déjà présentes (bons cadeaux, point relais, etc.).
 *
 * createFulfillment ne peut pas appeler container.resolve (cradle Awilix).
 * Le subscriber fulfillment.created utilise ce helper avec le scope app.
 */

export type BpostLabelPersistFields = {
  shipmentId?: string | null
  clientReference?: string | null
  labelUrl?: string | null
  labelData?: string | null
  trackingNumber?: string | null
}

export function fieldsFromFulfillmentData(
  data: Record<string, any> | undefined | null
): BpostLabelPersistFields {
  const d = data || {}
  return {
    shipmentId: d.shipmentId || d.shipment_id || null,
    clientReference: d.clientReference || d.client_reference || null,
    labelUrl: d.label_url || d.labelUrl || null,
    labelData: d.label_data || d.labelData || d.bpost_label_data || null,
    trackingNumber: d.tracking_number || d.trackingNumber || d.bpost_tracking || null,
  }
}

export function buildBpostLabelMetadata(
  existingMeta: Record<string, any> | undefined | null,
  fields: BpostLabelPersistFields
): Record<string, any> | null {
  const existing = existingMeta || {}
  const shipmentId = fields.shipmentId || fields.clientReference || null
  const clientReference = fields.clientReference || fields.shipmentId || null

  if (!fields.labelUrl && !fields.labelData && !shipmentId && !clientReference) {
    return null
  }

  const nextMeta: Record<string, any> = { ...existing }
  let changed = false

  if (shipmentId && !existing.bpost_shipment_id) {
    nextMeta.bpost_shipment_id = shipmentId
    changed = true
  }
  if (clientReference && !existing.bpost_client_reference) {
    nextMeta.bpost_client_reference = clientReference
    changed = true
  }
  if (fields.labelUrl && !existing.bpost_label_url) {
    nextMeta.bpost_label_url = fields.labelUrl
    changed = true
  }
  if (fields.labelData && !existing.bpost_label_data) {
    nextMeta.bpost_label_data = fields.labelData
    changed = true
  }
  if (fields.trackingNumber && !existing.bpost_tracking) {
    nextMeta.bpost_tracking = fields.trackingNumber
    changed = true
  }

  return changed ? nextMeta : null
}

export async function persistBpostLabelOnOrder(
  orderService: {
    retrieveOrder: (id: string) => Promise<any>
    updateOrders: (updates: Array<{ id: string; metadata: Record<string, any> }>) => Promise<any>
  },
  orderId: string,
  fields: BpostLabelPersistFields
): Promise<boolean> {
  const order = await orderService.retrieveOrder(orderId)
  const nextMeta = buildBpostLabelMetadata(
    (order?.metadata as Record<string, any>) || {},
    fields
  )
  if (!nextMeta) {
    return false
  }
  await orderService.updateOrders([{ id: orderId, metadata: nextMeta }])
  return true
}
