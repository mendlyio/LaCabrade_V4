import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getProductIndex } from "../../../utils/meilisearch"

const GIFT_CARD_HANDLE = "bon-cadeau"

function slugify(str: string): string {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

/**
 * GET /store/search?q=...&limit=8
 *
 * Recherche produits via Meilisearch (instantané, tolérance fautes + synonymes).
 * Renvoie { available } = false si Meilisearch non configuré → le storefront
 * bascule alors sur son moteur de repli (aucune coupure).
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const q = ((req.query.q as string) || "").trim()
    const limit = Math.min(parseInt((req.query.limit as string) || "8", 10) || 8, 20)

    const index = getProductIndex()
    if (!index) {
      return res.json({ available: false, products: [], categories: [], brands: [] })
    }
    if (!q || q.length < 2) {
      return res.json({ available: true, products: [], categories: [], brands: [], count: 0 })
    }

    const result: any = await index.search(q, {
      limit,
      attributesToRetrieve: [
        "id",
        "title",
        "handle",
        "thumbnail",
        "brand",
        "collection",
        "collection_handle",
        "price",
        "categories",
        "category_handles",
      ],
    })

    const hits = (result?.hits || []).filter((h: any) => h.handle !== GIFT_CARD_HANDLE)

    const products = hits.map((h: any) => ({
      id: h.id,
      title: h.title,
      handle: h.handle,
      thumbnail: h.thumbnail || null,
      collection: h.collection || h.brand || null,
      collectionHandle: h.collection_handle || null,
      minPrice: typeof h.price === "number" ? h.price : null,
      currency: h.currency || "eur",
    }))

    // Suggestions catégories (depuis les résultats)
    const catMap = new Map<string, string>()
    for (const h of hits) {
      const names: string[] = h.categories || []
      const handles: string[] = h.category_handles || []
      for (let i = 0; i < handles.length; i++) {
        if (handles[i] && !catMap.has(handles[i])) {
          catMap.set(handles[i], names[i] || handles[i])
        }
      }
    }
    const categories = Array.from(catMap.entries())
      .slice(0, 4)
      .map(([handle, name]) => ({ name, handle }))

    // Suggestions marques (depuis les résultats)
    const brandMap = new Map<string, string>()
    for (const h of hits) {
      if (h.brand && !brandMap.has(h.brand.toLowerCase())) {
        brandMap.set(h.brand.toLowerCase(), h.brand)
      }
    }
    const brands = Array.from(brandMap.values())
      .slice(0, 4)
      .map((b) => ({ name: b, slug: slugify(b) }))

    return res.json({
      available: true,
      products,
      categories,
      brands,
      count: products.length,
    })
  } catch (error: any) {
    console.error("[store/search] Erreur:", error?.message)
    return res.json({ available: false, products: [], categories: [], brands: [] })
  }
}
