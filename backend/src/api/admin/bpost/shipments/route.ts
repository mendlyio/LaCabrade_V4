import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BPOST_MODULE } from "../../../../modules/bpost"
import BpostModuleService from "../../../../modules/bpost/service"
import { Modules } from "@medusajs/framework/utils"
import { INotificationModuleService, IProductModuleService } from "@medusajs/framework/types"
import { EmailTemplates } from "../../../../modules/email-notifications/templates"
import { STORE_URL } from "../../../../lib/constants"

// ─── Utilitaire : envoyer l'email de suivi ────────────────────────────────────

async function sendTrackingEmail(
  req: MedusaRequest,
  order: any,
  trackingNumber: string,   // peut être vide ""
  labelUrl: string
) {
  const notificationSvc = req.scope.resolve(Modules.NOTIFICATION) as INotificationModuleService
  const postalCode = order.shipping_address?.postal_code || ""

  // URL de suivi Bpost (domaine officiel actuel)
  const publicTrackingUrl = trackingNumber
    ? `https://track.bpost.cloud/btr/web/#/search?itemCode=${trackingNumber}&lang=fr&postalCode=${postalCode}`
    : ""

  let suggestedProducts: Array<{ title: string; thumbnail: string; url: string }> = []
  try {
    const productSvc = req.scope.resolve(Modules.PRODUCT) as IProductModuleService
    const products = await productSvc.listProducts({}, { take: 30, select: ["id", "title", "handle", "thumbnail"] })
    suggestedProducts = products
      .filter((p) => p.thumbnail)
      .sort(() => 0.5 - Math.random())
      .slice(0, 2)
      .map((p) => ({
        title: p.title,
        thumbnail: p.thumbnail!,
        url: `${STORE_URL}/products/${p.handle}`,
      }))
  } catch {}

  await notificationSvc.createNotifications({
    to: order.email,
    channel: "email",
    template: EmailTemplates.ORDER_SHIPPED,
    data: {
      emailOptions: {
        replyTo: "contact@sellerie-lacabrade.be",
        subject: `Votre commande #${(order as any).display_id || order.id} a été expédiée !`,
      },
      order: { ...order, display_id: (order as any).display_id || order.id },
      fulfillment: {
        id: `bpost-manual-${trackingNumber || "no-tracking"}`,
        // Tableau vide si pas de tracking → le template n'affiche pas le bloc suivi
        tracking_numbers: trackingNumber ? [trackingNumber] : [],
        data: {
          public_tracking_url: publicTrackingUrl,
          label_url: labelUrl,
        },
      },
      shippingAddress: order.shipping_address,
      suggestedProducts,
      preview: "Votre commande a été expédiée !",
    },
  })
}

// ─── POST /admin/bpost/shipments ──────────────────────────────────────────────

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const {
      order_id,
      pickup_point_id,
      weight_grams,
      reference,
      send_email = true,
      resend_only = false,
    } = req.body as any

    const orderService = req.scope.resolve(Modules.ORDER)
    const order = await orderService.retrieveOrder(order_id, {
      relations: ["items", "shipping_address"],
    })

    const meta = (order.metadata as Record<string, any>) || {}

    // ── Mode : renvoyer l'email uniquement (sans créer un nouveau shipment) ──
    if (resend_only) {
      const existingTracking = meta.bpost_tracking as string | undefined
      const existingLabel = (meta.bpost_label_url as string) || ""

      if (!existingTracking) {
        return res.status(400).json({
          success: false,
          message: "Aucun numéro de suivi trouvé. Générez d'abord une étiquette.",
        })
      }

      let emailSent = false
      try {
        await sendTrackingEmail(req, order, existingTracking, existingLabel)
        emailSent = true
        console.log(`[Bpost] ✅ Email de suivi renvoyé à ${order.email} — tracking: ${existingTracking}`)
      } catch (emailErr: any) {
        console.error("[Bpost] ❌ Erreur renvoi email:", emailErr?.message)
      }

      return res.json({
        success: true,
        email_sent: emailSent,
        tracking_number: existingTracking,
      })
    }

    // ── Mode : créer un nouveau shipment Bpost ────────────────────────────────
    const svc = req.scope.resolve(BPOST_MODULE) as BpostModuleService
    const pickupFromMetadata = meta?.bpost_pickup_point
    const inferredPickupId = pickup_point_id || pickupFromMetadata?.Id || pickupFromMetadata?.id

    const result = await svc.createShipment({
      orderId: order_id,
      recipient: {
        name: `${order.shipping_address?.first_name || ""} ${order.shipping_address?.last_name || ""}`.trim(),
        email: order.email,
        phone: order.shipping_address?.phone,
        address: {
          address_1: order.shipping_address?.address_1 || "",
          address_2: order.shipping_address?.address_2 || "",
          postal_code: order.shipping_address?.postal_code || "",
          city: order.shipping_address?.city || "",
          country_code: order.shipping_address?.country_code || "BE",
        },
      },
      pickupPointId: inferredPickupId,
      weightGrams: weight_grams,
      reference,
    })

    // Récupérer l'étiquette PDF via POST /labels (séparé de POST /shipments)
    // Le tracking number vient aussi de la réponse /labels (barcode), pas de POST /shipments
    let labelUrl = result.labelUrl || ""
    let labelData: string | undefined = result.labelData
    let trackingFromLabel: string | undefined
    if (!labelData && !labelUrl && result.clientReference) {
      try {
        console.log(`[Bpost] Récupération étiquette pour ref "${result.clientReference}"...`)
        const labelResult = await svc.getLabel(result.clientReference, result.clientReference)
        labelUrl = labelResult.labelUrl || ""
        labelData = labelResult.labelData
        trackingFromLabel = labelResult.trackingNumber
      } catch (e: any) {
        console.warn("[Bpost] Impossible de récupérer l'étiquette:", e?.message)
      }
    }

    const finalLabelUrl = labelUrl || ""
    // Tracking : préférer celui du label (barcode), sinon celui de createShipment (absent selon spec)
    const finalTracking = trackingFromLabel || result.trackingNumber || undefined

    // Sauvegarder dans les métadonnées de la commande
    const newMetadata: Record<string, any> = {
      ...meta,
      bpost_shipment_id: result.shipmentId,
      bpost_client_reference: result.clientReference,
      bpost_label_url: finalLabelUrl,
    }
    if (finalTracking) newMetadata.bpost_tracking = finalTracking
    if (labelData) {
      // PDF base64 stocké pour téléchargement sans re-auth Bpost
      newMetadata.bpost_label_data = labelData
    }

    const updated = await orderService.updateOrders([{ id: order_id, metadata: newMetadata }])

    // Envoyer l'email uniquement si l'étiquette ET le tracking sont obtenus
    const labelReady = !!(labelData || labelUrl)
    let emailSent = false
    if (send_email && labelReady && finalTracking) {
      try {
        await sendTrackingEmail(req, order, finalTracking, finalLabelUrl)
        emailSent = true
        console.log(`[Bpost] ✅ Email de suivi envoyé à ${order.email} — tracking: ${finalTracking}`)
      } catch (emailErr: any) {
        console.error("[Bpost] ❌ Erreur envoi email de suivi:", emailErr?.message)
      }
    } else if (send_email) {
      console.warn(
        `[Bpost] ⚠️ Email NON envoyé — label: ${labelReady ? "OK" : "ABSENT"}, tracking: ${finalTracking || "ABSENT"}`
      )
    }

    return res.json({
      success: true,
      shipment: { ...result, labelUrl: finalLabelUrl, trackingNumber: finalTracking },
      tracking_number: finalTracking,
      email_sent: emailSent,
      order: updated,
    })
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message })
  }
}
