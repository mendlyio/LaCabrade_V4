import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BPOST_MODULE } from "../../../../../modules/bpost"
import BpostModuleService from "../../../../../modules/bpost/service"
import { Modules } from "@medusajs/framework/utils"

/**
 * GET /admin/bpost/download-label/:orderId
 *
 * Proxy de téléchargement pour l'étiquette Bpost d'une commande.
 * Cherche dans cet ordre :
 *  1. metadata.bpost_label_data (base64)
 *  2. metadata.bpost_label_url (data URI / URL)
 *  3. fulfillments Bpost (data.label_data / data.label_url)
 *  4. re-demande API Bpost via shipment id metadata OU orderId (ClientReferenceCode = order.id)
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { orderId } = req.params as { orderId: string }
    const orderService = req.scope.resolve(Modules.ORDER)
    const order = await orderService.retrieveOrder(orderId)
    const meta = (order.metadata as Record<string, any>) || {}

    // Cas 1 : PDF base64 en metadata
    if (meta.bpost_label_data) {
      console.log(`[Bpost] download-label ${orderId}: PDF trouvé dans metadata.bpost_label_data`)
      return sendPdfBuffer(res, Buffer.from(meta.bpost_label_data as string, "base64"), orderId)
    }

    // Cas 2 : URL / data URI en metadata
    const fromMetaUrl = await tryUrlOrDataUri(
      meta.bpost_label_url as string | undefined,
      orderId,
      orderService,
      meta,
      res,
      "metadata.bpost_label_url"
    )
    if (fromMetaUrl) return fromMetaUrl

    // Cas 3 : fulfillments Bpost (createFulfillment stocke label_url / label_data sans toujours persister metadata)
    const fulfillmentPdf = await tryFulfillmentLabel(req, orderId, orderService, meta, res)
    if (fulfillmentPdf) return fulfillmentPdf

    // Cas 4 : re-demande API Bpost
    // ClientReferenceCode = order.id (ou bpost_client_reference / bpost_shipment_id)
    const shipmentId =
      (meta.bpost_shipment_id as string | undefined) ||
      (meta.bpost_client_reference as string | undefined) ||
      orderId
    const clientReference =
      (meta.bpost_client_reference as string | undefined) ||
      (meta.bpost_shipment_id as string | undefined) ||
      orderId

    console.log(
      `[Bpost] download-label ${orderId}: re-demande label via API Bpost (shipmentId=${shipmentId})`
    )
    const svc = req.scope.resolve(BPOST_MODULE) as BpostModuleService
    const { labelUrl, labelData } = await svc.getLabel(shipmentId, clientReference)

    if (labelData) {
      try {
        await orderService.updateOrders([{
          id: orderId,
          metadata: {
            ...meta,
            bpost_label_data: labelData,
            bpost_shipment_id: meta.bpost_shipment_id || shipmentId,
            bpost_client_reference: meta.bpost_client_reference || clientReference,
            bpost_label_url: labelUrl || meta.bpost_label_url,
          },
        }])
      } catch {}
      return sendPdfBuffer(res, Buffer.from(labelData, "base64"), orderId)
    }

    if (labelUrl) {
      const fromApiUrl = await tryUrlOrDataUri(
        labelUrl,
        orderId,
        orderService,
        meta,
        res,
        "Bpost getLabel"
      )
      if (fromApiUrl) return fromApiUrl
    }

    return res.status(404).json({
      error:
        "Étiquette non disponible. L'API Bpost n'a pas retourné de données d'étiquette. Essayez de régénérer l'étiquette.",
    })
  } catch (e: any) {
    console.error(
      "[Bpost] Erreur download-label:",
      e?.message,
      e?.stack?.split("\n").slice(0, 3).join("\n")
    )
    return res.status(500).json({ error: e.message })
  }
}

async function tryFulfillmentLabel(
  req: MedusaRequest,
  orderId: string,
  orderService: any,
  meta: Record<string, any>,
  res: MedusaResponse
) {
  try {
    let fulfillments: any[] = []

    // Medusa 2 : remote query order → fulfillments
    try {
      const query = req.scope.resolve("query") as any
      const { data } = await query.graph({
        entity: "order",
        fields: [
          "id",
          "fulfillments.id",
          "fulfillments.provider_id",
          "fulfillments.data",
        ],
        filters: { id: orderId },
      })
      fulfillments = data?.[0]?.fulfillments || []
    } catch {
      // Fallback : Fulfillment module si dispo
      try {
        const fulfillmentModule = req.scope.resolve(Modules.FULFILLMENT) as any
        if (typeof fulfillmentModule.listFulfillments === "function") {
          fulfillments = await fulfillmentModule.listFulfillments(
            { order_id: orderId },
            { take: 20 }
          )
        }
      } catch {}
    }

    const bpostFulfillments = (fulfillments || []).filter((f: any) =>
      (f.provider_id || "").toString().toLowerCase().includes("bpost")
    )

    for (const f of bpostFulfillments) {
      const data = f?.data || {}
      const labelData = data.label_data || data.labelData || data.bpost_label_data
      if (labelData && typeof labelData === "string" && labelData.length > 100) {
        console.log(`[Bpost] download-label ${orderId}: PDF trouvé dans fulfillment.data.label_data`)
        try {
          await orderService.updateOrders([{
            id: orderId,
            metadata: {
              ...meta,
              bpost_label_data: labelData,
              bpost_shipment_id:
                meta.bpost_shipment_id || data.shipmentId || data.clientReference,
              bpost_client_reference:
                meta.bpost_client_reference || data.clientReference || data.shipmentId,
              bpost_label_url: data.label_url || meta.bpost_label_url,
              bpost_tracking:
                meta.bpost_tracking || data.tracking_number || data.trackingNumber,
            },
          }])
        } catch {}
        return sendPdfBuffer(res, Buffer.from(labelData, "base64"), orderId)
      }

      const labelUrl = data.label_url || data.labelUrl
      if (labelUrl) {
        const fromUrl = await tryUrlOrDataUri(
          labelUrl,
          orderId,
          orderService,
          {
            ...meta,
            bpost_shipment_id:
              meta.bpost_shipment_id || data.shipmentId || data.clientReference,
          },
          res,
          "fulfillment.data.label_url"
        )
        if (fromUrl) return fromUrl
      }
    }
  } catch (e: any) {
    console.warn(`[Bpost] download-label: lecture fulfillments échouée: ${e?.message}`)
  }
  return null
}

async function tryUrlOrDataUri(
  storedUrl: string | undefined,
  orderId: string,
  orderService: any,
  meta: Record<string, any>,
  res: MedusaResponse,
  source: string
) {
  if (!storedUrl) return null

  if (storedUrl.startsWith("data:application/pdf;base64,")) {
    const base64 = storedUrl.split(",")[1]
    console.log(`[Bpost] download-label ${orderId}: PDF trouvé dans ${source} (data URI)`)
    try {
      await orderService.updateOrders([{
        id: orderId,
        metadata: { ...meta, bpost_label_data: base64 },
      }])
    } catch {}
    return sendPdfBuffer(res, Buffer.from(base64, "base64"), orderId)
  }

  if (storedUrl.startsWith("http")) {
    try {
      console.log(
        `[Bpost] download-label ${orderId}: fetch PDF depuis ${source}: ${storedUrl.slice(0, 100)}`
      )
      const pdfRes = await fetch(storedUrl)
      if (pdfRes.ok) {
        const arrayBuf = await pdfRes.arrayBuffer()
        const buffer = Buffer.from(arrayBuf)
        if (buffer.length > 100 && buffer.subarray(0, 5).toString("utf-8") === "%PDF-") {
          try {
            await orderService.updateOrders([{
              id: orderId,
              metadata: { ...meta, bpost_label_data: buffer.toString("base64") },
            }])
          } catch {}
          return sendPdfBuffer(res, buffer, orderId)
        }
      }
    } catch (fetchErr: any) {
      console.warn(`[Bpost] download-label: fetch URL échoué: ${fetchErr?.message}`)
    }
    return res.redirect(302, storedUrl)
  }

  return null
}

function sendPdfBuffer(res: MedusaResponse, buffer: Buffer, orderId: string) {
  res.setHeader("Content-Type", "application/pdf")
  res.setHeader("Content-Disposition", `attachment; filename="bpost-label-${orderId}.pdf"`)
  res.setHeader("Content-Length", buffer.length)
  return res.send(buffer)
}
