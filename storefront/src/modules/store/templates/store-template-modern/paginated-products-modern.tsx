import { getRegion } from "@lib/data/regions"
import { getProductsList } from "@lib/data/products"
import { slugify } from "@lib/util/slugify"
import { listCategories } from "@lib/data/categories"
import { getCollectionsList } from "@lib/data/collections"
import ProductCardModern from "@modules/products/components/product-card-modern"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type SearchParams = {
  sortBy?: string
  page?: string
  q?: string
  category?: string
  collection?: string
  brand?: string
  price_min?: string
  price_max?: string
  in_stock?: string
  on_sale?: string
}

export default async function PaginatedProductsModern({
  searchParams,
  countryCode,
}: {
  searchParams: SearchParams
  countryCode: string
}) {
  const region = await getRegion(countryCode)
  
  if (!region) {
    return null
  }

  const page = searchParams.page ? parseInt(searchParams.page) : 1
  
  // Si on a des filtres côté client actifs, récupérer plus de produits pour compenser le filtrage
  const hasClientSideFilters = searchParams.price_min || searchParams.price_max || 
                                 searchParams.in_stock === 'true' || searchParams.on_sale === 'true'
  const limit = hasClientSideFilters ? 50 : 12 // Récupérer plus de produits si on a des filtres côté client

  // Récupérer les catégories et collections pour convertir les handles en IDs
  const categories = await listCategories()
  const { collections } = await getCollectionsList(0, 100)

  // Construire les paramètres de requête
  const queryParams: any = {
    limit,
    offset: (page - 1) * limit,
    region_id: region.id,
    fields: "*variants.calculated_price,+variants.inventory_quantity,+metadata",
  }

  // Recherche
  if (searchParams.q) {
    queryParams.q = searchParams.q
  }

  // Catégorie - convertir handle en ID
  if (searchParams.category) {
    const category = categories?.find(cat => cat.handle === searchParams.category)
    if (category) {
      queryParams.category_id = [category.id]
    } else {
      // Si la catégorie n'existe pas, retourner un résultat vide au lieu de tous les produits
      console.warn(`⚠️ Catégorie non trouvée pour le handle: ${searchParams.category}`)
      return (
        <div className="text-center py-24 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl">
          <div className="mb-6">
            <svg className="w-24 h-24 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-3">Catégorie non trouvée</h3>
          <p className="text-gray-600 mb-6">
            Cette catégorie n'existe pas ou a été supprimée.
          </p>
          <LocalizedClientLink
            href="/store"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-md hover:shadow-lg"
          >
            Voir tous les produits
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </LocalizedClientLink>
        </div>
      )
    }
  }

  // Collection - convertir handle en ID
  if (searchParams.collection) {
    const collection = collections?.find(col => col.handle === searchParams.collection)
    if (collection) {
      queryParams.collection_id = [collection.id]
    }
  }

  // Marque - tentative via metadata si supportée par l'API
  if (searchParams.brand) {
    queryParams["metadata[brand]"] = searchParams.brand
  }

  // Note: Les filtres de prix, stock et promotions seront appliqués côté client après récupération

  // Tri
  const sortBy = searchParams.sortBy || '-created_at'
  
  // Le tri est appliqué directement dans queryParams.order
  if (sortBy === 'price_asc') {
    queryParams.order = 'variants.calculated_price'
  } else if (sortBy === 'price_desc') {
    queryParams.order = '-variants.calculated_price'
  } else if (sortBy === 'title_asc') {
    queryParams.order = 'title'
  } else if (sortBy === 'title_desc') {
    queryParams.order = '-title'
  } else {
    // Par défaut, tri par date de création décroissante (plus récents en premier)
    queryParams.order = '-created_at'
  }

  // Récupérer les produits
  const result = await getProductsList({
    pageParam: page,
    queryParams,
    countryCode,
  })

  let products = result?.response?.products || []
  let count = result?.response?.count || 0

  // Filtrage côté client pour les fonctionnalités non supportées par l'API
  let filteredProducts = [...products]

  // Filtre par marque (sécurité côté client)
  if (searchParams.brand) {
    const normalizedBrand = slugify(searchParams.brand)
    filteredProducts = filteredProducts.filter((product) => {
      const metadataBrand = product.metadata?.brand as string | undefined
      const collectionBrand = product.collection?.title
      const productBrand = metadataBrand || collectionBrand || ""

      return slugify(productBrand) === normalizedBrand
    })
  }

  // Filtre par prix
  if (searchParams.price_min || searchParams.price_max) {
    filteredProducts = filteredProducts.filter(product => {
      const price = product.variants?.[0]?.calculated_price?.calculated_amount
      if (!price) return true
      
      const priceValue = price / 100 // Convertir centimes en euros
      const minPrice = searchParams.price_min ? parseFloat(searchParams.price_min) : 0
      const maxPrice = searchParams.price_max ? parseFloat(searchParams.price_max) : Infinity
      
      return priceValue >= minPrice && priceValue <= maxPrice
    })
  }

  // Filtre en stock uniquement
  if (searchParams.in_stock === 'true') {
    filteredProducts = filteredProducts.filter(product => {
      return product.variants?.some(v => (v.inventory_quantity || 0) > 0)
    })
  }

  // Filtre promotions uniquement
  if (searchParams.on_sale === 'true') {
    filteredProducts = filteredProducts.filter(product => {
      const variant = product.variants?.[0]
      return variant?.calculated_price && 
             variant.calculated_price.calculated_amount < variant.calculated_price.original_amount
    })
  }

  // Mettre à jour le count total après filtrage
  const totalFilteredCount = filteredProducts.length
  
  // Si on a des filtres côté client, paginer les résultats filtrés
  const displayLimit = 12 // Toujours afficher 12 produits par page
  const startIndex = (page - 1) * displayLimit
  const endIndex = startIndex + displayLimit
  
  products = hasClientSideFilters 
    ? filteredProducts.slice(startIndex, endIndex)
    : filteredProducts
  
  count = totalFilteredCount

  const totalPages = Math.ceil(count / displayLimit)
  const hasNextPage = page < totalPages
  const hasPrevPage = page > 1

  return (
    <div>
      {/* Résultats info */}
      <div className="mb-6 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {count > 0 ? (
            <>
              Affichage de <span className="font-semibold text-gray-900">{startIndex + 1}</span> à{' '}
              <span className="font-semibold text-gray-900">{Math.min(endIndex, count)}</span> sur{' '}
              <span className="font-semibold text-gray-900">{count}</span> produit{count > 1 ? 's' : ''}
            </>
          ) : (
            <span className="text-gray-500">Aucun produit trouvé</span>
          )}
        </div>
        
        {totalPages > 1 && (
          <div className="text-sm text-gray-600">
            Page <span className="font-semibold text-gray-900">{page}</span> sur{' '}
            <span className="font-semibold text-gray-900">{totalPages}</span>
          </div>
        )}
      </div>

      {/* Products Grid */}
      {products.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {products.map((product) => (
              <ProductCardModern
                key={product.id}
                product={product}
                region={region}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-12">
              {/* Bouton Précédent */}
              {hasPrevPage ? (
                <LocalizedClientLink
                  href={`/store?${new URLSearchParams({
                    ...searchParams,
                    page: String(page - 1),
                  }).toString()}`}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Précédent
                </LocalizedClientLink>
              ) : (
                <div className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-400 cursor-not-allowed flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Précédent
                </div>
              )}

              {/* Numéros de page */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (page <= 3) {
                    pageNum = i + 1
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = page - 2 + i
                  }

                  const isActive = pageNum === page

                  return (
                    <LocalizedClientLink
                      key={pageNum}
                      href={`/store?${new URLSearchParams({
                        ...searchParams,
                        page: String(pageNum),
                      }).toString()}`}
                      className={`
                        w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-all
                        ${isActive
                          ? 'bg-amber-600 text-white shadow-md'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }
                      `}
                    >
                      {pageNum}
                    </LocalizedClientLink>
                  )
                })}
              </div>

              {/* Bouton Suivant */}
              {hasNextPage ? (
                <LocalizedClientLink
                  href={`/store?${new URLSearchParams({
                    ...searchParams,
                    page: String(page + 1),
                  }).toString()}`}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 flex items-center gap-2"
                >
                  Suivant
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </LocalizedClientLink>
              ) : (
                <div className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-400 cursor-not-allowed flex items-center gap-2">
                  Suivant
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-24 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl">
          <div className="mb-6">
            <svg className="w-24 h-24 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-3">Aucun produit trouvé</h3>
          <p className="text-gray-600 mb-6">
            Essayez de modifier vos filtres ou votre recherche
          </p>
          <LocalizedClientLink
            href="/store"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-md hover:shadow-lg"
          >
            Voir tous les produits
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </LocalizedClientLink>
        </div>
      )}
    </div>
  )
}



