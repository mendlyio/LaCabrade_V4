import { cache } from "react"
import { sdk } from "@lib/config"
import { slugify } from "@lib/util/slugify"

export type Brand = {
  name: string
  slug: string
  count: number
}

const normalizeBrand = (brand?: string | null) => {
  if (!brand) {
    return ""
  }

  return brand.trim()
}

export const listBrands = cache(async function (): Promise<Brand[]> {
  const brandCounts = new Map<string, { name: string; count: number }>()

  const processBatch = (products: any[]) => {
    products.forEach((product: any) => {
      const metadataBrand = normalizeBrand(product.metadata?.brand as string | undefined)
      const collectionBrand = normalizeBrand(product.collection?.title)
      const brandName = metadataBrand || collectionBrand

      if (!brandName) return

      const key = brandName.toLowerCase()
      const existing = brandCounts.get(key)
      brandCounts.set(key, {
        name: existing?.name || brandName,
        count: (existing?.count || 0) + 1,
      })
    })
  }

  try {
    const first = await sdk.store.product.list(
      {
        limit: 500,
        offset: 0,
        fields: "id,metadata,+collection.title,+collection.handle",
      },
      { next: { tags: ["brands", "products"] } }
    )

    processBatch(first.products)
    const total = first.count || 0

    if (total > 500) {
      const remaining: Promise<any>[] = []
      for (let offset = 500; offset < total; offset += 500) {
        remaining.push(
          sdk.store.product.list(
            {
              limit: 500,
              offset,
              fields: "id,metadata,+collection.title,+collection.handle",
            },
            { next: { tags: ["brands", "products"] } }
          )
        )
      }
      const batches = await Promise.all(remaining)
      batches.forEach((batch) => processBatch(batch.products))
    }
  } catch (error) {
    console.error("Erreur lors de la récupération des marques:", error)
    return []
  }

  return Array.from(brandCounts.values())
    .map(({ name, count }) => ({
      name,
      slug: slugify(name),
      count,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }))
})

/**
 * Liste les marques présentes UNIQUEMENT dans les catégories données
 * (la catégorie courante + ses descendants). Évite d'afficher dans la
 * colonne de filtres des marques qui n'existent pas dans la catégorie.
 *
 * Bonus performance : ne scanne que les produits de la catégorie au lieu
 * de tout le catalogue (comme le faisait listBrands sur les pages catégorie).
 */
export const listBrandsByCategory = cache(async function (
  categoryIds: string[]
): Promise<Brand[]> {
  if (!categoryIds || categoryIds.length === 0) {
    return []
  }

  const brandCounts = new Map<string, { name: string; count: number }>()

  const processBatch = (products: any[]) => {
    products.forEach((product: any) => {
      const metadataBrand = normalizeBrand(product.metadata?.brand as string | undefined)
      const collectionBrand = normalizeBrand(product.collection?.title)
      const brandName = metadataBrand || collectionBrand

      if (!brandName) return

      const key = brandName.toLowerCase()
      const existing = brandCounts.get(key)
      brandCounts.set(key, {
        name: existing?.name || brandName,
        count: (existing?.count || 0) + 1,
      })
    })
  }

  const BATCH = 200
  try {
    const first = await sdk.store.product.list(
      {
        limit: BATCH,
        offset: 0,
        category_id: categoryIds,
        fields: "id,metadata,+collection.title,+collection.handle",
      } as any,
      { next: { tags: ["brands", "products"] } }
    )

    processBatch(first.products)
    const total = first.count || 0

    if (total > BATCH) {
      // Récupère les lots restants EN PARALLÈLE (et non en séquentiel)
      const remaining: Promise<any>[] = []
      for (let offset = BATCH; offset < total; offset += BATCH) {
        remaining.push(
          sdk.store.product.list(
            {
              limit: BATCH,
              offset,
              category_id: categoryIds,
              fields: "id,metadata,+collection.title,+collection.handle",
            } as any,
            { next: { tags: ["brands", "products"] } }
          )
        )
      }
      const batches = await Promise.all(remaining)
      batches.forEach((batch) => processBatch(batch.products))
    }
  } catch (error) {
    console.error("Erreur lors de la récupération des marques par catégorie:", error)
    return []
  }

  return Array.from(brandCounts.values())
    .map(({ name, count }) => ({
      name,
      slug: slugify(name),
      count,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }))
})

export const getBrandBySlug = cache(async function (slug: string) {
  const brands = await listBrands()
  return brands.find((brand) => brand.slug === slug) || null
})
