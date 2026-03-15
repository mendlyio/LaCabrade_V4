import { MetadataRoute } from "next"
import { getProductsList } from "@lib/data/products"
import { listCategories } from "@lib/data/categories"
import { getCollectionsList } from "@lib/data/collections"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://localhost:8000"
const DEFAULT_COUNTRY = "be"

const STATIC_PAGES = [
  "",
  "/store",
  "/bon-cadeau",
  "/nouveautes",
  "/lc-equestrian",
  "/marques",
  "/blog",
  "/contact",
  "/livraison",
  "/cgv",
  "/retours",
  "/confidentialite",
  "/conditions-livraison",
  "/conditions-paiement",
  "/protection-donnees",
  "/a-propos",
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = []
  const prefix = `${BASE_URL}/${DEFAULT_COUNTRY}`

  for (const page of STATIC_PAGES) {
    entries.push({
      url: `${prefix}${page}`,
      lastModified: new Date(),
      changeFrequency: page === "" ? "daily" : "weekly",
      priority: page === "" ? 1.0 : page === "/store" ? 0.9 : 0.5,
    })
  }

  try {
    let allProducts: { handle?: string | null }[] = []
    let page = 1
    let hasMore = true

    while (hasMore && page <= 50) {
      const { response, nextPage } = await getProductsList({
        pageParam: page,
        queryParams: { limit: 100 },
        countryCode: DEFAULT_COUNTRY,
      })
      allProducts = allProducts.concat(response.products)
      hasMore = nextPage !== null
      page++
    }

    for (const product of allProducts) {
      if (!product.handle) continue
      entries.push({
        url: `${prefix}/products/${product.handle}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      })
    }
  } catch (e) {
    console.error("[sitemap] Failed to fetch products:", e)
  }

  try {
    const categories = await listCategories()
    for (const cat of categories) {
      if (!cat.handle) continue
      entries.push({
        url: `${prefix}/categories/${cat.handle}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.7,
      })
    }
  } catch (e) {
    console.error("[sitemap] Failed to fetch categories:", e)
  }

  try {
    const { collections } = await getCollectionsList(0, 100)
    for (const col of collections) {
      if (!col.handle) continue
      entries.push({
        url: `${prefix}/collections/${col.handle}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      })
    }
  } catch (e) {
    console.error("[sitemap] Failed to fetch collections:", e)
  }

  return entries
}
