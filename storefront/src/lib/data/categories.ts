import { sdk } from "@lib/config"
import { cache } from "react"

export const listCategories = cache(async function () {
  const limit = 100
  let offset = 0
  let total = 0
  const allCategories: any[] = []

  do {
    const { product_categories, count } = await sdk.store.category.list(
      {
        limit,
        offset,
      },
      { next: { tags: ["categories"] } }
    )

    if (Array.isArray(product_categories)) {
      allCategories.push(...product_categories)
    }

    total = typeof count === "number" ? count : allCategories.length
    offset += limit
  } while (offset < total)

  // Dédupliquer par id pour éviter les doublons éventuels
  const deduped = new Map<string, any>()
  allCategories.forEach((category) => {
    if (category?.id) {
      deduped.set(category.id, category)
    }
  })

  return Array.from(deduped.values())
})

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
  // → lien mal formé (virgules au lieu de slashes), on essaie plusieurs interprétations
  const candidates: string[][] = [decoded]
  if (decoded.length === 1 && decoded[0].includes(",")) {
    const segment = decoded[0]
    // Option A : chemin imbriqué → ["bonnets", "bandeaux", "echarpes-et-tours-de-cou"]
    const pathParts = segment.split(",").map((p) => p.replace(/^-+/, "").trim()).filter(Boolean)
    if (pathParts.length > 1) candidates.push(pathParts)
    // Option B : handle slugifié → "bonnets-bandeaux-echarpes-et-tours-de-cou"
    const slugified = segment.replace(/,\s*-/g, "-").replace(/,/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
    if (slugified && slugified !== segment) candidates.push([slugified])
  }

  let result: Awaited<ReturnType<typeof sdk.store.category.list>> = { product_categories: [], count: 0, limit: 0, offset: 0 }
  for (const handlesToTry of candidates) {
    result = await sdk.store.category.list(
      // @ts-ignore
      { handle: handlesToTry },
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
      break
    }
  }

  return result
})
