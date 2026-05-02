import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export default async function({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const promotionModule = container.resolve(Modules.PROMOTION) as any

  for (const code of ["PO_CAVALIER_20", "PO_LC_20"]) {
    const existing = await promotionModule.listPromotions({ code: [code] })
    if (existing.length > 0) {
      await promotionModule.deletePromotions(existing.map((p: any) => p.id))
      logger.info(`✅ Promotion ${code} supprimée.`)
    } else {
      logger.info(`ℹ️  ${code} introuvable.`)
    }
  }
  logger.info("Seul PO_GLOBAL_10 reste actif — le subscriber gère le -20% cavalier/LC.")
}
