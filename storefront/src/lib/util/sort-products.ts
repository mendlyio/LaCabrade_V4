import { HttpTypes } from "@medusajs/types"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

const LC_EQUESTRIAN_HANDLES = ["la-cabrade", "lc-equestrian", "lc_equestrian"]

function isLcEquestrian(product: HttpTypes.StoreProduct): boolean {
  const categories = (product as any).categories || []
  return categories.some((cat: any) =>
    LC_EQUESTRIAN_HANDLES.includes(cat.handle?.toLowerCase())
  )
}

interface MinPricedProduct extends HttpTypes.StoreProduct {
  _minPrice?: number
}

/**
 * Helper function to sort products
 * @param products
 * @param sortBy
 * @param prioritizeLcEquestrian - si true, les produits LC-Equestrian passent en premier (page recherche)
 * @returns products sorted by the specified option
 */
export function sortProducts(
  products: HttpTypes.StoreProduct[],
  sortBy: SortOptions,
  prioritizeLcEquestrian = false
): HttpTypes.StoreProduct[] {
  let sortedProducts = [...products] as MinPricedProduct[]

  switch (sortBy) {
    case "price_asc":
    case "price_desc":
      // Precompute the minimum price for each product
      sortedProducts.forEach((product) => {
        if (product.variants && product.variants.length > 0) {
          product._minPrice = Math.min(
            ...product.variants.map(
              (variant) => variant?.calculated_price?.calculated_amount || 0
            )
          )
        } else {
          product._minPrice = Infinity
        }
      })

      // Sort products based on the precomputed minimum prices
      sortedProducts.sort((a, b) => {
        const diff = a._minPrice! - b._minPrice!
        return sortBy === "price_asc" ? diff : -diff
      })
      break

    case "created_at":
      sortedProducts.sort((a, b) => {
        return (
          new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime()
        )
      })
      break

    case "title_asc":
      sortedProducts.sort((a, b) => {
        const titleA = (a.title || "").toLowerCase()
        const titleB = (b.title || "").toLowerCase()
        return titleA.localeCompare(titleB)
      })
      break

    case "title_desc":
      sortedProducts.sort((a, b) => {
        const titleA = (a.title || "").toLowerCase()
        const titleB = (b.title || "").toLowerCase()
        return titleB.localeCompare(titleA)
      })
      break

    default:
      // Par défaut, tri par date de création (nouveautés)
      sortedProducts.sort((a, b) => {
        return (
          new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime()
        )
      })
  }

  // Page recherche : LC-Equestrian toujours en premier
  if (prioritizeLcEquestrian) {
    sortedProducts.sort((a, b) => {
      const aIsLC = isLcEquestrian(a)
      const bIsLC = isLcEquestrian(b)
      if (aIsLC && !bIsLC) return -1
      if (!aIsLC && bIsLC) return 1
      return 0
    })
  }

  return sortedProducts
}
