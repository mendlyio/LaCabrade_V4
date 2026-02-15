import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

/**
 * GET /api/bpost/points?zip=1000&country=BE&city=Bruxelles&street=...&cart_id=...
 *
 * Proxy server-side vers le backend Medusa pour éviter les erreurs CORS.
 * Le zip (code postal) est le seul paramètre obligatoire.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl

    const zip = searchParams.get("zip") || ""
    const country = searchParams.get("country") || "BE"
    const city = searchParams.get("city") || ""
    const street = searchParams.get("street") || ""
    const cartId = searchParams.get("cart_id") || ""

    if (!zip.trim()) {
      return NextResponse.json(
        { points: [], error: "Le code postal (zip) est requis." },
        { status: 400 }
      )
    }

    // Construire l'URL vers le endpoint store du backend
    const backendUrl = new URL("/store/bpost/pickup-points", BACKEND_URL)
    backendUrl.searchParams.set("postal_code", zip.trim())
    backendUrl.searchParams.set("country", country)
    if (city) backendUrl.searchParams.set("city", city)
    if (street) backendUrl.searchParams.set("street", street)
    if (cartId) backendUrl.searchParams.set("cart_id", cartId)

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    if (PUBLISHABLE_KEY) {
      headers["x-publishable-api-key"] = PUBLISHABLE_KEY
    }

    const backendRes = await fetch(backendUrl.toString(), { headers })
    const data = await backendRes.json()

    // Renvoyer la réponse au client avec la structure { points: PointRelais[] }
    return NextResponse.json(
      { points: data.points ?? [], error: data.error ?? null },
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    )
  } catch (error: any) {
    console.error("[api/bpost/points] Erreur proxy:", error.message)
    return NextResponse.json(
      { points: [], error: "Impossible de récupérer les points relais." },
      { status: 500 }
    )
  }
}
