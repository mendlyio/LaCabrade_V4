import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { INotificationModuleService } from "@medusajs/framework/types"
import { EmailTemplates } from "../../../../modules/email-notifications/templates"

const STORE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.sellerie-lacabrade.be"
const ABANDON_DELAY_MS = 90 * 60 * 1000
const ABANDON_MAX_AGE_MS = 48 * 60 * 60 * 1000

/**
 * POST /admin/cart-abandonment/test
 *
 * body: { dry_run?: boolean, override_email?: string }
 *
 * - dry_run: true => ne fait qu'afficher les paniers sans envoyer
 * - override_email: envoie tous les emails à cette adresse (utile pour tester sans spammer de vrais clients)
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { dry_run = true, override_email } = (req.body as any) ?? {}

  const container = req.scope as any
  const notificationService: INotificationModuleService = container.resolve(Modules.NOTIFICATION)

  const pgConnection: any = container.resolve?.("__pg_connection__")

  if (!pgConnection) {
    return res.status(500).json({ error: "pg_connection non disponible" })
  }

  const now = new Date()
  const minAge = new Date(now.getTime() - ABANDON_DELAY_MS)
  const maxAge = new Date(now.getTime() - ABANDON_MAX_AGE_MS)

  const result = await pgConnection.raw(`
    SELECT
      c.id,
      c.email,
      c.updated_at,
      c.currency_code,
      c.metadata->>'abandon_email_sent_at' as already_sent_at,
      json_agg(
        json_build_object(
          'title', li.title,
          'subtitle', li.subtitle,
          'thumbnail', li.thumbnail,
          'quantity', li.quantity,
          'unit_price', CAST(li.unit_price AS float),
          'product_handle', p.handle
        ) ORDER BY li.created_at
      ) as items
    FROM cart c
    JOIN cart_line_item li ON li.cart_id = c.id AND li.deleted_at IS NULL
    LEFT JOIN product p ON p.id = li.product_id AND p.deleted_at IS NULL
    WHERE c.email IS NOT NULL
      AND c.completed_at IS NULL
      AND c.deleted_at IS NULL
      AND c.updated_at < :minAge
      AND c.updated_at > :maxAge
      AND (c.metadata->>'abandon_email_sent_at') IS NULL
    GROUP BY c.id
    HAVING COUNT(li.id) > 0
    ORDER BY c.updated_at DESC
  `, { minAge, maxAge })

  const carts = result?.rows ?? []

  if (dry_run) {
    return res.json({
      mode: "dry_run",
      eligible_carts: carts.length,
      carts: carts.map((c: any) => ({
        id: c.id,
        email: c.email,
        updated_at: c.updated_at,
        item_count: c.items?.length ?? 0,
        total: (c.items ?? []).reduce((s: number, i: any) => s + i.unit_price * i.quantity, 0).toFixed(2),
        already_sent_at: c.already_sent_at,
      })),
    })
  }

  // Mode envoi réel (ou vers override_email)
  const results: any[] = []
  for (const cart of carts) {
    try {
      const items = cart.items || []
      const total = items.reduce((s: number, i: any) => s + (i.unit_price ?? 0) * (i.quantity ?? 1), 0)
      const recipientEmail = override_email || cart.email
      const cartUrl = `${STORE_URL}/be/cart`

      await notificationService.createNotifications({
        to: recipientEmail,
        channel: "email",
        template: EmailTemplates.CART_ABANDONED,
        data: {
          email: recipientEmail,
          items,
          cartUrl,
          totalAmount: total,
          currencyCode: cart.currency_code ?? "eur",
        },
      })

      if (!override_email) {
        await pgConnection.raw(
          `UPDATE cart SET metadata = COALESCE(metadata, '{}') || :patch WHERE id = :id`,
          { patch: JSON.stringify({ abandon_email_sent_at: now.toISOString() }), id: cart.id }
        )
      }

      results.push({ cart_id: cart.id, sent_to: recipientEmail, status: "sent" })
    } catch (err: any) {
      results.push({ cart_id: cart.id, status: "error", error: err?.message })
    }
  }

  return res.json({
    mode: override_email ? `test_override_to_${override_email}` : "live",
    sent: results.filter(r => r.status === "sent").length,
    errors: results.filter(r => r.status === "error").length,
    results,
  })
}
