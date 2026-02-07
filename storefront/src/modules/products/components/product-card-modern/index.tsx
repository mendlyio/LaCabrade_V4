import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { getProductPrice } from "@lib/util/get-product-price"
import { getProductsById } from "@lib/data/products"
import WishlistToggleButton from "@modules/common/components/wishlist-toggle-button"
import Image from "next/image"

export default async function ProductCardModern({
  product,
  region,
  variant = "default",
}: {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  variant?: "default" | "compact"
}) {
  const [pricedProduct] = await getProductsById({
    ids: [product.id!],
    regionId: region.id,
  })

  if (!pricedProduct) {
    return null
  }

  const { cheapestPrice, variantPrice } = getProductPrice({
    product: pricedProduct,
  })

  // Calculer le pourcentage de réduction si applicable
  const hasDiscount = variantPrice?.calculated_price && variantPrice?.original_price && 
    variantPrice.calculated_price < variantPrice.original_price

  const discountPercentage = hasDiscount
    ? Math.round(((variantPrice!.original_price! - variantPrice!.calculated_price!) / variantPrice!.original_price!) * 100)
    : 0

  const variants = pricedProduct.variants || []
  const hasUnlimitedStock = variants.some(
    (variant) => !variant.manage_inventory || variant.allow_backorder
  )
  const totalAvailable = variants.reduce((acc, variant) => {
    if (!variant.manage_inventory || variant.allow_backorder) {
      return acc
    }
    return acc + (variant.inventory_quantity || 0)
  }, 0)
  const isInStock = hasUnlimitedStock || totalAvailable > 0
  const isLowStock = !hasUnlimitedStock && totalAvailable > 0 && totalAvailable < 5

  // Obtenir la collection pour le badge
  const collection = pricedProduct.collection?.title

  if (variant === "compact") {
    return (
      <LocalizedClientLink
        href={`/products/${product.handle}`}
        className="group block"
        data-testid="product-card"
      >
        <div className="bg-white rounded-2xl border border-gray-100 hover:border-amber-300 shadow-sm hover:shadow-lg transition-all duration-300 p-4 flex items-center gap-4">
          {/* Image compacte */}
          <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0">
            {product.thumbnail ? (
              <Image
                src={product.thumbnail}
                alt={product.title || "Produit"}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="96px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-2xl opacity-20">🏇</div>
              </div>
            )}
            {hasDiscount && (
              <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow">
                -{discountPercentage}%
              </div>
            )}
          </div>

          {/* Infos compactes */}
          <div className="flex-1 min-w-0">
            {collection && (
              <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-1 truncate">
                {collection}
              </div>
            )}
            <h3 className="font-semibold text-gray-900 group-hover:text-amber-600 transition-colors text-sm md:text-base line-clamp-2">
              {product.title}
            </h3>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="flex flex-col">
                {hasDiscount ? (
                  <>
                    <span className="text-sm font-bold text-red-600">
                      {cheapestPrice?.calculated_price}
                    </span>
                    <span className="text-xs text-gray-400 line-through">
                      {cheapestPrice?.original_price}
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-bold text-gray-900">
                    {cheapestPrice?.calculated_price || "Prix sur demande"}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                Voir →
              </span>
            </div>
          </div>
        </div>
      </LocalizedClientLink>
    )
  }

  return (
    <LocalizedClientLink
      href={`/products/${product.handle}`}
      className="group block"
      data-testid="product-card"
    >
      <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-amber-300 h-full flex flex-col">
        {/* Image Container - Carré */}
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br bg-gray-50">
          {product.thumbnail ? (
            <Image
              src={product.thumbnail}
              alt={product.title || "Produit"}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-6xl opacity-20">🏇</div>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {hasDiscount && (
              <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-pulse">
                -{discountPercentage}%
              </div>
            )}
            {!isInStock && (
              <div className="bg-gray-800 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                Rupture
              </div>
            )}
            {pricedProduct.metadata?.new && (
              <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                Nouveau
              </div>
            )}
          </div>

          {/* Wishlist Button */}
          <div className="absolute bottom-3 right-3 z-10">
            <WishlistToggleButton productId={product.id!} size="md" />
          </div>

          {/* Collection Badge */}
          {collection && (
            <div className="absolute top-3 right-3">
              <div className="bg-white/90 backdrop-blur-sm text-gray-700 px-3 py-1 rounded-full text-xs font-medium shadow-md">
                {collection}
              </div>
            </div>
          )}

          {/* Quick View Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <span className="inline-flex items-center gap-2 text-white text-sm font-semibold">
                Voir le produit
                <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </div>
        </div>

        {/* Informations Produit */}
        <div className="p-4 flex-1 flex flex-col">
          {/* Titre */}
          <h3 className="font-semibold text-gray-900 group-hover:text-amber-600 transition-colors mb-2 line-clamp-2 flex-1">
            {product.title}
          </h3>

          {/* Description courte si disponible */}
          {product.description && (
            <p className="text-xs text-gray-500 line-clamp-1 mb-3">
              {product.description}
            </p>
          )}

          {/* Prix */}
          <div className="flex items-center justify-between mt-auto">
            <div className="flex flex-col">
              {hasDiscount ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-red-600">
                      {cheapestPrice?.calculated_price}
                    </span>
                    <span className="text-sm text-gray-400 line-through">
                      {cheapestPrice?.original_price}
                    </span>
                  </div>
                  <span className="text-xs text-red-600 font-medium">
                    Économisez {discountPercentage}%
                  </span>
                </>
              ) : (
                <span className="text-lg font-bold text-gray-900">
                  {cheapestPrice?.calculated_price || "Prix sur demande"}
                </span>
              )}
            </div>

            {/* Flèche vers le produit */}
            <span className="p-2 rounded-full bg-amber-600 text-white group-hover:bg-amber-700 shadow-md transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>

          {/* Stock indicator */}
          {isLowStock && (
            <div className="mt-3 flex items-center gap-1 text-xs text-orange-600">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Plus que {totalAvailable} en stock
            </div>
          )}
        </div>
      </div>
    </LocalizedClientLink>
  )
}



