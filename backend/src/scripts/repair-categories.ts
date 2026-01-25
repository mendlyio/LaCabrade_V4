import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

type CategoryRecord = {
  id: string
  name?: string
  parent_category_id?: string | null
  metadata?: Record<string, unknown> | null
}

type CategoryUpdate = {
  id: string
  parent_category_id: string | null
}

export default async function repairCategories({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productService = container.resolve(Modules.PRODUCT)

  const categories = (await productService.listProductCategories(
    {},
    {
      select: ["id", "name", "parent_category_id", "metadata"],
      take: 10000,
    }
  )) as CategoryRecord[]

  if (!categories.length) {
    logger.info("Aucune catégorie à réparer.")
    return
  }

  const byId = new Map<string, CategoryRecord>()
  const byOdooId = new Map<number, string>()

  categories.forEach((category) => {
    byId.set(category.id, category)
    const odooId = category.metadata?.odoo_id
    if (typeof odooId === "number") {
      byOdooId.set(odooId, category.id)
    } else if (typeof odooId === "string" && odooId.trim()) {
      const parsed = Number(odooId)
      if (!Number.isNaN(parsed)) {
        byOdooId.set(parsed, category.id)
      }
    }
  })

  const desiredParentById = new Map<string, string | null>()

  categories.forEach((category) => {
    const rawParentId = category.parent_category_id || null
    const odooParentId = category.metadata?.odoo_parent_id

    let desiredParent: string | null = rawParentId

    if (typeof odooParentId === "number") {
      desiredParent = byOdooId.get(odooParentId) || null
    } else if (typeof odooParentId === "string" && odooParentId.trim()) {
      const parsed = Number(odooParentId)
      desiredParent = Number.isNaN(parsed) ? desiredParent : byOdooId.get(parsed) || null
    }

    if (desiredParent && !byId.has(desiredParent)) {
      desiredParent = null
    }

    if (desiredParent === category.id) {
      desiredParent = null
    }

    desiredParentById.set(category.id, desiredParent)
  })

  const hasCycle = (categoryId: string) => {
    const visited = new Set<string>()
    let current: string | null | undefined = categoryId
    while (current) {
      if (visited.has(current)) {
        return true
      }
      visited.add(current)
      current = desiredParentById.get(current)
    }
    return false
  }

  const updates: CategoryUpdate[] = []

  categories.forEach((category) => {
    let desiredParent = desiredParentById.get(category.id) || null

    if (desiredParent && hasCycle(category.id)) {
      logger.warn(
        `Cycle détecté pour la catégorie '${category.name || category.id}', parent supprimé.`
      )
      desiredParent = null
      desiredParentById.set(category.id, null)
    }

    if ((category.parent_category_id || null) !== desiredParent) {
      updates.push({
        id: category.id,
        parent_category_id: desiredParent,
      })
    }
  })

  if (!updates.length) {
    logger.info("Aucune réparation de hiérarchie nécessaire.")
    return
  }

  logger.info(`Réparation de ${updates.length} catégories en cours...`)

  for (const update of updates) {
    await productService.updateProductCategories(update.id, {
      parent_category_id: update.parent_category_id,
    })
  }

  logger.info("Réparation des catégories terminée.")
}
