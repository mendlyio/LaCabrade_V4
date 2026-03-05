import { NextRequest, NextResponse } from "next/server"

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID
const META_CAPI_ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN

interface TrackPurchaseBody {
  orderId: string
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
}

/**
 * API pour envoyer l'événement Purchase à Meta CAPI (Conversions API).
 * Appelé côté client après une commande validée, uniquement si consentement cookies.
 */
export async function POST(req: NextRequest) {
  try {
    if (!META_PIXEL_ID || !META_CAPI_ACCESS_TOKEN) {
      return NextResponse.json({ ok: true, skipped: "no_config" })
    }

    const body = (await req.json()) as TrackPurchaseBody
    const { orderId, value, currency, items, tax = 0, shipping = 0 } = body

    if (!orderId || value == null || !currency) {
      return NextResponse.json({ ok: false, error: "missing_data" }, { status: 400 })
    }

    const eventId = `purchase_${orderId}_${Date.now()}`
    const eventTime = Math.floor(Date.now() / 1000)

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
              event_id: eventId,
              event_source_url: req.headers.get("referer") || undefined,
              user_data: {},
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
