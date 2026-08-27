import { NextRequest, NextResponse } from "next/server"

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID
const META_CAPI_ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN

interface TrackPurchaseBody {
  orderId: string
  eventId?: string
  value: number
  currency: string
  items: Array<{
    item_id: string
    item_name: string
    price: number
    quantity: number
  }>
  tax?: number
  shipping?: number
  /** Cookie _fbp envoyé par le navigateur (Meta Browser ID) */
  fbp?: string
  /** Cookie _fbc envoyé par le navigateur (Meta Click ID) */
  fbc?: string
}

/**
 * API pour envoyer l'événement Purchase à Meta CAPI (Conversions API).
 * Appelé côté client après une commande validée, uniquement si consentement cookies.
 *
 * Bonnes pratiques appliquées :
 * - event_id partagé avec le Pixel navigateur pour éviter la double-comptabilisation
 * - user_data enrichi avec IP client, user_agent, fbp, fbc pour améliorer l'Event Match Quality
 */
export async function POST(req: NextRequest) {
  try {
    if (!META_PIXEL_ID || !META_CAPI_ACCESS_TOKEN) {
      return NextResponse.json({ ok: true, skipped: "no_config" })
    }

    const body = (await req.json()) as TrackPurchaseBody
    const { orderId, eventId, value, currency, items, tax = 0, shipping = 0, fbp, fbc } = body

    if (!orderId || value == null || !currency) {
      return NextResponse.json({ ok: false, error: "missing_data" }, { status: 400 })
    }

    // Utiliser l'event_id fourni par le Pixel pour la déduplication, sinon en générer un
    const capiEventId = eventId ?? `purchase_${orderId}_${Date.now()}`
    const eventTime = Math.floor(Date.now() / 1000)

    // ── user_data : enrichi pour améliorer l'Event Match Quality ─────────────
    // IP client (X-Forwarded-For en priorité car derrière proxy/CDN)
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      undefined

    const userAgent = req.headers.get("user-agent") || undefined

    const userData: Record<string, unknown> = {}
    if (clientIp) userData.client_ip_address = clientIp
    if (userAgent) userData.client_user_agent = userAgent
    if (fbp) userData.fbp = fbp
    if (fbc) userData.fbc = fbc

    // ── custom_data ───────────────────────────────────────────────────────────
    const customData: Record<string, unknown> = {
      currency,
      value: Number(value.toFixed(2)),
      order_id: orderId,
      content_ids: items.map((i) => i.item_id),
      content_type: "product",
      contents: items.map((i) => ({
        id: i.item_id,
        quantity: i.quantity,
        item_price: Number(i.price.toFixed(2)),
      })),
      num_items: items.reduce((s, i) => s + i.quantity, 0),
    }

    if (tax > 0) customData.tax = Number(tax.toFixed(2))
    if (shipping > 0) customData.shipping = Number(shipping.toFixed(2))

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${META_PIXEL_ID}/events?access_token=${encodeURIComponent(META_CAPI_ACCESS_TOKEN)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [
            {
              event_name: "Purchase",
              event_time: eventTime,
              event_id: capiEventId,
              event_source_url: req.headers.get("referer") || undefined,
              user_data: userData,
              custom_data: customData,
              action_source: "website",
            },
          ],
        }),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      console.error("[CAPI] Purchase event failed:", res.status, err)
      return NextResponse.json({ ok: false, error: "meta_error" }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[CAPI] Error:", e)
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 })
  }
}
