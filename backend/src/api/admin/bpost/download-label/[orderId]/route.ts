import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BPOST_MODULE } from "../../../../../modules/bpost"
import BpostModuleService from "../../../../../modules/bpost/service"
import { Modules } from "@medusajs/framework/utils"

/**
 * GET /admin/bpost/download-label/:orderId
 *
 * Proxy de téléchargement pour l'étiquette Bpost d'une commande.
 * Cherche d'abord les données PDF en base64 dans les métadonnées de la commande,
 * puis dans les fulfillments, sinon re-demande l'étiquette à l'API Bpost.
 * Retourne le PDF directement en streaming pour téléchargement immédiat.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { orderId } = req.params as { orderId: string }
    const orderService = req.scope.resolve(Modules.ORDER)
    const order = await orderService.retrieveOrder(orderId)
    const meta = (order.metadata as Record<string, any>) || {}

    // Cas 1 : données PDF base64 déjà stockées dans les métadonnées
    if (meta.bpost_label_data) {
      console.log(`[Bpost] download-label ${orderId}: PDF trouvé dans metadata.bpost_label_data`)
      return sendPdfBuffer(res, Buffer.from(meta.bpost_label_data as string, "base64"), orderId)
    }

    // Cas 2 : URL directe déjà stockée (data URI ou URL externe)
    const storedUrl = meta.bpost_label_url as string | undefined
    if (storedUrl) {
      if (storedUrl.startsWith("data:application/pdf;base64,")) {
        const base64 = storedUrl.split(",")[1]
        console.log(`[Bpost] download-label ${orderId}: PDF trouvé dans metadata.bpost_label_url (data URI)`)
        return sendPdfBuffer(res, Buffer.from(base64, "base64"), orderId)
      }
      if (storedUrl.startsWith("http")) {
        try {
          console.log(`[Bpost] download-label ${orderId}: fetch PDF depuis URL externe: ${storedUrl.slice(0, 100)}`)
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
    }

    // Cas 3 : re-demander l'étiquette à Bpost via le shipment ID
    const shipmentId = meta.bpost_shipment_id as string | undefined
    if (!shipmentId) {
      return res.status(404).json({
        error: "Aucun envoi Bpost trouvé pour cette commande. Veuillez d'abord générer l'étiquette.",
      })
    }

    console.log(`[Bpost] download-label ${orderId}: re-demande label via API Bpost (shipmentId=${shipmentId})`)
    const svc = req.scope.resolve(BPOST_MODULE) as BpostModuleService
    const clientReference = meta.bpost_client_reference as string | undefined
    const { labelUrl, labelData } = await svc.getLabel(shipmentId, clientReference)

    if (labelData) {
      try {
        await orderService.updateOrders([{
          id: orderId,
          metadata: { ...meta, bpost_label_data: labelData },
        }])
      } catch {}
      return sendPdfBuffer(res, Buffer.from(labelData, "base64"), orderId)
    }

    if (labelUrl) {
      if (labelUrl.startsWith("data:application/pdf;base64,")) {
        const base64 = labelUrl.split(",")[1]
        return sendPdfBuffer(res, Buffer.from(base64, "base64"), orderId)
      }
      if (labelUrl.startsWith("http")) {
        try {
          const pdfRes = await fetch(labelUrl)
          if (pdfRes.ok) {
            const arrayBuf = await pdfRes.arrayBuffer()
            const buffer = Buffer.from(arrayBuf)
            if (buffer.length > 100 && buffer.subarray(0, 5).toString("utf-8") === "%PDF-") {
              return sendPdfBuffer(res, buffer, orderId)
            }
          }
        } catch {}
        return res.redirect(302, labelUrl)
      }
    }

    return res.status(404).json({
      error: "Étiquette non disponible. L'API Bpost n'a pas retourné de données d'étiquette. Essayez de régénérer l'étiquette.",
    })
  } catch (e: any) {
    console.error("[Bpost] Erreur download-label:", e?.message, e?.stack?.split("\n").slice(0, 3).join("\n"))
    return res.status(500).json({ error: e.message })
  }
}

function sendPdfBuffer(res: MedusaResponse, buffer: Buffer, orderId: string) {
  res.setHeader("Content-Type", "application/pdf")
  res.setHeader("Content-Disposition", `attachment; filename="bpost-label-${orderId}.pdf"`)
  res.setHeader("Content-Length", buffer.length)
  return res.send(buffer)
}
