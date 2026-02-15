import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

/**
 * POST /api/bpost/select
 * Body : { cartId: string, pickupPoint: PickupPoint }
 *
 * Proxy server-side vers le backend Medusa pour éviter les erreurs CORS.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cartId, pickupPoint } = body

    if (!cartId || !pickupPoint) {
      return NextResponse.json(
        { success: false, message: "cartId et pickupPoint sont requis." },
        { status: 400 }
      )
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    if (PUBLISHABLE_KEY) {
      headers["x-publishable-api-key"] = PUBLISHABLE_KEY
    }

    const backendRes = await fetch(
      `${BACKEND_URL}/store/bpost/select-pickup-point`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ cartId, pickupPoint }),
      }
    )

    const data = await backendRes.json()

    return NextResponse.json(data, {
      status: backendRes.ok ? 200 : backendRes.status,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error: any) {
    console.error("[api/bpost/select] Erreur proxy:", error.message)
    return NextResponse.json(
      { success: false, message: "Erreur lors de la sélection du point relais." },
      { status: 500 }
    )
  }
}
