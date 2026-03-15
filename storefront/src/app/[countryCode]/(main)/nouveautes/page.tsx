import { Metadata } from "next"
import { Suspense } from "react"
import { listCategories } from "@lib/data/categories"
import { listBrands } from "@lib/data/brands"
import FiltersModern from "@modules/store/components/filters-modern"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import PaginatedProductsModern from "@modules/store/templates/store-template-modern/paginated-products-modern"

export const metadata: Metadata = {
  title: "Nouveautés | La Cabrade",
  description: "Découvrez nos derniers produits équestres - Nouveautés et dernières arrivées",
}

type Props = {
  params: { countryCode: string }
  searchParams: {
    sortBy?: string
    page?: string
    q?: string
    brand?: string
    price_min?: string
    price_max?: string
    in_stock?: string
    on_sale?: string
  }
}

export default async function NouveautesPage({ params, searchParams }: Props) {
  const { countryCode } = params

  let categories: any[] = []
  let brands: any[] = []
  try {
    categories = await listCategories()
  } catch {}
  try {
    brands = await listBrands()
  } catch {}

  const activeFiltersCount = Object.keys(searchParams).filter(
    (key) => !["sortBy", "page"].includes(key) && searchParams[key as keyof typeof searchParams]
  ).length

  // Forcer le tri par nouveautés SAUF si le user choisit un autre tri
  const searchParamsWithOrder = {
    ...searchParams,
    sortBy: searchParams.sortBy || "created_at",
  }

  return (
    <div className="bg-gradient-to-b from-gray-50 to-white min-h-screen">
      {/* Hero */}
      <div className="bg-amber-600 text-white py-12 mb-8">
        <div className="content-container">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Nouveautés
            </h1>
            <p className="text-lg text-white/90">
              Découvrez nos derniers produits équestres — les équipements les plus récents pour vous et votre cheval.
            </p>
            {activeFiltersCount > 0 && (
              <div className="mt-4 flex items-center gap-2 text-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span>{activeFiltersCount} filtre{activeFiltersCount > 1 ? "s" : ""} actif{activeFiltersCount > 1 ? "s" : ""}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="content-container pb-16">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters (desktop: aside fixe / mobile: bouton + overlay) */}
          <aside className="lg:w-80 lg:flex-shrink-0">
            <FiltersModern categories={categories} brands={brands} />
          </aside>

          {/* Grille produits */}
          <main className="flex-1 min-w-0">
            <Suspense fallback={<SkeletonProductGrid />}>
              <PaginatedProductsModern
                searchParams={searchParamsWithOrder}
                countryCode={countryCode}
              />
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  )
}

