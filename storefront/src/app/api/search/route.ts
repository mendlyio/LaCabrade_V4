import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""
const GIFT_CARD_HANDLE = "bon-cadeau"

/**
 * GET /api/search?q=...&countryCode=fr&limit=8
 *
 * Recherche instantanée de produits via proxy Medusa.
 * Retourne titre, handle, thumbnail, prix, collection.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const q = searchParams.get("q")?.trim() || ""
    const countryCode = searchParams.get("countryCode") || "fr"
    const limit = parseInt(searchParams.get("limit") || "8", 10)

    if (!q || q.length < 2) {
      return NextResponse.json({ products: [], count: 0 })
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    if (PUBLISHABLE_KEY) {
      headers["x-publishable-api-key"] = PUBLISHABLE_KEY
    }

    // 1. Résoudre la région pour ce countryCode
    const regionsUrl = new URL("/store/regions", BACKEND_URL)
    const regRes = await fetch(regionsUrl.toString(), { headers })
    let regionId: string | null = null

    if (regRes.ok) {
      const regData = await regRes.json()
      const region = (regData.regions || []).find((r: any) =>
        r.countries?.some((c: any) => c.iso_2 === countryCode.toLowerCase())
      )
      regionId = region?.id || null
    }

    // 2. Requête Medusa avec q
    const productUrl = new URL("/store/products", BACKEND_URL)
    productUrl.searchParams.set("q", q)
    productUrl.searchParams.set("limit", String(Math.min(limit * 2, 30)))
    productUrl.searchParams.set("is_giftcard", "false")
    productUrl.searchParams.set(
      "fields",
      "*variants.calculated_price,+variants.prices,+images,+collection.title,+collection.handle"
    )
    if (regionId) productUrl.searchParams.set("region_id", regionId)

    const prodRes = await fetch(productUrl.toString(), {
      headers,
      next: { revalidate: 30 },
    })

    if (!prodRes.ok) {
      return NextResponse.json({ products: [], count: 0 })
    }

    const prodData = await prodRes.json()
    const allProducts: any[] = prodData.products || []

    // Normalise accents + casse : "équitation" == "equitation", "Éperons" == "eperons"
    function norm(str: string): string {
      return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
    }

    // 3. Filtrage et scoring côté serveur
    const qNorm = norm(q)
    const qTokens = qNorm.split(/\s+/).filter(Boolean)

    const scored = allProducts
      .filter((p) => p.handle !== GIFT_CARD_HANDLE)
      .map((p) => {
        const title = norm(p.title || "")
        const handle = norm(p.handle || "")
        const desc = norm(p.description || "")
        const collectionTitle = norm(p.collection?.title || "")
        const variantTitles = (p.variants || [])
          .map((v: any) => norm(v.title || ""))
          .join(" ")

        let score = 0

        // Correspondance exacte du début = score maximal
        if (title.startsWith(qNorm)) score += 100
        else if (title.includes(qNorm)) score += 60
        if (handle.includes(qNorm)) score += 30
        if (collectionTitle.includes(qNorm)) score += 20
        if (variantTitles.includes(qNorm)) score += 15
        if (desc.includes(qNorm)) score += 5

        // Tokens individuels
        qTokens.forEach((token) => {
          if (title.includes(token)) score += 10
          if (handle.includes(token)) score += 5
          if (variantTitles.includes(token)) score += 3
        })

        // Prix minimum pour l'affichage
        const prices = (p.variants || [])
          .flatMap((v: any) =>
            v.calculated_price?.calculated_amount != null
              ? [v.calculated_price.calculated_amount]
              : []
          )
          .filter((n: number) => n > 0)

        const minPrice = prices.length > 0 ? Math.min(...prices) : null
        const currency =
          p.variants?.[0]?.calculated_price?.currency_code || "eur"

        return {
          id: p.id,
          title: p.title,
          handle: p.handle,
          thumbnail: p.thumbnail || p.images?.[0]?.url || null,
          collection: p.collection?.title || null,
          collectionHandle: p.collection?.handle || null,
          minPrice,
          currency,
          score,
        }
      })
      .filter((p) => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    return NextResponse.json({
      products: scored,
      count: scored.length,
      query: q,
    })
  } catch (err: any) {
    console.error("[api/search] Erreur:", err.message)
    return NextResponse.json({ products: [], count: 0 })
  }
}
