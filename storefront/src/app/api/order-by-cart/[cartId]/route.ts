import { NextRequest, NextResponse } from "next/server"

const MEDUSA_BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

export async function GET(
  _req: NextRequest,
  { params }: { params: { cartId: string } }
) {
  const { cartId } = params

  if (!cartId) {
    return NextResponse.json({ order: null }, { status: 400 })
  }

  try {
    const headers: Record<string, string> = {}
    if (PUBLISHABLE_API_KEY) {
      headers["x-publishable-api-key"] = PUBLISHABLE_API_KEY
    }

    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/custom/orders/by-cart/${cartId}`,
      { headers, cache: "no-store" }
    )

    if (!res.ok) {
      return NextResponse.json({ order: null }, { status: 200 })
    }

    const data = await res.json()
    const order = data?.order ?? null

    if (order?.id) {
      const cc =
        order.shipping_address?.country_code?.toLowerCase() ||
        order.billing_address?.country_code?.toLowerCase() ||
        "fr"
      return NextResponse.json({
        order: { id: order.id, country_code: cc },
      })
    }

    return NextResponse.json({ order: null })
  } catch {
    return NextResponse.json({ order: null }, { status: 200 })
  }
}
