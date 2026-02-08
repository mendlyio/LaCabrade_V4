"use client"

import { useCallback, useState, useTransition } from "react"
import { HttpTypes } from "@medusajs/types"
import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type LoadMoreProductsProps = {
  initialProducts: HttpTypes.StoreProduct[]
  totalCount: number
  limit: number
  countryCode: string
  regionId: string
  queryParams: Record<string, any>
  brandSlug?: string
}

// Carte produit côté client (pas de fetch serveur)
function ProductCardClient({
  product,
  isNew,
}: {
  product: HttpTypes.StoreProduct
  isNew?: boolean
}) {
  const variant = product.variants?.[0] as any
  const price = variant?.calculated_price?.calculated_amount
  const originalPrice = variant?.calculated_price?.original_amount
  const currencyCode = variant?.calculated_price?.currency_code || "eur"
  const hasDiscount = price != null && originalPrice != null && price < originalPrice
  const discountPct = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currencyCode,
    }).format(amount)

  const isInStock = product.variants?.some((v) => {
    if (!v.manage_inventory || v.allow_backorder) return true
    return (v.inventory_quantity || 0) > 0
  })

  const collection = product.collection?.title
  const images = product.images || []
  const hoverImage = images.length > 2 ? images[2]?.url : null

  return (
    <LocalizedClientLink
      href={`/products/${product.handle}`}
      className="group block h-full"
    >
      <div
        className={`bg-white rounded-2xl overflow-hidden transition-all duration-300 border h-full flex flex-col hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] ${
          !isInStock
            ? "border-gray-200 opacity-75 hover:opacity-100"
            : "border-gray-100 hover:border-gray-200"
        } ${isNew ? "animate-fade-in" : ""}`}
      >
        {/* Image */}
        <div className="relative aspect-[4/5] overflow-hidden bg-gray-50">
          {product.thumbnail ? (
            <Image
              src={product.thumbnail}
              alt={product.title || "Produit"}
              fill
              className={`object-cover transition-all duration-700 ease-out ${
                hoverImage
                  ? "group-hover:opacity-0 group-hover:scale-105"
                  : "group-hover:scale-[1.06] group-hover:rotate-[1.5deg]"
              }`}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
              <svg className="w-12 h-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          )}

          {/* 3ème image au hover */}
          {hoverImage && (
            <Image
              src={hoverImage}
              alt={`${product.title} - vue alternative`}
              fill
              className="object-cover absolute inset-0 opacity-0 scale-[1.08] rotate-[-1deg] group-hover:opacity-100 group-hover:scale-[1.03] group-hover:rotate-[1deg] transition-all duration-700 ease-out"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          )}

          {/* Badges */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
            {hasDiscount && (
              <div className="bg-red-500 text-white px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-[11px] font-bold tracking-wide shadow-sm">
                -{discountPct}%
              </div>
            )}
            {!isInStock && (
              <div className="bg-gray-900/80 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-[11px] font-medium">
                Épuisé
              </div>
            )}
          </div>

          {collection && (
            <div className="absolute top-2.5 right-2.5 z-10">
              <div className="bg-white/80 backdrop-blur-md text-gray-600 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider shadow-sm">
                {collection}
              </div>
            </div>
          )}

          {!isInStock && (
            <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-[1px] flex items-center justify-center z-10">
              <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-sm font-bold text-gray-800 uppercase tracking-wider">Épuisé</span>
              </div>
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="p-3 sm:p-4 flex-1 flex flex-col gap-1">
          <h3 className="font-semibold text-gray-900 group-hover:text-amber-600 transition-colors text-[13px] sm:text-sm leading-snug line-clamp-2 flex-1">
            {product.title}
          </h3>

          {isInStock && (
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              En stock
            </div>
          )}

          <div className="flex items-end justify-between gap-2 mt-auto pt-1.5">
            <div className="flex flex-col">
              {hasDiscount ? (
                <>
                  <span className="text-[11px] text-gray-400 line-through leading-none">
                    {formatPrice(originalPrice)}
                  </span>
                  <span className="text-base sm:text-lg font-bold text-red-600 leading-tight">
                    {formatPrice(price)}
                  </span>
                </>
              ) : price ? (
                <span className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                  {formatPrice(price)}
                </span>
              ) : (
                <span className="text-sm text-gray-500">Sur demande</span>
              )}
            </div>

            <span className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-amber-600 text-gray-400 group-hover:text-white flex items-center justify-center transition-all duration-300 flex-shrink-0 group-hover:shadow-md">
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </LocalizedClientLink>
  )
}

function slugifyBrand(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export default function LoadMoreProducts({
  initialProducts,
  totalCount,
  limit,
  countryCode,
  regionId,
  queryParams,
  brandSlug,
}: LoadMoreProductsProps) {
  const [products, setProducts] = useState<HttpTypes.StoreProduct[]>(initialProducts)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [newProductIds, setNewProductIds] = useState<Set<string>>(new Set())

  const hasMore = products.length < totalCount

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return
    setIsLoading(true)

    try {
      const nextPage = page + 1
      const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
      const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

      const params = new URLSearchParams()
      params.set("limit", String(limit))
      params.set("offset", String(page * limit))
      params.set("region_id", regionId)
      params.set("fields", "*variants.calculated_price,+variants.inventory_quantity,+images,+metadata,+collection.title,+collection.handle")

      // Pass through relevant query params
      if (queryParams.category_id) {
        const ids = Array.isArray(queryParams.category_id) ? queryParams.category_id : [queryParams.category_id]
        ids.forEach((id: string) => params.append("category_id[]", id))
      }
      if (queryParams.collection_id) {
        const ids = Array.isArray(queryParams.collection_id) ? queryParams.collection_id : [queryParams.collection_id]
        ids.forEach((id: string) => params.append("collection_id[]", id))
      }
      if (queryParams.q) params.set("q", queryParams.q)
      if (queryParams.order) params.set("order", queryParams.order)

      const headers: Record<string, string> = {}
      if (publishableKey) {
        headers["x-publishable-api-key"] = publishableKey
      }

      const res = await fetch(`${backendUrl}/store/products?${params.toString()}`, {
        headers,
      })

      if (!res.ok) throw new Error("Erreur chargement")

      const data = await res.json()
      let newProducts = data.products || []

      // Filtrer par marque côté client si nécessaire
      if (brandSlug) {
        newProducts = newProducts.filter((product: any) => {
          const metadataBrand = product.metadata?.brand as string | undefined
          const collectionBrand = product.collection?.title
          const productBrand = metadataBrand || collectionBrand || ""
          return slugifyBrand(productBrand) === brandSlug
        })
      }

      // Track new products for animation
      const newIds = new Set(newProducts.map((p: any) => p.id))
      setNewProductIds(newIds)
      setTimeout(() => setNewProductIds(new Set()), 1000)

      setProducts((prev) => [...prev, ...newProducts])
      setPage(nextPage)
    } catch (error) {
      console.error("Erreur chargement produits:", error)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, hasMore, page, limit, regionId, queryParams])

  return (
    <div>
      {/* Products Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
        {products.map((product) => (
          <ProductCardClient
            key={product.id}
            product={product}
            isNew={newProductIds.has(product.id)}
          />
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="flex flex-col items-center gap-3 mt-12">
          <p className="text-xs text-gray-400 font-medium">
            {products.length} sur {totalCount} produits
          </p>
          {/* Progress bar */}
          <div className="w-48 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${(products.length / totalCount) * 100}%` }}
            />
          </div>
          <button
            onClick={loadMore}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-8 py-3 bg-white border-2 border-gray-200 hover:border-amber-300 text-gray-800 font-semibold rounded-full transition-all duration-300 hover:shadow-md hover:bg-amber-50 disabled:opacity-50 disabled:cursor-wait"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Chargement...
              </>
            ) : (
              <>
                Charger plus de produits
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>
        </div>
      )}

      {/* All loaded */}
      {!hasMore && products.length > 0 && totalCount > limit && (
        <div className="text-center mt-12">
          <p className="text-sm text-gray-400">
            Tous les {totalCount} produits sont affichés
          </p>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeInUp 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
