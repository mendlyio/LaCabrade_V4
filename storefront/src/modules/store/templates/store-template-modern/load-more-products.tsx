"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import WishlistToggleButton from "@modules/common/components/wishlist-toggle-button"
import ProductCardImages from "@modules/products/components/product-card-images"
import {
  ACTIVE_PROMO,
  applyPromoDiscount,
  isProductPromoEligible,
} from "@lib/config/active-promo"

const COLOR_OPTION_TITLES = ["couleur", "color", "colour", "coloris"]
const COLOR_MAP: Record<string, string> = {
  noir: "#1a1a1a", blanc: "#f5f5f5", gris: "#9ca3af", marine: "#1e3a5f",
  bleu: "#3b82f6", rouge: "#ef4444", rose: "#f472b6", vert: "#22c55e",
  marron: "#92400e", beige: "#d4b896", bordeaux: "#7f1d1d", violet: "#7c3aed",
  orange: "#f97316", jaune: "#eab308", camel: "#c4903a", anthracite: "#374151",
  turquoise: "#06b6d4", corail: "#fb7185", doré: "#d4af37", argenté: "#c0c0c0",
  black: "#1a1a1a", white: "#f5f5f5", gray: "#9ca3af", grey: "#9ca3af",
  blue: "#3b82f6", navy: "#1e3a5f", red: "#ef4444", pink: "#f472b6",
  green: "#22c55e", brown: "#92400e", purple: "#7c3aed", yellow: "#eab308",
  gold: "#d4af37", silver: "#c0c0c0", teal: "#0d9488",
}

const STORE_SCROLL_KEY = "store-scroll"

type LoadMoreProductsProps = {
  initialProducts: HttpTypes.StoreProduct[]
  totalCount: number
  limit: number
  countryCode: string
  regionId: string
  queryParams: Record<string, any>
  brandSlug?: string
  /** Quand fourni, pagination côté client (pas de fetch API) — utilisé avec filtres */
  allProducts?: HttpTypes.StoreProduct[]
}

const LC_EQUESTRIAN_HANDLES = ["la-cabrade", "lc-equestrian", "lc_equestrian"]

// Carte produit côté client (pas de fetch serveur)
function ProductCardClient({
  product,
  isNew,
  onProductClick,
}: {
  product: HttpTypes.StoreProduct
  isNew?: boolean
  onProductClick?: () => void
}) {
  // ── Trouver le variant le moins cher (calculated_price ou fallback variant.prices) ──
  // calculated_amount = euros ; variant.prices[0].amount = centimes
  const getVariantPriceInEuros = (v: any) => {
    const cp = v?.calculated_price?.calculated_amount ?? v?.calculated_price?.original_amount
    if (cp != null && Number.isFinite(cp)) return cp
    const p = v?.prices?.[0]?.amount
    if (p != null && Number.isFinite(p) && p > 0) return p / 100
    return Infinity
  }

  const allPricedVariants = (product.variants || [])
    .filter((v: any) => {
      const p = getVariantPriceInEuros(v)
      return p != null && p !== Infinity && Number.isFinite(p)
    }) as any[]

  const cheapestVariant = allPricedVariants.sort(
    (a, b) => getVariantPriceInEuros(a) - getVariantPriceInEuros(b)
  )[0]

  const price: number | undefined = cheapestVariant
    ? (cheapestVariant.calculated_price?.calculated_amount ?? cheapestVariant.calculated_price?.original_amount ?? (cheapestVariant.prices?.[0]?.amount != null ? cheapestVariant.prices[0].amount / 100 : undefined))
    : undefined
  const originalPrice: number | undefined = cheapestVariant?.calculated_price?.original_amount
  const currencyCode: string = (cheapestVariant?.calculated_price?.currency_code ?? cheapestVariant?.prices?.[0]?.currency_code ?? "eur").toLowerCase()

  // "Dès X€" si plusieurs prix différents parmi les variants
  const hasPriceRange =
    allPricedVariants.length > 1 &&
    price != null &&
    allPricedVariants.some((v) => Math.abs(getVariantPriceInEuros(v) - price) > 0.001)

  const hasDiscount = price != null && originalPrice != null && price < originalPrice
  const discountPct = hasDiscount
    ? Math.round(((originalPrice! - price!) / originalPrice!) * 100)
    : 0

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currencyCode,
    }).format(amount)

  const isInStock = product.variants?.some((v) => {
    if (!v.manage_inventory || v.allow_backorder) return true
    if (v.inventory_quantity === undefined || v.inventory_quantity === null) return true
    return (v.inventory_quantity ?? 0) > 0
  })

  const collection = product.collection?.title
  const images = (product.images || []).filter((img: any) => img?.url)
  const hoverImages = images.length > 1 ? images.slice(1, 5) : []
  const thumbUrl = product.thumbnail || images[0]?.url || null

  // Indicateur variantes / pastilles couleur
  const colorOption = ((product as any).options || []).find((opt: any) =>
    COLOR_OPTION_TITLES.includes((opt.title || "").toLowerCase())
  )
  const colorValues: string[] = colorOption
    ? (product.variants || [])
        .map((v: any) => v.options?.find((o: any) => o.option_id === colorOption.id)?.value)
        .filter(Boolean)
        .filter((val: any, idx: number, arr: any[]) => arr.indexOf(val) === idx)
    : []
  const hasColorSwatches = colorValues.length > 1
  const variantCount = (product.variants || []).length

  // Détection catégories
  const categories = (product as any).categories || []
  const isLcEquestrian = categories.some((cat: any) =>
    LC_EQUESTRIAN_HANDLES.includes(cat.handle?.toLowerCase())
  )
  const isOutlet = categories.some((cat: any) =>
    (cat.handle || "").toLowerCase().startsWith("outlet")
  )

  // Prix outlet : -50% affiché (la promotion OUTLET_50 gère le checkout)
  const outletOriginalNumber = isOutlet ? (price ?? 0) : 0
  const outletPriceNumber = isOutlet ? outletOriginalNumber * 0.5 : 0
  const outletPriceFormatted = isOutlet ? formatPrice(outletPriceNumber) : null
  const outletOriginalFormatted = isOutlet ? formatPrice(outletOriginalNumber) : null

  // Promo active (ex : Pâques) — affichage visuel prix barré
  const categoryHandles = categories.map((c: any) => c.handle || "")
  const isPromoEligible = isProductPromoEligible(categoryHandles, isOutlet)
  const promoPriceNumber = isPromoEligible ? applyPromoDiscount(price ?? 0) : 0
  const promoPriceFormatted = isPromoEligible ? formatPrice(promoPriceNumber) : null

  return (
    <LocalizedClientLink
      href={`/products/${product.handle}`}
      className="group block h-full"
      onClick={onProductClick}
    >
      <div
        className={`rounded-2xl overflow-hidden transition-all duration-300 border-2 h-full flex flex-col ${
          isLcEquestrian
            ? "bg-gradient-to-b from-amber-50/40 to-white border-amber-500 shadow-[0_0_20px_rgba(217,119,6,0.25)] hover:shadow-[0_0_30px_rgba(217,119,6,0.45)] hover:border-amber-400"
            : !isInStock
              ? "bg-white border-gray-200 opacity-75 hover:opacity-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]"
              : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]"
        } ${isNew ? "animate-fade-in" : ""}`}
      >
        {/* Image + badges */}
        <div className="relative">
          <ProductCardImages
            thumbUrl={thumbUrl}
            hoverImages={hoverImages}
            title={product.title || "Produit"}
            quality={70}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />

          {/* Badges haut gauche */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10 pointer-events-none">
            {isOutlet && (
              <div className="bg-[#c4707f] text-white px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wide shadow-sm flex items-center gap-1">
                <span>SALE</span>
                <span className="bg-white/20 px-1 rounded">-50%</span>
              </div>
            )}
            {isPromoEligible && (
              <div className="bg-amber-500 text-white px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-[11px] font-bold tracking-wide shadow-sm">
                -{ACTIVE_PROMO.discountPercent}% {ACTIVE_PROMO.label}
              </div>
            )}
            {!isOutlet && !isPromoEligible && hasDiscount && (
              <div className="bg-red-500 text-white px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-[11px] font-bold tracking-wide shadow-sm">
                -{discountPct}%
              </div>
            )}
          </div>

          {/* Badge LC Equestrian */}
          {isLcEquestrian && (
            <div className="absolute bottom-2.5 right-2.5 z-20 pointer-events-none">
              <div className="bg-amber-600 text-white px-2 py-1 rounded-lg text-[10px] font-bold tracking-wide shadow-md flex items-center gap-1 border border-amber-400">
                <span>★</span>
                <span>LC Equestrian</span>
              </div>
            </div>
          )}

          {/* Wishlist */}
          <div className="absolute top-2.5 right-2.5 z-10">
            <WishlistToggleButton productId={product.id!} size="md" />
          </div>

          {/* Indicateur variantes */}
          {variantCount > 1 && !isLcEquestrian && (
            <div className="absolute bottom-2.5 left-2.5 z-10 pointer-events-none">
              {hasColorSwatches ? (
                <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm px-1.5 py-1 rounded-lg shadow-sm">
                  {colorValues.slice(0, 5).map((colorName) => (
                    <span
                      key={colorName}
                      title={colorName}
                      style={{ backgroundColor: COLOR_MAP[colorName.toLowerCase()] || "#d1d5db" }}
                      className="w-3 h-3 rounded-full border border-white shadow-sm inline-block flex-shrink-0"
                    />
                  ))}
                  {colorValues.length > 5 && (
                    <span className="text-[9px] text-gray-500 ml-0.5">+{colorValues.length - 5}</span>
                  )}
                </div>
              ) : (
                <div className="bg-white/90 backdrop-blur-sm text-gray-600 px-2 py-1 rounded-lg text-[10px] font-medium shadow-sm">
                  Autres options
                </div>
              )}
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="p-3 sm:p-4 flex-1 flex flex-col gap-1">
          <h3 className={`font-semibold transition-colors text-[13px] sm:text-sm leading-snug line-clamp-2 flex-1 ${
            isLcEquestrian
              ? "text-gray-900 group-hover:text-amber-600"
              : "text-gray-900 group-hover:text-amber-600"
          }`}>
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
              {isOutlet ? (
                <>
                  <span className="text-[11px] text-gray-400 line-through leading-none">
                    {outletOriginalFormatted}
                  </span>
                  <span className="text-base sm:text-lg font-bold text-[#c4707f] leading-tight">
                    {outletPriceFormatted}
                  </span>
                </>
              ) : isPromoEligible ? (
                <>
                  <span className="text-[11px] text-gray-400 line-through leading-none">
                    {price != null ? formatPrice(price) : null}
                  </span>
                  <span className="text-base sm:text-lg font-bold text-amber-600 leading-tight">
                    {hasPriceRange && <span className="text-[10px] font-normal mr-0.5">Dès</span>}
                    {promoPriceFormatted}
                  </span>
                </>
              ) : hasDiscount ? (
                <>
                  <span className="text-[11px] text-gray-400 line-through leading-none">
                    {formatPrice(originalPrice!)}
                  </span>
                  <span className="text-base sm:text-lg font-bold text-red-600 leading-tight">
                    {hasPriceRange && <span className="text-[10px] font-normal mr-0.5">Dès</span>}
                    {formatPrice(price!)}
                  </span>
                </>
              ) : price != null ? (
                <span className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                  {hasPriceRange && <span className="text-[10px] font-normal mr-0.5 text-gray-500">Dès</span>}
                  {formatPrice(price)}
                </span>
              ) : (
                <span className="text-sm text-gray-500">Sur demande</span>
              )}
            </div>

            <span className={`w-8 h-8 rounded-full bg-gray-100 text-gray-400 group-hover:text-white flex items-center justify-center transition-all duration-300 flex-shrink-0 group-hover:shadow-md ${
              isLcEquestrian ? "group-hover:bg-amber-600" : "group-hover:bg-amber-600"
            }`}>
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
  allProducts,
}: LoadMoreProductsProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const search = searchParams?.toString() ?? ""

  // Mode pagination client : on a déjà tous les produits (filtres), on révèle par lots
  const isClientPagination = Boolean(allProducts && allProducts.length > 0)
  const [displayCount, setDisplayCount] = useState(limit)
  const [products, setProducts] = useState<HttpTypes.StoreProduct[]>(initialProducts)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newProductIds, setNewProductIds] = useState<Set<string>>(new Set())
  const scrollRestoredRef = useRef(false)
  /** Restauration mode API : on doit recharger les produits avant de scroller */
  const [pendingRestore, setPendingRestore] = useState<{ scrollY: number; targetPage: number } | null>(null)

  const sessionKey = `${STORE_SCROLL_KEY}-${pathname}-${search}`

  const saveScrollState = useCallback(() => {
    if (typeof window === "undefined") return
    try {
      const data = {
        scrollY: window.scrollY,
        displayCount,
        page,
        isClientPagination,
      }
      sessionStorage.setItem(sessionKey, JSON.stringify(data))
    } catch {
      // sessionStorage peut être indisponible (navigation privée, etc.)
    }
  }, [sessionKey, displayCount, page, isClientPagination])

  // Sauvegarde au scroll (debounced)
  useEffect(() => {
    if (typeof window === "undefined") return
    let timeout: ReturnType<typeof setTimeout>
    const handleScroll = () => {
      clearTimeout(timeout)
      timeout = setTimeout(saveScrollState, 300)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", handleScroll)
      clearTimeout(timeout)
    }
  }, [saveScrollState])

  // Restauration au retour arrière
  useEffect(() => {
    if (typeof window === "undefined" || scrollRestoredRef.current) return
    try {
      const raw = sessionStorage.getItem(sessionKey)
      if (!raw) return
      const data = JSON.parse(raw) as { scrollY?: number; displayCount?: number; page?: number; isClientPagination?: boolean }
      scrollRestoredRef.current = true

      if (data.isClientPagination && typeof data.displayCount === "number" && data.displayCount > limit) {
        setDisplayCount(Math.min(data.displayCount, allProducts?.length ?? data.displayCount))
      }

      const scrollY = typeof data.scrollY === "number" ? data.scrollY : 0

      // Mode API + Load More utilisé : recharger les produits avant de scroller
      if (!data.isClientPagination && typeof data.page === "number" && data.page > 1 && scrollY > 0) {
        setPendingRestore({ scrollY, targetPage: data.page })
        sessionStorage.removeItem(sessionKey)
        return
      }

      sessionStorage.removeItem(sessionKey)
      if (scrollY > 0) {
        const timer = setTimeout(() => window.scrollTo(0, scrollY), 50)
        return () => clearTimeout(timer)
      }
    } catch {
      // Ignorer les erreurs de parsing
    }
  }, [sessionKey, limit, allProducts?.length])

  // Restauration mode API : recharger les produits chargés via "Voir plus" puis scroller
  useEffect(() => {
    if (!pendingRestore || isClientPagination) return
    const { scrollY, targetPage } = pendingRestore

    const fetchRestoredProducts = async () => {
      const additionalLimit = (targetPage - 1) * limit
      const params = new URLSearchParams()
      params.set("limit", String(additionalLimit))
      params.set("offset", String(limit))
      params.set("region_id", regionId)
      params.set("fields", "*variants.calculated_price,+variants.inventory_quantity,+variants.prices,+images,+metadata,+collection.title,+collection.handle,+categories.handle,+categories.name,+categories.id")
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

      try {
        const res = await fetch(`/api/products/load-more?${params.toString()}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || "Erreur chargement")
        let newProducts = data.products || []
        if (brandSlug) {
          newProducts = newProducts.filter((product: any) => {
            const metadataBrand = product.metadata?.brand as string | undefined
            const collectionBrand = product.collection?.title
            const productBrand = metadataBrand || collectionBrand || ""
            return slugifyBrand(productBrand) === brandSlug
          })
        }
        setProducts((prev) => [...prev, ...newProducts])
        setPage(targetPage)
        // Délai pour laisser React rendre les nouveaux produits avant de scroller
        setTimeout(() => window.scrollTo(0, scrollY), 100)
      } catch (err) {
        console.error("Erreur restauration scroll:", err)
      } finally {
        setPendingRestore(null)
      }
    }

    fetchRestoredProducts()
  }, [pendingRestore, isClientPagination, limit, regionId, queryParams, brandSlug])

  const handleProductClick = useCallback(() => {
    saveScrollState()
  }, [saveScrollState])

  // Pas de useEffect : le key du parent force le remount quand les filtres changent.
  // Un reset sur initialProducts causait des pertes d'état (produits chargés effacés).

  const displayedProducts = isClientPagination
    ? (allProducts ?? []).slice(0, displayCount)
    : products
  const hasMore = isClientPagination
    ? displayCount < (allProducts?.length ?? 0)
    : products.length < totalCount

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return

    // Mode client : pas de fetch, on révèle les produits suivants
    if (isClientPagination) {
      setError(null)
      setNewProductIds(new Set((allProducts ?? []).slice(displayCount, displayCount + limit).map((p: any) => p.id)))
      setTimeout(() => setNewProductIds(new Set()), 1000)
      setDisplayCount((prev) => Math.min(prev + limit, allProducts?.length ?? prev))
      return
    }

    setError(null)
    setIsLoading(true)
    try {
      const nextPage = page + 1
      const params = new URLSearchParams()
      params.set("limit", String(limit))
      params.set("offset", String(page * limit))
      params.set("region_id", regionId)
      params.set("fields", "*variants.calculated_price,+variants.inventory_quantity,+variants.prices,+images,+metadata,+collection.title,+collection.handle,+categories.handle,+categories.name,+categories.id")

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

      // Proxy via API Next.js pour éviter CORS (client → même origine → backend)
      const res = await fetch(`/api/products/load-more?${params.toString()}`)

      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur chargement")

      let newProducts = data.products || []

      if (brandSlug) {
        newProducts = newProducts.filter((product: any) => {
          const metadataBrand = product.metadata?.brand as string | undefined
          const collectionBrand = product.collection?.title
          const productBrand = metadataBrand || collectionBrand || ""
          return slugifyBrand(productBrand) === brandSlug
        })
      }

      const newIds = new Set(newProducts.map((p: any) => p.id))
      setNewProductIds(newIds)
      setTimeout(() => setNewProductIds(new Set()), 1000)

      setProducts((prev) => [...prev, ...newProducts])
      setPage(nextPage)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Une erreur est survenue"
      setError(msg)
      console.error("Erreur chargement produits:", err)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, hasMore, page, limit, regionId, queryParams, isClientPagination, allProducts, displayCount])

  return (
    <div>
      {/* Products Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
        {displayedProducts.map((product) => (
          <ProductCardClient
            key={product.id}
            product={product}
            isNew={newProductIds.has(product.id)}
            onProductClick={handleProductClick}
          />
        ))}
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-xl text-center">
          <p className="text-sm text-red-700 mb-3">{error}</p>
          <button
            type="button"
            onClick={() => { setError(null); loadMore() }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Load More */}
      {hasMore && (
        <div className="flex flex-col items-center gap-3 mt-12">
          <p className="text-xs text-gray-400 font-medium">
            {displayedProducts.length} sur {totalCount} produits
          </p>
          {/* Progress bar */}
          <div className="w-48 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${(displayedProducts.length / totalCount) * 100}%` }}
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
      {!hasMore && displayedProducts.length > 0 && totalCount > limit && (
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
