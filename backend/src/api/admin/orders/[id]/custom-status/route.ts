import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { INotificationModuleService } from "@medusajs/framework/types"
import { EmailTemplates } from "../../../../../modules/email-notifications/templates"
import {
  getCustomStatusDef,
  isValidCustomStatus,
  ORDER_CUSTOM_STATUSES,
} from "../../../../../lib/order-custom-statuses"

/**
 * GET /admin/orders/:id/custom-status
 * Renvoie l'état custom courant + l'historique + la liste des états possibles.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { id } = req.params as { id: string }
    const orderService = req.scope.resolve(Modules.ORDER)
    const order = await orderService.retrieveOrder(id)
    const meta = (order.metadata as Record<string, any>) || {}

    return res.json({
      current: meta.custom_status || null,
      history: Array.isArray(meta.custom_status_history) ? meta.custom_status_history : [],
      available: ORDER_CUSTOM_STATUSES.map((s) => ({
        id: s.id,
        label: s.label,
        description: s.description,
        color: s.color,
        emailEnabledByDefault: s.emailEnabledByDefault,
      })),
    })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}

/**
 * POST /admin/orders/:id/custom-status
 *
 * Body : { status: string, send_email?: boolean, custom_message?: string }
 *
 * Met à jour `order.metadata.custom_status`, ajoute une entrée à
 * `order.metadata.custom_status_history`, et envoie un email au client
 * (sauf si `send_email: false`).
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { id } = req.params as { id: string }
    const { status, send_email, custom_message } = (req.body || {}) as {
      status?: string
      send_email?: boolean
      custom_message?: string
    }

    if (!status || !isValidCustomStatus(status)) {
      return res.status(400).json({
        error: `Statut "${status}" invalide. Valeurs autorisées : ${ORDER_CUSTOM_STATUSES.map((s) => s.id).join(", ")}`,
      })
    }

    const def = getCustomStatusDef(status)!

    const orderService = req.scope.resolve(Modules.ORDER)
    const order = await orderService.retrieveOrder(id, {
      relations: ["shipping_address"],
    })
    const meta = (order.metadata as Record<string, any>) || {}

    // Si statut identique au courant ET qu'on ne renvoie pas d'email,
    // on évite de polluer l'historique avec un no-op.
    const isNoOpChange = meta.custom_status === status && !send_email

    if (!isNoOpChange) {
      const historyEntry = {
        status,
        label: def.label,
        at: new Date().toISOString(),
        email_sent: false as boolean,
        actor_id: (req as any).auth_context?.actor_id || null,
        custom_message: custom_message?.trim() || null,
      }

      const newMetadata = {
        ...meta,
        custom_status: status,
        custom_status_label: def.label,
        custom_status_updated_at: historyEntry.at,
        custom_status_history: [
          ...(Array.isArray(meta.custom_status_history) ? meta.custom_status_history : []),
          historyEntry,
        ].slice(-30), // garder les 30 derniers
      }

      // Envoi email avant la persistance pour ne flagger email_sent qu'en cas de succès.
      const shouldSendEmail = send_email !== false && def.emailEnabledByDefault !== false
      let emailSent = false
      let emailError: string | null = null

      if (shouldSendEmail) {
        try {
          await sendStatusEmail(req, order, status, custom_message)
          emailSent = true
        } catch (err: any) {
          emailError = err?.message || String(err)
          console.error(`[order-custom-status] Erreur envoi email order=${id} status=${status}:`, emailError)
        }
      }

      historyEntry.email_sent = emailSent
      newMetadata.custom_status_history[newMetadata.custom_status_history.length - 1].email_sent = emailSent

      await orderService.updateOrders([{ id, metadata: newMetadata }])

      return res.json({
        success: true,
        status,
        label: def.label,
        email_sent: emailSent,
        email_error: emailError,
      })
    }

    return res.json({ success: true, status, label: def.label, email_sent: false, no_op: true })
  } catch (e: any) {
    console.error("[order-custom-status] Erreur:", e?.message, e?.stack?.split("\n").slice(0, 3).join("\n"))
    return res.status(500).json({ error: e.message })
  }
}

async function sendStatusEmail(
  req: MedusaRequest,
  order: any,
  status: string,
  customMessage?: string
) {
  const notificationSvc = req.scope.resolve(Modules.NOTIFICATION) as INotificationModuleService
  const def = getCustomStatusDef(status)
  if (!def) throw new Error(`Statut inconnu : ${status}`)

  const meta = (order.metadata as Record<string, any>) || {}

  // Contexte injecté selon les besoins du statut
  const context: Record<string, any> = {}
  if (def.contexts.includes("bpost_tracking")) {
    context.bpostTracking = meta.bpost_tracking || null
    const postal = order.shipping_address?.postal_code || ""
    context.bpostTrackingUrl = meta.bpost_tracking
      ? `https://track.bpost.cloud/btr/web/#/search?itemCode=${meta.bpost_tracking}&lang=fr&postalCode=${postal}`
      : null
  }
  if (def.contexts.includes("pickup_relais")) {
    const pp = meta.bpost_pickup_point
    if (pp && typeof pp === "object") {
      const addrObj = pp.Address && typeof pp.Address === "object" ? pp.Address : null
      context.pickupRelais = {
        name: typeof pp.Name === "string" ? pp.Name : pp.name || null,
        address:
          (addrObj && (addrObj.Streetname1 || addrObj.street)) ||
          (typeof pp.Address === "string" ? pp.Address : null),
        postalCode: addrObj?.PostalCode || pp.ZipCode || pp.PostalCode || null,
        city: addrObj?.City || pp.City || pp.city || null,
      }
    }
  }

  await notificationSvc.createNotifications({
    to: order.email,
    channel: "email",
    template: EmailTemplates.ORDER_STATUS_UPDATED,
    data: {
      emailOptions: {
        replyTo: "contact@sellerie-lacabrade.be",
        subject: def.emailSubject(order.display_id || order.id),
      },
      order: {
        id: order.id,
        display_id: order.display_id || order.id,
        email: order.email,
        status: order.status,
        created_at: order.created_at,
      },
      newStatus: status,
      customMessage: customMessage?.trim() || undefined,
      context,
      preview: def.emailSubject(order.display_id || order.id),
    },
  })
}
