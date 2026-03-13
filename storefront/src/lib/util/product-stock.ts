import { HttpTypes } from "@medusajs/types"

/**
 * Vérifie si un variant est disponible.
 * Quand inventory_quantity est undefined/null (variant hors stock location), on suppose en stock.
 */
export function isVariantAvailable(variant?: HttpTypes.StoreProductVariant | null): boolean {
  if (!variant) return false
  if (!variant.manage_inventory || variant.allow_backorder) return true
  if (variant.inventory_quantity === undefined || variant.inventory_quantity === null) return true
  return (variant.inventory_quantity ?? 0) > 0
}

/**
 * Vérifie si un produit a des données d'inventaire (inventory_quantity présent).
 * Si absent, on suppose en stock partout.
 */
export function hasInventoryData(variants?: Array<{ inventory_quantity?: number | null; manage_inventory?: boolean | null }> | null): boolean {
  if (!variants?.length) return false
  return variants.some(
    (v) => v.manage_inventory && v.inventory_quantity !== undefined && v.inventory_quantity !== null
  )
}

/**
 * Produit en stock : au moins un variant disponible.
 * Si pas de données d'inventaire, suppose en stock.
 */
export function isProductInStock(variants?: HttpTypes.StoreProductVariant[] | null): boolean {
  if (!variants?.length) return false
  if (!hasInventoryData(variants as Array<{ inventory_quantity?: number | null; manage_inventory?: boolean | null }>)) return true
  return variants.some(isVariantAvailable)
}

/**
 * Calcule totalAvailable et isInStock pour les cartes produit.
 * Quand inventory_quantity absent, suppose en stock.
 */
export function getProductStockInfo(variants: HttpTypes.StoreProductVariant[] | undefined | null) {
  const v = variants || []
  const hasData = hasInventoryData(v)
  const hasUnlimitedStock = v.some((x) => !x.manage_inventory || x.allow_backorder)
  const totalAvailable = v.reduce((acc, x) => {
    if (!x.manage_inventory || x.allow_backorder) return acc
    return acc + (x.inventory_quantity ?? 0)
  }, 0)
  const isInStock = !hasData || hasUnlimitedStock || totalAvailable > 0
  const isLowStock = hasData && !hasUnlimitedStock && totalAvailable > 0 && totalAvailable < 5
  return { isInStock, isLowStock, totalAvailable, hasUnlimitedStock }
}
