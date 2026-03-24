import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BPOST_MODULE } from "../../../../../modules/bpost"
import BpostModuleService from "../../../../../modules/bpost/service"
import { Modules } from "@medusajs/framework/utils"

/**
 * GET /admin/bpost/download-label/:orderId
 *
 * Proxy de téléchargement pour l'étiquette Bpost d'une commande.
 * Cherche d'abord les données PDF en base64 dans les métadonnées de la commande,
 * sinon re-demande l'étiquette à l'API Bpost via le shipment ID stocké.
 * Retourne le PDF directement en streaming pour téléchargement immédiat.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { orderId } = req.params as { orderId: string }
    const orderService = req.scope.resolve(Modules.ORDER)
    const order = await orderService.retrieveOrder(orderId)
    const meta = (order.metadata as Record<string, any>) || {}

    // Cas 1 : données PDF base64 déjà stockées dans les métadonnées (évite un appel Bpost)
    if (meta.bpost_label_data) {
      const buffer = Buffer.from(meta.bpost_label_data as string, "base64")
      res.setHeader("Content-Type", "application/pdf")
      res.setHeader("Content-Disposition", `attachment; filename="bpost-label-${orderId}.pdf"`)
      res.setHeader("Content-Length", buffer.length)
      return res.send(buffer)
    }

    // Cas 2 : URL directe déjà stockée (peut être une data URI ou une URL externe)
    const storedUrl = meta.bpost_label_url as string | undefined
    if (storedUrl) {
      if (storedUrl.startsWith("data:application/pdf;base64,")) {
        const base64 = storedUrl.split(",")[1]
        const buffer = Buffer.from(base64, "base64")
        res.setHeader("Content-Type", "application/pdf")
        res.setHeader("Content-Disposition", `attachment; filename="bpost-label-${orderId}.pdf"`)
        res.setHeader("Content-Length", buffer.length)
        return res.send(buffer)
      }
      if (storedUrl.startsWith("http")) {
        // Redirection vers l'URL Bpost (peut nécessiter une session Bpost active)
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

    const svc = req.scope.resolve(BPOST_MODULE) as BpostModuleService
    const clientReference = meta.bpost_client_reference as string | undefined
    const { labelUrl, labelData } = await svc.getLabel(shipmentId, clientReference)

    if (labelData) {
      // Mettre à jour la commande avec les données pour les prochains téléchargements
      await orderService.updateOrders([{
        id: orderId,
        metadata: { ...meta, bpost_label_data: labelData },
      }])
      const buffer = Buffer.from(labelData, "base64")
      res.setHeader("Content-Type", "application/pdf")
      res.setHeader("Content-Disposition", `attachment; filename="bpost-label-${orderId}.pdf"`)
      res.setHeader("Content-Length", buffer.length)
      return res.send(buffer)
    }

    if (labelUrl) {
      if (labelUrl.startsWith("data:application/pdf;base64,")) {
        const base64 = labelUrl.split(",")[1]
        const buffer = Buffer.from(base64, "base64")
        res.setHeader("Content-Type", "application/pdf")
        res.setHeader("Content-Disposition", `attachment; filename="bpost-label-${orderId}.pdf"`)
        res.setHeader("Content-Length", buffer.length)
        return res.send(buffer)
      }
      return res.redirect(302, labelUrl)
    }

    return res.status(404).json({
      error: "Étiquette non disponible. L'API Bpost n'a pas retourné de données d'étiquette.",
    })
  } catch (e: any) {
    console.error("[Bpost] Erreur download-label:", e?.message)
    return res.status(500).json({ error: e.message })
  }
}
