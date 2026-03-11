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
  // → C'est le handle slugifié d'une catégorie parente comme "bonnets, bandeaux, écharpes et tours de cou"
  //   (à ne PAS confondre avec la sous-catégorie "bonnets"). On priorise le handle slugifié.
  //   L'option "chemin" ["bonnets", "bandeaux", "echarpes-et-tours-de-cou"] est retirée car elle
  //   faisait matcher à tort la catégorie "bonnets" via l'API Medusa.
  const candidates: string[][] = [decoded]
  if (decoded.length === 1 && decoded[0].includes(",")) {
    const segment = decoded[0]
    const slugified = segment.replace(/,\s*-/g, "-").replace(/,/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
    if (slugified && slugified !== segment) {
      // Prioriser le slugifié pour éviter de matcher "bonnets" à tort
      candidates.unshift([slugified])
    }
  }

  const slugifiedForMatch = decoded.length === 1 && decoded[0].includes(",")
    ? decoded[0].replace(/,\s*-/g, "-").replace(/,/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
    : null

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

  // Fallback : handles avec suffixe ID (ex: bonnets-bandeaux-echarpes-et-tours-de-cou-123)
  const slugifiedCandidate = decoded.length === 1 && decoded[0].includes(",")
    ? decoded[0].replace(/,\s*-/g, "-").replace(/,/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
    : null
  if (
    result.product_categories?.length === 0 &&
    slugifiedCandidate &&
    slugifiedCandidate.length > 10
  ) {
    const all = await listCategories()
    const match = all.find(
      (c: any) =>
        c.handle === slugifiedCandidate ||
        (c.handle?.startsWith(slugifiedCandidate + "-") && /-\d+$/.test(c.handle))
    )
    if (match) {
      result = { ...result, product_categories: [match] }
    }
  }

  return result
})
