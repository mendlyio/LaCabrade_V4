/**
 * Handles d'un produit, plus ceux de ses catégories parentes.
 * Aligné avec backend/src/utils/portes-ouvertes-octobre.ts (expandCategoryHandles).
 * Sert à appliquer « toute la catégorie cavalier » quand le produit
 * n'est rattaché qu'à une sous-catégorie.
 */

export type CategoryRef = {
  id: string
  handle?: string | null
  parent_category_id?: string | null
  parent_category?: { id?: string | null } | null
}

function parentIdOf(cat: {
  parent_category_id?: string | null
  parent_category?: { id?: string | null } | null
} | undefined): string | null | undefined {
  return cat?.parent_category_id || cat?.parent_category?.id || null
}

export function collectHandlesWithAncestors(
  categories: Array<{
    id?: string
    handle?: string | null
    parent_category_id?: string | null
    parent_category?: { id?: string | null } | null
  }>,
  catalog: CategoryRef[] = []
): string[] {
  const byId = new Map(catalog.filter((c) => c?.id).map((c) => [c.id, c]))
  const handles = new Set<string>()

  for (const cat of categories) {
    if (!cat) continue
    if (cat.handle) handles.add(cat.handle)

    const seen = new Set<string>()
    let parentId = cat.id ? (parentIdOf(byId.get(cat.id)) ?? parentIdOf(cat)) : parentIdOf(cat)

    while (parentId && !seen.has(parentId)) {
      seen.add(parentId)
      const parent = byId.get(parentId)
      if (!parent) break
      if (parent.handle) handles.add(parent.handle)
      parentId = parentIdOf(parent)
    }
  }

  return [...handles]
}
