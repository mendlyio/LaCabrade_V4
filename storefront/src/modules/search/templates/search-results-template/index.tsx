import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import PaginatedProducts from "@modules/store/templates/paginated-products"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type SearchResultsTemplateProps = {
  query: string
  ids: string[]
  sortBy?: SortOptions
  page?: string
  countryCode: string
}

const SearchResultsTemplate = ({
  query,
  ids,
  sortBy,
  page,
  countryCode,
}: SearchResultsTemplateProps) => {
  const pageNumber = page ? parseInt(page) : 1
  const decodedQuery = decodeURIComponent(query)

  return (
    <div className="min-h-screen bg-white">
      {/* Header résultats */}
      <div className="border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-0.5">
              Résultats de recherche
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2 flex-wrap">
              <span>&ldquo;{decodedQuery}&rdquo;</span>
              {ids.length > 0 && (
                <span className="text-sm font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                  {ids.length} produit{ids.length > 1 ? "s" : ""}
                </span>
              )}
            </h1>
          </div>
          <LocalizedClientLink
            href="/store"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full transition-all font-medium flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Effacer
          </LocalizedClientLink>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-8">
        {ids.length > 0 ? (
          <PaginatedProducts
            productsIds={ids}
            sortBy={sortBy}
            page={pageNumber}
            countryCode={countryCode}
          />
        ) : (
          /* État vide */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Aucun résultat pour &ldquo;{decodedQuery}&rdquo;
            </h2>
            <p className="text-gray-400 text-sm max-w-sm mb-8">
              Essayez de vérifier l&apos;orthographe ou d&apos;utiliser des mots-clés plus généraux.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <LocalizedClientLink
                href="/store"
                className="px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl text-sm font-semibold transition-colors"
              >
                Parcourir tous les produits
              </LocalizedClientLink>
              <LocalizedClientLink
                href="/store?q=selle"
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-sm font-semibold transition-colors"
              >
                Selles
              </LocalizedClientLink>
              <LocalizedClientLink
                href="/store?q=bottes"
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-sm font-semibold transition-colors"
              >
                Bottes
              </LocalizedClientLink>
              <LocalizedClientLink
                href="/store?q=gants"
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-sm font-semibold transition-colors"
              >
                Gants
              </LocalizedClientLink>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchResultsTemplate
