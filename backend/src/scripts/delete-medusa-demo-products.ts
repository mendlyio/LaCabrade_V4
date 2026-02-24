/**
 * Supprime les produits de démo Medusa (T-Shirt et Sweatshirt)
 * qui ne peuvent pas être supprimés depuis le dashboard.
 *
 * Usage (production avec Redis) :
 *   pnpm run delete:medusa-demo
 *
 * Usage (local sans Redis) :
 *   pnpm run delete:medusa-demo:local
 */

import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import { deleteProductsWorkflow } from "@medusajs/medusa/core-flows"

const DEMO_HANDLES = ["t-shirt", "sweatshirt"]

export default async function deleteMedusaDemoProducts({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModuleService = container.resolve(Modules.PRODUCT)

  logger.info("🗑️  Recherche des produits Medusa T-Shirt et Sweatshirt...")

  const products = await productModuleService.listProducts(
    { handle: DEMO_HANDLES },
    { withDeleted: true }
  )

  if (!products.length) {
    logger.info("ℹ️  Aucun produit Medusa T-Shirt ou Sweatshirt trouvé.")
    return
  }

  const ids = products.map((p: any) => p.id)
  logger.info(`📋 Produits à supprimer : ${products.map((p: any) => p.title).join(", ")}`)

  try {
    await deleteProductsWorkflow(container).run({
      input: { ids },
    })
    logger.info(`✅ ${ids.length} produit(s) supprimé(s) avec succès.`)
  } catch (e: any) {
    logger.error(`❌ Erreur workflow : ${e.message}`)
    logger.info("   Tentative de suppression directe (hard delete)...")
    try {
      await productModuleService.deleteProducts(ids)
      logger.info(`✅ ${ids.length} produit(s) supprimé(s) (hard delete).`)
    } catch (e2: any) {
      logger.error(`❌ Erreur : ${e2.message}`)
      throw e2
    }
  }
}
