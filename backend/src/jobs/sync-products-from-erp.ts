import { MedusaContainer } from "@medusajs/framework/types"
import { syncFromErpWorkflow } from "../workflows/sync-from-erp"
import { OdooProduct } from "../modules/odoo/service"

export default async function syncProductsJob(container: MedusaContainer) {
  const limit = 10
  let offset = 0
  let total = 0
  let odooProducts: OdooProduct[] = []

  console.log("🔄 Début de la synchronisation des produits Odoo...")

  try {
    do {
      odooProducts = (
        await syncFromErpWorkflow(container).run({
          input: {
            limit,
            offset,
          },
        })
      ).result.odooProducts

      offset += limit
      total += odooProducts.length

      console.log(`  ✓ Synchronisé ${odooProducts.length} produits (Total: ${total})`)
    } while (odooProducts.length > 0)

    console.log(`✅ Synchronisation terminée : ${total} produits synchronisés`)
  } catch (error) {
    console.error("❌ Erreur lors de la synchronisation des produits:", error)
    throw error
  }
}

export const config = {
  name: "daily-product-sync",
  schedule: "0 0 * * *", // Tous les jours à minuit
  // Pour tester, utilisez: "*/5 * * * *" (toutes les 5 minutes)
}

