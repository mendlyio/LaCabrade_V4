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

  return sdk.store.category.list(
    // TODO: Look into fixing the type
    // @ts-ignore
    { handle: categoryHandle },
    { next: { tags: ["categories"] } }
  )
})
