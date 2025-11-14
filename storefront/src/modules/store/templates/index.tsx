import { Suspense } from "react"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import PaginatedProducts from "./paginated-products"
import StoreFilters from "./store-filters"
import { getCollectionsList } from "@lib/data/collections"
import { listCategories } from "@lib/data/categories"

const StoreTemplate = async ({
  sortBy,
  page,
  countryCode,
  search,
}: {
  sortBy?: SortOptions
  page?: string
  countryCode: string
  search?: string
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  // Récupérer les collections (marques) et catégories pour les filtres
  const { collections } = await getCollectionsList(0, 100)
  const categories = await listCategories()

  return (
    <div className="py-6 content-container" data-testid="category-container">
      {/* Titre de la page */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900" data-testid="store-page-title">
          {search ? `Résultats pour "${search}"` : "Tous les produits"}
        </h1>
      </div>

      {/* Barre de filtres et tri EN HAUT - Client Component */}
      <StoreFilters 
        collections={collections} 
        categories={categories}
        currentSort={sort}
      />

      {/* Grille de produits */}
      <Suspense fallback={<SkeletonProductGrid />}>
        <PaginatedProducts
          sortBy={sort}
          page={pageNumber}
          countryCode={countryCode}
          search={search}
        />
      </Suspense>
    </div>
  )
}

export default StoreTemplate
