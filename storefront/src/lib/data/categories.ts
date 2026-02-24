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

  // Essayer avec le handle décodé en premier
  let result = await sdk.store.category.list(
    // @ts-ignore
    { handle: decoded },
    { next: { tags: ["categories"] } }
  )

  // Si rien trouvé et le décodé diffère de l'original, essayer avec l'original
  if (
    (!result.product_categories || result.product_categories.length === 0) &&
    JSON.stringify(decoded) !== JSON.stringify(categoryHandle)
  ) {
    result = await sdk.store.category.list(
      // @ts-ignore
      { handle: categoryHandle },
      { next: { tags: ["categories"] } }
    )
  }

  return result
})
