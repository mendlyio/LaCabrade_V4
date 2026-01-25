import { HttpTypes } from "@medusajs/types"

type CategoryNode = HttpTypes.StoreProductCategory & {
  category_children?: CategoryNode[]
}

const sortByRankAndName = (a: CategoryNode, b: CategoryNode) => {
  const rankA = a.rank ?? 0
  const rankB = b.rank ?? 0
  if (rankA !== rankB) {
    return rankA - rankB
  }
  return (a.name || "").localeCompare(b.name || "", "fr", { sensitivity: "base" })
}

export const buildCategoryTree = (categories: HttpTypes.StoreProductCategory[]) => {
  const map = new Map<string, CategoryNode>()

  categories.forEach((category) => {
    map.set(category.id, { ...category, category_children: [] })
  })

  map.forEach((category) => {
    const parentId =
      category.parent_category_id || category.parent_category?.id || undefined
    if (!parentId) {
      return
    }

    const parent = map.get(parentId)
    if (!parent) {
      return
    }

    parent.category_children = parent.category_children || []
    parent.category_children.push(category)
  })

  map.forEach((category) => {
    if (category.category_children?.length) {
      category.category_children.sort(sortByRankAndName)
    }
  })

  const roots = Array.from(map.values()).filter(
    (category) =>
      !category.parent_category_id && !category.parent_category?.id
  )

  roots.sort(sortByRankAndName)

  return { roots, map }
}
