import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

/**
 * GET /api/products/load-more?limit=12&offset=12&region_id=...&...
 *
 * Proxy server-side vers le backend Medusa pour éviter les erreurs CORS
 * côté client (requête directe depuis le navigateur vers un autre domaine).
 * Utilisé par le bouton "Charger plus de produits".
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl

    const limit = searchParams.get("limit") || "12"
    const offset = searchParams.get("offset") || "0"
    const regionId = searchParams.get("region_id")
    const fields =
      searchParams.get("fields") ||
      "*variants.calculated_price,+variants.inventory_quantity,+images,+metadata,+collection.title,+collection.handle,+categories.handle,+categories.name,+categories.id"

    if (!regionId) {
      return NextResponse.json(
        { products: [], error: "region_id requis" },
        { status: 400 }
      )
    }

    const backendUrl = new URL("/store/products", BACKEND_URL)
    backendUrl.searchParams.set("limit", limit)
    backendUrl.searchParams.set("offset", offset)
    backendUrl.searchParams.set("region_id", regionId)
    backendUrl.searchParams.set("fields", fields)

    // Paramètres optionnels
    const q = searchParams.get("q")
    const order = searchParams.get("order")
    const categoryIds = searchParams.getAll("category_id[]")
    const collectionIds = searchParams.getAll("collection_id[]")

    if (q) backendUrl.searchParams.set("q", q)
    if (order) backendUrl.searchParams.set("order", order)
    categoryIds.forEach((id) => backendUrl.searchParams.append("category_id[]", id))
    collectionIds.forEach((id) => backendUrl.searchParams.append("collection_id[]", id))

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    if (PUBLISHABLE_KEY) {
      headers["x-publishable-api-key"] = PUBLISHABLE_KEY
    }

    const backendRes = await fetch(backendUrl.toString(), { headers })
    const data = await backendRes.json()

    if (!backendRes.ok) {
      return NextResponse.json(
        { products: [], error: data?.message || "Erreur backend" },
        { status: backendRes.status }
      )
    }

    return NextResponse.json({
      products: data.products ?? [],
      count: data.count ?? 0,
    })
  } catch (error: any) {
    console.error("[api/products/load-more] Erreur proxy:", error.message)
    return NextResponse.json(
      { products: [], error: "Impossible de charger les produits." },
      { status: 500 }
    )
  }
}
