"use server"

import { sdk } from "@lib/config"
import { getRegion } from "@lib/data/regions"
import { GIFT_CARD_PRODUCT_HANDLE } from "@lib/data/products"

export type SearchProductResult = {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  description: string | null
  collection: string | null
  collectionHandle: string | null
  minPrice: number | null
  currency: string
  score?: number
}

/**
 * Recherche directe via Medusa SDK avec scoring côté serveur.
 * Fonctionne sans MeiliSearch.
 */
export async function searchProductsDirect(
  query: string,
  countryCode = "fr"
): Promise<SearchProductResult[]> {
  if (!query || query.trim().length < 2) return []

  try {
    const region = await getRegion(countryCode)
    const q = query.trim()
    const qLower = q.toLowerCase()
    const qTokens = qLower.split(/\s+/).filter(Boolean)

    const { products } = await sdk.store.product.list(
      {
        q,
        limit: 50,
        is_giftcard: false,
        region_id: region?.id,
        fields:
          "*variants.calculated_price,+variants.prices,+images,+collection.title,+collection.handle,+categories.handle",
      } as any,
      { next: { tags: ["products"], revalidate: 60 } }
    )

    const scored = products
      .filter((p) => p.handle !== GIFT_CARD_PRODUCT_HANDLE)
      .map((p) => {
        const title = (p.title || "").toLowerCase()
        const handle = (p.handle || "").toLowerCase()
        const desc = (p.description || "").toLowerCase()
        const collectionTitle = ((p as any).collection?.title || "").toLowerCase()
        const variantTitles = (p.variants || [])
          .map((v: any) => (v.title || "").toLowerCase())
          .join(" ")

        const LC_EQUESTRIAN_HANDLES = ["la-cabrade", "lc-equestrian", "lc_equestrian"]
        const categories = ((p as any).categories || []) as { handle?: string }[]
        const isLcEquestrian = categories.some((cat) =>
          LC_EQUESTRIAN_HANDLES.includes(cat.handle?.toLowerCase() || "")
        )

        let score = 0
        if (isLcEquestrian) score += 200
        if (title.startsWith(qLower)) score += 100
        else if (title.includes(qLower)) score += 60
        if (handle.includes(qLower)) score += 30
        if (collectionTitle.includes(qLower)) score += 20
        if (variantTitles.includes(qLower)) score += 15
        if (desc.includes(qLower)) score += 5

        qTokens.forEach((token) => {
          if (title.includes(token)) score += 10
          if (handle.includes(token)) score += 5
          if (variantTitles.includes(token)) score += 3
        })

        const prices = (p.variants || [])
          .flatMap((v: any) =>
            v.calculated_price?.calculated_amount != null
              ? [v.calculated_price.calculated_amount]
              : []
          )
          .filter((n: number) => n > 0)

        const minPrice = prices.length > 0 ? Math.min(...prices) : null
        const currency =
          (p.variants?.[0] as any)?.calculated_price?.currency_code || "eur"

        return {
          id: p.id,
          title: p.title || "",
          handle: p.handle || "",
          thumbnail: p.thumbnail || (p as any).images?.[0]?.url || null,
          description: p.description || null,
          collection: (p as any).collection?.title || null,
          collectionHandle: (p as any).collection?.handle || null,
          minPrice,
          currency,
          score,
        }
      })
      .filter((p) => p.score > 0)
      .sort((a, b) => b.score - a.score)

    return scored
  } catch (err) {
    console.error("[searchProductsDirect] Erreur:", err)
    return []
  }
}

/**
 * Retourne les IDs des produits correspondant à la requête.
 * Utilisé par la page /results/[query] pour la compatibilité avec PaginatedProducts.
 */
export async function searchProductIds(
  query: string,
  countryCode = "fr"
): Promise<string[]> {
  const results = await searchProductsDirect(query, countryCode)
  return results.map((r) => r.id)
}
