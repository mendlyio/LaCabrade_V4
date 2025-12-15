import { Suspense } from "react"
import { listCategories } from "@lib/data/categories"
import { getCollectionsList } from "@lib/data/collections"
import FiltersModern from "@modules/store/components/filters-modern"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import PaginatedProductsModern from "@modules/store/templates/store-template-modern/paginated-products-modern"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"

export default async function CollectionTemplateModern({
  collection,
  searchParams,
  countryCode,
}: {
  collection: HttpTypes.StoreCollection
  searchParams: {
    sortBy?: string
    page?: string
    q?: string
    category?: string
    price_min?: string
    price_max?: string
    in_stock?: string
    on_sale?: string
  }
  countryCode: string
}) {
  // Récupérer toutes les catégories et collections pour les filtres
  const allCategories = await listCategories()
  const { collections } = await getCollectionsList(0, 100)

  // Compter le nombre de filtres actifs
  const activeFilters = Object.keys(searchParams).filter(
    key => !['sortBy', 'page'].includes(key) && searchParams[key as keyof typeof searchParams]
  ).length

  // Ajouter le handle de collection aux paramètres de recherche (pas l'ID)
  const searchParamsWithCollection = {
    ...searchParams,
    collection: collection.handle
  }

  return (
    <div className="bg-gradient-to-b from-gray-50 to-white min-h-screen">
      {/* Hero Section */}
      <div className="bg-[#ac2948] text-white py-12 mb-8">
        <div className="content-container">
          <div className="max-w-3xl">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm text-amber-100 mb-4">
              <LocalizedClientLink href="/store" className="hover:text-white transition-colors">
                Boutique
              </LocalizedClientLink>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <LocalizedClientLink href="/collections" className="hover:text-white transition-colors">
                Collections
              </LocalizedClientLink>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center gap-3">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              {collection.title}
            </h1>
            
            {collection.metadata?.description && (
              <p className="text-lg text-amber-50 mb-4">
                {collection.metadata.description as string}
              </p>
            )}

            {activeFilters > 0 && (
              <div className="mt-4 flex items-center gap-2 text-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span>{activeFilters} filtre{activeFilters > 1 ? 's' : ''} actif{activeFilters > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="content-container pb-16">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters - Desktop */}
          <aside className="hidden lg:block w-80 flex-shrink-0">
            <FiltersModern categories={allCategories} collections={collections} />
          </aside>

          {/* Mobile Filters */}
          <div className="lg:hidden">
            <FiltersModern categories={allCategories} collections={collections} />
          </div>

          {/* Products Grid */}
          <main className="flex-1">
            <Suspense fallback={<SkeletonProductGrid />}>
              <PaginatedProductsModern
                searchParams={searchParamsWithCollection}
                countryCode={countryCode}
              />
            </Suspense>
          </main>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="bg-gradient-to-r bg-gray-50 py-8 mt-16 border-t border-gray-200">
        <div className="content-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 text-amber-600 rounded-full mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Qualité garantie</h3>
              <p className="text-xs text-gray-600">Produits sélectionnés</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 text-amber-600 rounded-full mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Livraison rapide</h3>
              <p className="text-xs text-gray-600">En 48-72h</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 text-amber-600 rounded-full mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Retours gratuits</h3>
              <p className="text-xs text-gray-600">30 jours</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 text-amber-600 rounded-full mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Service client</h3>
              <p className="text-xs text-gray-600">À votre écoute</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

