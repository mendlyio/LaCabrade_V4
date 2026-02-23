import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export default async function diagnoseCategories({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productService = container.resolve(Modules.PRODUCT)

  logger.info("🔍 Diagnostic des catégories...")

  const categories = await productService.listProductCategories(
    {},
    {
      select: ["id", "name", "handle", "parent_category_id", "mpath", "metadata", "is_active"],
      take: 10000,
      withDeleted: true,
    }
  )

  logger.info(`📊 Total catégories: ${categories.length}`)

  const issues: string[] = []
  const byId = new Map()
  
  categories.forEach((cat: any) => {
    byId.set(cat.id, cat)
  })

  categories.forEach((cat: any, index: number) => {
    const num = index + 1
    const deleted = cat.deleted_at ? " [SUPPRIMÉE]" : ""
    const active = cat.is_active === false ? " [INACTIVE]" : ""
    
    logger.info(`${num}. ${cat.name}${deleted}${active}`)
    logger.info(`   ID: ${cat.id}`)
    logger.info(`   Handle: ${cat.handle}`)
    logger.info(`   Parent: ${cat.parent_category_id || "RACINE"}`)
    logger.info(`   mpath: ${cat.mpath || "N/A"}`)
    
    if (cat.metadata?.odoo_id) {
      logger.info(`   Odoo ID: ${cat.metadata.odoo_id}`)
    }
    if (cat.metadata?.odoo_parent_id) {
      logger.info(`   Odoo Parent ID: ${cat.metadata.odoo_parent_id}`)
    }

    // Vérifications
    if (cat.deleted_at) {
      issues.push(`❌ ${cat.name} (${cat.id}) est supprimée`)
    }

    if (cat.parent_category_id) {
      const parent = byId.get(cat.parent_category_id)
      if (!parent) {
        issues.push(`❌ ${cat.name} (${cat.id}) a un parent_category_id invalide: ${cat.parent_category_id}`)
      } else if (parent.deleted_at) {
        issues.push(`⚠️  ${cat.name} (${cat.id}) a un parent supprimé: ${parent.name}`)
      }
    }

    if (cat.parent_category_id === cat.id) {
      issues.push(`❌ ${cat.name} (${cat.id}) est son propre parent (cycle)`)
    }

    // Vérifier cycles plus profonds
    const visited = new Set<string>()
    let current = cat.parent_category_id
    while (current) {
      if (visited.has(current)) {
        issues.push(`❌ ${cat.name} (${cat.id}) est dans un cycle de parents`)
        break
      }
      visited.add(current)
      const parent = byId.get(current)
      current = parent?.parent_category_id
    }

    logger.info("") // ligne vide
  })

  if (issues.length > 0) {
    logger.error(`\n🚨 ${issues.length} problème(s) détecté(s):\n`)
    issues.forEach((issue) => logger.error(issue))
  } else {
    logger.info("\n✅ Aucun problème détecté dans les catégories")
  }

  // Compter les racines
  const roots = categories.filter((cat: any) => !cat.parent_category_id && !cat.deleted_at)
  logger.info(`\n🌳 ${roots.length} catégorie(s) racine(s):`)
  roots.forEach((cat: any) => {
    logger.info(`   - ${cat.name} (${cat.handle})`)
  })
}
