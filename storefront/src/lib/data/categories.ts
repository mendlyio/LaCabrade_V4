import { sdk } from "@lib/config"
import { cache } from "react"
import { unstable_cache } from "next/cache"

const _fetchAllCategories = async () => {
  const allCategories: any[] = []

  const first = await sdk.store.category.list(
    { limit: 500, offset: 0 },
    { next: { tags: ["categories"] } }
  )

  if (Array.isArray(first.product_categories)) {
    allCategories.push(...first.product_categories)
  }

  const total = typeof first.count === "number" ? first.count : allCategories.length

  if (total > 500) {
    const remaining: Promise<any>[] = []
    for (let offset = 500; offset < total; offset += 500) {
      remaining.push(
        sdk.store.category.list(
          { limit: 500, offset },
          { next: { tags: ["categories"] } }
        )
      )
    }
    const batches = await Promise.all(remaining)
    batches.forEach((batch) => {
      if (Array.isArray(batch.product_categories)) {
        allCategories.push(...batch.product_categories)
      }
    })
  }

  const deduped = new Map<string, any>()
  allCategories.forEach((category) => {
    if (category?.id) {
      deduped.set(category.id, category)
    }
  })

  return Array.from(deduped.values())
}

// Cache partagé entre toutes les requêtes pendant 1h, invalidable via le tag "categories"
const _cachedFetchAllCategories = unstable_cache(
  _fetchAllCategories,
  ["all-categories"],
  { revalidate: 3600, tags: ["categories"] }
)

// cache() de React déduplique les appels dans le même rendu
export const listCategories = cache(_cachedFetchAllCategories)

export const getCategoriesList = cache(async function (
  offset: number = 0,
  limit: number = 100
) {
  return sdk.store.category.list(
    // TODO: Look into fixing the type
    // @ts-ignore
    { limit, offset },
    { next: { tags: ["categories"] } }
  )
})

export const getCategoryByHandle = cache(async function (
  categoryHandle: string[]
) {
  // Décoder les handles au cas où ils seraient encore encodés (apostrophes, accents)
  const decoded = categoryHandle.map((h) => {
    try {
      return decodeURIComponent(h)
    } catch {
      return h
    }
  })

  // Cas : un seul segment avec virgules (ex: "bonnets,-bandeaux,-echarpes-et-tours-de-cou")
  // → C'est le handle slugifié d'une catégorie parente comme "bonnets, bandeaux, écharpes et tours de cou"
  //   Prioriser le slugifié pour éviter de matcher "bonnets" à tort ; puis essayer le handle exact (virgules).
  const candidates: string[][] = [decoded]
  if (decoded.length === 1 && decoded[0].includes(",")) {
    const segment = decoded[0]
    const slugified = segment.replace(/,\s*-/g, "-").replace(/,/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
    if (slugified && slugified !== segment) {
      candidates.unshift([slugified])
    }
  }

  const slugifiedForMatch = decoded.length === 1 && decoded[0].includes(",")
    ? decoded[0].replace(/,\s*-/g, "-").replace(/,/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
    : null

  let result: Awaited<ReturnType<typeof sdk.store.category.list>> = { product_categories: [], count: 0, limit: 0, offset: 0 }
  for (const handlesToTry of candidates) {
    // L'API Medusa accepte handle en string ou string[] ; essayer les deux formats
    const handleParam = handlesToTry.length === 1 ? handlesToTry[0] : handlesToTry
    result = await sdk.store.category.list(
      // @ts-ignore
      { handle: handleParam },
      { next: { tags: ["categories"] } }
    )
    if (result.product_categories && result.product_categories.length > 0) {
      // Si plusieurs catégories (path), garder la feuille (dernier handle)
      if (handlesToTry.length > 1) {
        const leafHandle = handlesToTry[handlesToTry.length - 1]
        const leaf = result.product_categories.find((c: any) => c.handle === leafHandle)
        if (leaf) {
          result = { ...result, product_categories: [leaf] }
        }
      }
      // Cas "bonnets" (cheval) vs "bonnets, bandeaux, écharpes et tours de cou" (cavalier) :
      // l'API peut retourner "bonnets" à tort. On ne garde que si le handle correspond vraiment.
      if (slugifiedForMatch && slugifiedForMatch.includes("-") && result.product_categories.length > 0) {
        const best = result.product_categories.find(
          (c: any) =>
            c.handle === slugifiedForMatch ||
            (c.handle?.startsWith(slugifiedForMatch + "-") && /-\d+$/.test(c.handle || ""))
        )
        if (!best) {
          // Mauvais match (ex: API a retourné "bonnets" au lieu de "bonnets-bandeaux-...")
          result = { ...result, product_categories: [] }
        } else {
          result = { ...result, product_categories: [best] }
        }
      }
      break
    }
  }

  // Fallback : parcourir toutes les catégories pour matcher le handle (ex: virgules, suffixe ID)
  const slugifiedCandidate = decoded.length === 1 && decoded[0].includes(",")
    ? decoded[0].replace(/,\s*-/g, "-").replace(/,/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
    : decoded.length === 1
      ? decoded[0]
      : null
  const originalCandidate = decoded.length === 1 ? decoded[0] : null

  if (result.product_categories?.length === 0 && (slugifiedCandidate || originalCandidate)) {
    const all = await listCategories()
    const match = all.find(
      (c: any) => {
        const h = c.handle || ""
        // Match exact
        if (h === slugifiedCandidate || h === originalCandidate) return true
        // Match avec suffixe ID (ex: bonnets-bandeaux-echarpes-et-tours-de-cou-123)
        if (slugifiedCandidate && h.startsWith(slugifiedCandidate + "-") && /-\d+$/.test(h)) return true
        // Match handle avec virgules (ex: bonnets,-bandeaux,-echarpes-et-tours-de-cou)
        if (originalCandidate && originalCandidate.includes(",") && h === originalCandidate) return true
        return false
      }
    )
    if (match) {
      result = { ...result, product_categories: [match] }
    }
  }

  return result
})
