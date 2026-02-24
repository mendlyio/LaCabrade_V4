import { getRegion } from "@lib/data/regions"
import { getProductsList } from "@lib/data/products"
import { slugify } from "@lib/util/slugify"
import { listCategories } from "@lib/data/categories"
import { getCollectionsList } from "@lib/data/collections"
import { buildCategoryTree } from "@lib/util/category-tree"
import ProductCardModern from "@modules/products/components/product-card-modern"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import LoadMoreProducts from "./load-more-products"

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

  const buildSearchParams = (params: Record<string, unknown>) => {
    const urlParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        return
      }
      if (Array.isArray(value)) {
        const joined = value.filter(Boolean).join(",")
        if (joined) {
          urlParams.set(key, joined)
        }
        return
      }
      urlParams.set(key, String(value))
    })
    return urlParams.toString()
  }
  
  // Filtres côté client (hors marque, qui sera géré différemment)
  const hasClientSideFilters =
    searchParams.price_min ||
    searchParams.price_max ||
    searchParams.in_stock === "true" ||
    searchParams.on_sale === "true"
  const hasBrandFilter = !!searchParams.brand
  const limit = hasClientSideFilters ? 50 : 12

  // Récupérer les catégories et collections pour convertir les handles en IDs
  let categories: any[] = []
  let collections: any[] = []
  try {
    categories = await listCategories()
  } catch (error) {
    console.error("Erreur lors du chargement des catégories:", error)
  }
  try {
    const collectionsResult = await getCollectionsList(0, 100)
    collections = collectionsResult.collections || []
  } catch (error) {
    console.error("Erreur lors du chargement des collections:", error)
  }
  const { map: categoryMap } = buildCategoryTree(categories || [])

  // Construire les paramètres de requête
  const queryParams: any = {
    limit,
    offset: (page - 1) * limit,
    region_id: region.id,
    fields: "*variants.calculated_price,+variants.inventory_quantity,+metadata,+collection.title,+collection.handle,+categories.handle,+categories.name,+categories.id",
  }

  // Recherche
  if (searchParams.q) {
    queryParams.q = searchParams.q
  }

  // Catégorie - convertir handle en ID
  if (searchParams.category) {
    const category = categories?.find(cat => cat.handle === searchParams.category)
    if (category) {
      const collectCategoryIds = (categoryId: string) => {
        const ids: string[] = []
        const stack: string[] = [categoryId]
        const visited = new Set<string>()

        while (stack.length) {
          const currentId = stack.pop()
          if (!currentId || visited.has(currentId)) {
            continue
          }
          visited.add(currentId)
          ids.push(currentId)

          const node = categoryMap.get(currentId)
          node?.category_children?.forEach((child) => {
            if (child?.id && !visited.has(child.id)) {
              stack.push(child.id)
            }
          })
        }

        return ids
      }

      queryParams.category_id = collectCategoryIds(category.id)
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

  // Marque: filtrage côté client (plus fiable selon les backends)

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

  // ─── Récupérer les produits ───
  // Pour le filtre marque, on récupère TOUS les produits (paginated) pour un filtrage fiable
  let result
  try {
    if (hasBrandFilter) {
      // Fetch ALL products in batches and filter by brand server-side
      const batchSize = 100
      let allProducts: any[] = []
      let batchOffset = 0
      let totalProducts = 0

      do {
        const batchResult = await getProductsList({
          pageParam: 1,
          queryParams: {
            ...queryParams,
            limit: batchSize,
            offset: batchOffset,
          },
          countryCode,
        })
        const batchProducts = batchResult.response.products || []
        totalProducts = batchResult.response.count || 0
        allProducts = [...allProducts, ...batchProducts]
        batchOffset += batchSize
      } while (batchOffset < totalProducts)

      // Filtrer par marque côté serveur
      const normalizedBrand = slugify(searchParams.brand!)
      const brandProducts = allProducts.filter((product) => {
        const metadataBrand = product.metadata?.brand as string | undefined
        const collectionBrand = product.collection?.title
        const productBrand = metadataBrand || collectionBrand || ""
        return slugify(productBrand) === normalizedBrand
      })

      result = {
        response: {
          products: brandProducts,
          count: brandProducts.length,
        },
      }
    } else {
      result = await getProductsList({
        pageParam: page,
        queryParams,
        countryCode,
      })
    }
  } catch (error) {
    console.error("Erreur lors de la récupération des produits:", error)
    return (
      <div className="text-center py-24 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl">
        <div className="mb-6">
          <svg className="w-24 h-24 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-gray-800 mb-3">Impossible de charger les produits</h3>
        <p className="text-gray-600 mb-6">
          Une erreur est survenue lors du chargement. Merci de réessayer dans quelques instants.
        </p>
        <LocalizedClientLink
          href="/store"
          className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-md hover:shadow-lg"
        >
          Retour à la boutique
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </LocalizedClientLink>
      </div>
    )
  }

  let products = result?.response?.products || []
  const apiCount = result?.response?.count || 0
  let count = apiCount

  // Filtrage côté client pour les fonctionnalités non supportées par l'API
  let filteredProducts = [...products]

  // Note: le filtre par marque est déjà appliqué côté serveur (fetch complet)

  // Filtre par prix
  if (searchParams.price_min || searchParams.price_max) {
    filteredProducts = filteredProducts.filter(product => {
      const price = product.variants?.[0]?.calculated_price?.calculated_amount
      if (!price) return true
      
      const priceValue = price // Medusa v2 retourne déjà en euros
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

  // ─── Trier les produits LC-Equestrian en premier ───────────────────────────
  // Les produits de la catégorie "LC-Equestrian" / "la-cabrade" remontent toujours en tête
  const LC_EQUESTRIAN_HANDLES = ["la-cabrade", "lc-equestrian", "lc_equestrian"]
  const isLcEquestrian = (p: any) =>
    p.categories?.some((cat: any) =>
      LC_EQUESTRIAN_HANDLES.includes(cat.handle?.toLowerCase())
    ) ?? false

  filteredProducts = [...filteredProducts].sort((a, b) => {
    const aIsLC = isLcEquestrian(a)
    const bIsLC = isLcEquestrian(b)
    if (aIsLC && !bIsLC) return -1
    if (!aIsLC && bIsLC) return 1
    return 0
  })

  // Mettre à jour le count total après filtrage
  const totalFilteredCount = filteredProducts.length
  
  // Si on a des filtres côté client (prix, stock, promo) ou marque, paginer les résultats filtrés
  const displayLimit = 12 // Toujours afficher 12 produits par page
  const needsClientPagination = hasClientSideFilters || hasBrandFilter
  const startIndex = (page - 1) * displayLimit
  const endIndex = startIndex + displayLimit
  
  products = needsClientPagination
    ? filteredProducts.slice(startIndex, endIndex)
    : filteredProducts
  
  count = needsClientPagination ? totalFilteredCount : apiCount

  const totalPages = Math.ceil(count / displayLimit)
  const hasNextPage = page < totalPages
  const hasPrevPage = page > 1

  return (
    <div>
      {/* Résultats info */}
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="text-sm text-gray-500 font-medium tracking-wide">
          {count > 0 ? (
            <>
              <span className="text-gray-900 font-semibold">{count}</span> produit{count > 1 ? 's' : ''}
              {(searchParams.q || searchParams.category || searchParams.collection) && (
                <span className="text-gray-400"> &mdash; résultats filtrés</span>
              )}
            </>
          ) : (
            <span className="text-gray-400">Aucun produit trouvé</span>
          )}
        </div>
      </div>

      {/* Products Grid — "Charger plus" dynamique */}
      {products.length > 0 ? (
        <LoadMoreProducts
          key={[
            searchParams.q,
            searchParams.category,
            searchParams.collection,
            searchParams.brand,
            searchParams.sortBy,
            searchParams.price_min,
            searchParams.price_max,
            searchParams.in_stock,
            searchParams.on_sale,
          ].join("|")}
          initialProducts={products}
          totalCount={count}
          limit={displayLimit}
          countryCode={countryCode}
          regionId={region.id}
          queryParams={queryParams}
          brandSlug={searchParams.brand || undefined}
        />
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



