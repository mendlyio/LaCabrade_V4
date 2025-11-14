import { HttpTypes } from "@medusajs/types"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

interface MinPricedProduct extends HttpTypes.StoreProduct {
  _minPrice?: number
}

/**
 * Helper function to sort products
 * @param products
 * @param sortBy
 * @returns products sorted by the specified option
 */
export function sortProducts(
  products: HttpTypes.StoreProduct[],
  sortBy: SortOptions
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

  return sortedProducts
}
