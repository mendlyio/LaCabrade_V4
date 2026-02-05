import { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { ODOO_MODULE } from "../modules/odoo"
import OdooModuleService from "../modules/odoo/service"

/**
 * Job planifié : Synchronisation du stock Odoo → Medusa toutes les 15 minutes
 * 
 * ⚠️ Ce job synchronise UNIQUEMENT le stock des produits DÉJÀ importés dans Medusa
 * Les imports de produits se font manuellement via l'UI Admin
 */
export default async function syncStockFromOdooJob(container: MedusaContainer) {
  try {
    // Vérifier la configuration Odoo
    if (!process.env.ODOO_URL || !process.env.ODOO_DB_NAME) {
      return // Silent skip si Odoo non configuré
    }

    // Vérifier si le module Odoo est enregistré
    let odooService: OdooModuleService
    try {
      odooService = container.resolve(ODOO_MODULE)
    } catch (error) {
      // Module Odoo non enregistré, skip silencieusement
      return
    }

    console.log("🔄 [STOCK SYNC] Démarrage sync stock depuis Odoo...")

    const inventoryService = container.resolve(Modules.INVENTORY)
    const productService = container.resolve(Modules.PRODUCT)

    // Récupérer tous les produits Medusa ayant un external_id (= importés depuis Odoo)
    // IMPORTANT: listProducts() est paginé par défaut.
    // Inclure les variantes pour pouvoir lire les SKUs et synchroniser le stock.
    const medusaProducts = await productService.listProducts(
      {},
      {
        select: ["id", "metadata"],
        relations: ["variants"],
        take: 10000,
      }
    )
    
    const productsWithOdooId = medusaProducts.filter(
      (p: any) => p.metadata?.external_id
    )

    if (productsWithOdooId.length === 0) {
      console.log("ℹ️  [STOCK SYNC] Aucun produit Odoo importé dans Medusa")
      return
    }

    console.log(`📦 [STOCK SYNC] ${productsWithOdooId.length} produits à vérifier`)

    let updated = 0
    let skipped = 0
    let errors = 0

    // Pour chaque produit, récupérer le stock depuis Odoo et mettre à jour Medusa
    for (const product of productsWithOdooId) {
      for (const variant of product.variants || []) {
        if (!variant.sku) {
          console.log(`⚠️  [STOCK SYNC] Variante sans SKU trouvée: ${variant.id} (produit: ${product.title})`)
          console.log(`    → Cette variante ne sera pas synchronisée. Vérifiez l'import Odoo.`)
          skipped++
          continue
        }

        try {
          // Récupérer le stock depuis Odoo via le SKU
          const odooStock = await odooService.getStockBySku(variant.sku)
          
          if (odooStock === null) {
            console.log(`⚠️  [STOCK SYNC] SKU ${variant.sku} non trouvé dans Odoo`)
            skipped++
            continue
          }

          // 🔍 Récupérer l'inventory item via le SKU (avec gestion des doublons)
          let inventoryItems = await inventoryService.listInventoryItems({
            sku: [variant.sku],
          })

          // 🧹 Détecter et supprimer les doublons
          if (inventoryItems.length > 1) {
            console.warn(`⚠️  [STOCK SYNC] ${inventoryItems.length} doublons inventory_item pour SKU ${variant.sku}, nettoyage...`)
            
            const sorted = inventoryItems.sort((a: any, b: any) => 
              new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
            )
            const toKeep = sorted[0]
            const toDelete = sorted.slice(1)
            
            for (const oldItem of toDelete) {
              try {
                const oldLevels = await inventoryService.listInventoryLevels({ 
                  inventory_item_id: [oldItem.id] 
                })
                if (oldLevels.length > 0) {
                  // Fusionner les stocks avant de supprimer
                  const totalStock = oldLevels.reduce((sum: number, level: any) => sum + (level.stocked_quantity || 0), 0)
                  if (totalStock > 0) {
                    console.log(`  📦 Fusion stock ${variant.sku}: +${totalStock} vers item principal`)
                  }
                  await inventoryService.deleteInventoryLevels(oldLevels.map((l: any) => l.id))
                }
                
                await inventoryService.deleteInventoryItems([oldItem.id])
                console.log(`  🧹 Doublon inventory_item supprimé: ${oldItem.id}`)
              } catch (deleteErr) {
                // Continuer même si erreur
              }
            }
            
            inventoryItems = [toKeep]
          }

          if (!inventoryItems.length) {
            console.log(`⚠️  [STOCK SYNC] Aucun inventory item trouvé pour SKU ${variant.sku}`)
            skipped++
            continue
          }

          const inventoryItem = inventoryItems[0]

          // 🔗 S'assurer que le lien variant↔inventory existe
          try {
            const remoteLink = container.resolve("remoteLink")
            await remoteLink.create([
              { 
                [Modules.PRODUCT]: { variant_id: variant.id }, 
                [Modules.INVENTORY]: { inventory_item_id: inventoryItem.id } 
              }
            ])
          } catch (linkErr: any) {
            // Lien existe déjà ou erreur non critique
            if (!linkErr.message?.includes("already exists")) {
              console.log(`  🔗 [STOCK SYNC] Lien variant↔inventory ${variant.sku}:`, linkErr.message)
            }
          }

          const levels = await inventoryService.listInventoryLevels({
            inventory_item_id: [inventoryItem.id],
          })

          if (levels.length > 0) {
            const currentStock = levels[0].stocked_quantity || 0
            
            // Mettre à jour seulement si différent
            if (currentStock !== odooStock) {
              await inventoryService.updateInventoryLevels({
                inventory_item_id: inventoryItem.id,
                location_id: levels[0].location_id,
                stocked_quantity: odooStock,
              })
              
              console.log(
                `✅ [STOCK SYNC] ${variant.sku}: ${currentStock} → ${odooStock}`
              )
              updated++
            } else {
              // Stock identique, pas de mise à jour
              skipped++
            }
          } else {
            console.log(`⚠️  [STOCK SYNC] Aucun niveau de stock pour ${variant.sku}, création impossible ici`)
            skipped++
          }
        } catch (error: any) {
          console.error(`❌ [STOCK SYNC] Erreur ${variant.sku}:`, error.message)
          errors++
        }
      }
    }

    console.log(
      `✅ [STOCK SYNC] Terminé: ${updated} mis à jour, ${skipped} inchangés, ${errors} erreurs`
    )
  } catch (error: any) {
    console.error("❌ [STOCK SYNC] Erreur globale:", error)
  }
}

export const config = {
  name: "odoo-stock-sync-15min",
  schedule: "*/15 * * * *", // Toutes les 15 minutes
}

