import { getRegion } from "@lib/data/regions"
import { getProductsList } from "@lib/data/products"
import { slugify } from "@lib/util/slugify"
import { sortProducts } from "@lib/util/sort-products"
import { listCategories } from "@lib/data/categories"
import { getCollectionsList } from "@lib/data/collections"
import { buildCategoryTree } from "@lib/util/category-tree"
import ProductCardModern from "@modules/products/components/product-card-modern"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import LoadMoreProducts from "./load-more-products"
import ViewItemListTracker from "@modules/common/components/tracking/view-item-list-tracker"

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
  // Pages catégorie : on récupère tous les produits pour trier LC-Equestrian en premier
  const hasCategoryFilter = !!searchParams.category
  // Tri par prix/titre : l'API Medusa a des bugs avec order=variants.calculated_price,
  // on récupère tout et on trie côté client
  const sortBy = searchParams.sortBy || '-created_at'
  const needsClientSideSort =
    sortBy === 'price_asc' || sortBy === 'price_desc' || sortBy === 'title_asc' || sortBy === 'title_desc'
  const hasSearchQuery = !!(searchParams.q?.trim() && searchParams.q.trim().length >= 2)
  const limit = hasClientSideFilters || hasCategoryFilter || needsClientSideSort || hasSearchQuery ? 100 : 12

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
    fields: "*variants.calculated_price,+variants.inventory_quantity,+variants.prices,+metadata,+collection.title,+collection.handle,+categories.handle,+categories.name,+categories.id",
  }

  // Recherche : paramètre q de Medusa (titre, description, SKU, variantes, collections)
  const rawQuery = searchParams.q?.trim()
  if (rawQuery && rawQuery.length >= 2) {
    queryParams.q = rawQuery
  }

  // Catégorie - convertir handle en ID + IDs autorisés pour filtrage strict côté client
  let allowedCategoryIds = new Set<string>()
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

      const categoryIds = collectCategoryIds(category.id)
      categoryIds.forEach((id) => allowedCategoryIds.add(id))
      queryParams.category_id = categoryIds
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

  // Le tri par prix/titre est fait côté client (needsClientSideSort). Sinon on passe order à l'API.
  if (!needsClientSideSort) {
    queryParams.order = '-created_at'
  } else {
    // L'API peut ne pas supporter ces champs correctement, on trie côté client
    queryParams.order = '-created_at'
  }

  // ─── Récupérer les produits ───
  // Pour filtre marque, page catégorie OU tri prix/titre : on récupère TOUS les produits et on trie côté client
  let result
  try {
    if (hasBrandFilter || hasCategoryFilter || needsClientSideSort || hasSearchQuery) {
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

      // Filtrer par marque côté serveur (si filtre marque actif)
      let finalProducts = allProducts
      if (hasBrandFilter) {
        const normalizedBrand = slugify(searchParams.brand!)
        finalProducts = allProducts.filter((product) => {
          const metadataBrand = product.metadata?.brand as string | undefined
          const collectionBrand = product.collection?.title
          const productBrand = metadataBrand || collectionBrand || ""
          return slugify(productBrand) === normalizedBrand
        })
      }

      // Filtrer par catégorie côté client (strict) — évite le mélange entre catégories similaires
      // ex: "bonnets" (cheval) vs "bonnets, bandeaux, écharpes" (cavalier)
      if (hasCategoryFilter && allowedCategoryIds.size > 0) {
        finalProducts = finalProducts.filter((product) => {
          const productCategoryIds = (product.categories || []).map((c: any) => c?.id).filter(Boolean)
          return productCategoryIds.some((id: string) => allowedCategoryIds.has(id))
        })
      }

      // Tri par prix/titre côté client (l'API Medusa a des bugs avec order=variants.calculated_price)
      // Sur page catégorie : LC-Equestrian reste prioritaire tout en respectant le tri choisi
      if (needsClientSideSort) {
        finalProducts = sortProducts(
          finalProducts,
          sortBy as "price_asc" | "price_desc" | "title_asc" | "title_desc" | "created_at",
          hasCategoryFilter
        )
      }

      result = {
        response: {
          products: finalProducts,
          count: finalProducts.length,
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

  // Recherche : filtrer par titre/handle car l'API Medusa renvoie des faux positifs (ex: "gant" → bottes)
  if (rawQuery && rawQuery.length >= 2) {
    const qLower = rawQuery.toLowerCase()
    filteredProducts = filteredProducts.filter((p) => {
      const title = (p.title || "").toLowerCase()
      const handle = (p.handle || "").toLowerCase()
      const variantTitles = (p.variants || []).map((v: any) => (v.title || "").toLowerCase()).join(" ")
      return title.includes(qLower) || handle.includes(qLower) || variantTitles.includes(qLower)
    })
  }

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

  // ─── Trier les produits LC-Equestrian en premier (catégories + boutique sans filtre) ───
  // Sur une page catégorie (ex: Cavalier), LC-Equestrian en priorité par défaut.
  // Dès qu'un filtre utilisateur est actif (tri, prix, stock, promo, marque, recherche), on respecte le choix.
  // Note: hasCategoryFilter n'est PAS un "filtre actif" — c'est la navigation normale vers une catégorie.
  const userHasActiveFilter =
    needsClientSideSort ||
    hasClientSideFilters ||
    hasBrandFilter ||
    !!searchParams.q
  const LC_EQUESTRIAN_HANDLES = ["la-cabrade", "lc-equestrian", "lc_equestrian"]
  const isLcEquestrian = (p: any) =>
    p.categories?.some((cat: any) =>
      LC_EQUESTRIAN_HANDLES.includes(cat.handle?.toLowerCase())
    ) ?? false

  if (!userHasActiveFilter) {
    filteredProducts = [...filteredProducts].sort((a, b) => {
      const aIsLC = isLcEquestrian(a)
      const bIsLC = isLcEquestrian(b)
      if (aIsLC && !bIsLC) return -1
      if (!aIsLC && bIsLC) return 1
      return 0
    })
  }

  // Mettre à jour le count total après filtrage
  const totalFilteredCount = filteredProducts.length
  
  // Si on a des filtres côté client (prix, stock, promo), marque, page catégorie, tri ou recherche, paginer les résultats filtrés
  const displayLimit = 12 // Toujours afficher 12 produits par page
  const needsClientPagination = hasClientSideFilters || hasBrandFilter || hasCategoryFilter || needsClientSideSort || hasSearchQuery
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
        <>
          <ViewItemListTracker
            products={products}
            listName={
              searchParams.category
                ? (categories || []).find((c) => c.handle === searchParams.category)?.name || "Catégorie"
                : searchParams.collection
                  ? (collections || []).find((c) => c.handle === searchParams.collection)?.title || "Collection"
                  : searchParams.q
                    ? "Recherche"
                    : "Boutique"
            }
          />
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
          allProducts={needsClientPagination ? filteredProducts : undefined}
        />
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



