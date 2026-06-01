import { Suspense } from "react"
import { notFound } from "next/navigation"
import { listCategories } from "@lib/data/categories"
import { listBrandsByCategory } from "@lib/data/brands"
import { buildCategoryTree } from "@lib/util/category-tree"
import FiltersModern from "@modules/store/components/filters-modern"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import PaginatedProductsModern from "@modules/store/templates/store-template-modern/paginated-products-modern"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"

export default async function CategoryTemplateModern({
  categories,
  searchParams,
  countryCode,
}: {
  categories: HttpTypes.StoreProductCategory[]
  searchParams: {
    sortBy?: string
    page?: string
    q?: string
    collection?: string
    brand?: string
    price_min?: string
    price_max?: string
    in_stock?: string
    on_sale?: string
  }
  countryCode: string
}) {
  const category = categories[categories.length - 1]
  const parents = categories.slice(0, categories.length - 1)

  if (!category || !countryCode) notFound()

  // Récupérer toutes les catégories pour les filtres et l'arborescence
  let allCategories: HttpTypes.StoreProductCategory[] = []
  try {
    allCategories = await listCategories()
  } catch (error) {
    console.error("Erreur lors du chargement des catégories:", error)
  }
  const { map: categoryMap } = buildCategoryTree(allCategories || [])
  const categoryNode = categoryMap.get(category.id) || category
  const categoryChildren = categoryNode.category_children || []

  // IDs de la catégorie courante + tous ses descendants
  const collectCategoryIds = (rootId: string): string[] => {
    const ids: string[] = []
    const stack = [rootId]
    const visited = new Set<string>()
    while (stack.length) {
      const id = stack.pop()
      if (!id || visited.has(id)) continue
      visited.add(id)
      ids.push(id)
      const node = categoryMap.get(id)
      node?.category_children?.forEach((child: any) => {
        if (child?.id && !visited.has(child.id)) stack.push(child.id)
      })
    }
    return ids
  }
  const categoryIds = collectCategoryIds(category.id)

  // Marques présentes UNIQUEMENT dans cette catégorie (et ses sous-catégories)
  let brands: any[] = []
  try {
    brands = await listBrandsByCategory(categoryIds)
  } catch (error) {
    console.error("Erreur lors du chargement des marques de la catégorie:", error)
  }

  // Compter le nombre de filtres actifs
  const activeFilters = Object.keys(searchParams).filter(
    key => !['sortBy', 'page'].includes(key) && searchParams[key as keyof typeof searchParams]
  ).length

  // Ajouter le handle de catégorie aux paramètres de recherche (pas l'ID)
  const searchParamsWithCategory = {
    ...searchParams,
    category: category.handle
  }

  return (
    <div className="bg-gradient-to-b from-gray-50 to-white min-h-screen">
      {/* Hero Section */}
      <div className="bg-[#9e354a] text-white py-12 mb-8">
        <div className="content-container">
          <div className="w-full">
            {/* Breadcrumbs */}
            {parents && parents.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-100 mb-4">
                <LocalizedClientLink href="/store" className="hover:text-white transition-colors">
                  Boutique
                </LocalizedClientLink>
                {parents.map((parent) => (
                  <span key={parent.id} className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <LocalizedClientLink
                      href={`/categories/${encodeURIComponent(parent.handle)}`}
                      className="hover:text-white transition-colors"
                    >
                      {parent.name}
                    </LocalizedClientLink>
                  </span>
                ))}
              </div>
            )}

            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {category.name}
            </h1>

            {category.description && (
              <p className="text-base md:text-lg text-white/95 leading-relaxed mb-4">
                {category.description}
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

      {/* Sous-catégories — repliable */}
      {categoryChildren.length > 0 && (
        <div className="content-container mb-8">
          <details className="group bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
            <summary className="flex items-center justify-between cursor-pointer px-5 py-4 bg-white hover:bg-gray-50 transition-colors select-none">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Sous-catégories
                <span className="ml-1 text-sm font-normal text-gray-500">({categoryChildren.length})</span>
              </h2>
              <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="px-5 pb-5 bg-gray-50 rounded-b-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryChildren.map((child) => (
                  <div key={child.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <LocalizedClientLink
                      href={`/categories/${encodeURIComponent(child.handle)}`}
                      className="flex items-center gap-2 pb-2 border-b border-gray-200 group transition-colors"
                    >
                      <span className="flex-1 text-sm font-semibold text-gray-800 group-hover:text-amber-600 transition-colors">
                        {child.name}
                      </span>
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-amber-600 transform group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </LocalizedClientLink>

                    {child.category_children && child.category_children.length > 0 && (
                      <ul className="mt-3 space-y-2">
                        {child.category_children.map((grandChild) => (
                          <li key={grandChild.id} className="space-y-1">
                            <LocalizedClientLink
                              href={`/categories/${encodeURIComponent(grandChild.handle)}`}
                              className="block rounded-md px-3 py-2 text-sm font-semibold text-gray-600 hover:text-white hover:bg-amber-600 transition-colors"
                            >
                              {grandChild.name}
                            </LocalizedClientLink>
                            {grandChild.category_children &&
                              grandChild.category_children.length > 0 && (
                                <ul className="pl-3 border-l border-gray-200 space-y-1">
                                  {grandChild.category_children.map((greatGrandChild) => (
                                    <li key={greatGrandChild.id}>
                                      <LocalizedClientLink
                                        href={`/categories/${encodeURIComponent(greatGrandChild.handle)}`}
                                        className="block rounded-md px-3 py-1 text-xs font-normal text-gray-500 hover:text-white hover:bg-amber-500 transition-colors"
                                      >
                                        {greatGrandChild.name}
                                      </LocalizedClientLink>
                                    </li>
                                  ))}
                                </ul>
                              )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </details>
        </div>
      )}

      {/* Main Content */}
      <div className="content-container pb-16">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters (desktop: aside fixe / mobile: bouton + overlay) */}
          <aside className="lg:w-80 lg:flex-shrink-0">
            <FiltersModern categories={allCategories || []} brands={brands || []} />
          </aside>

          {/* Products Grid */}
          <main className="flex-1 min-w-0">
            <Suspense fallback={<SkeletonProductGrid />}>
              <PaginatedProductsModern
                searchParams={searchParamsWithCategory}
                countryCode={countryCode}
              />
            </Suspense>
          </main>
        </div>
      </div>

      {/* Bloc SEO : contenu indexable + maillage interne vers les marques */}
      <div className="content-container pb-12">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            {category.name} — Sellerie en ligne La Cabrade (Liège, Belgique)
          </h2>
          <p className="text-sm md:text-base text-gray-600 leading-relaxed">
            Découvrez notre sélection <strong>{category.name.toLowerCase()}</strong> chez La Cabrade,
            votre sellerie équestre en ligne basée à Fléron, près de Liège. Nous proposons un large
            choix d&apos;équipement pour le cheval et le cavalier, sélectionné auprès des plus grandes
            marques, avec livraison rapide en Belgique, en France et partout en Europe. Nos experts
            passionnés d&apos;équitation vous conseillent en magasin comme en ligne.
          </p>

          {brands.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Marques disponibles dans cette catégorie
              </h3>
              <div className="flex flex-wrap gap-2">
                {brands.map((brand: any) => (
                  <LocalizedClientLink
                    key={brand.slug}
                    href={`/marques/${brand.slug}`}
                    className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                  >
                    {brand.name}
                    <span className="text-gray-400">({brand.count})</span>
                  </LocalizedClientLink>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Trust Badges */}
      <div className="bg-gradient-to-r bg-gray-50 py-8 mt-4 border-t border-gray-200">
        <div className="content-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-600 text-white rounded-full mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Qualité garantie</h3>
              <p className="text-xs text-gray-600">Produits sélectionnés</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-600 text-white rounded-full mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Livraison rapide</h3>
              <p className="text-xs text-gray-600">En 48-72h</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-600 text-white rounded-full mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Retours à charge du client</h3>
              <p className="text-xs text-gray-600">30 jours</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-600 text-white rounded-full mb-3">
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

