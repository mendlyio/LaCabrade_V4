import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { getProductPrice } from "@lib/util/get-product-price"
import { getProductsById } from "@lib/data/products"
import WishlistToggleButton from "@modules/common/components/wishlist-toggle-button"
import Image from "next/image"

export default async function ProductCardModern({
  product,
  region,
}: {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
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

  // Vérifier si en stock
  const isInStock = pricedProduct.variants?.some(v => (v.inventory_quantity || 0) > 0)

  // Obtenir la collection pour le badge
  const collection = pricedProduct.collection?.title

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

            {/* Bouton d'action */}
            <button className="p-2 rounded-full bg-amber-600 text-white hover:bg-amber-700 shadow-md hover:shadow-lg transform group-hover:scale-110 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </button>
          </div>

          {/* Stock indicator */}
          {isInStock && pricedProduct.variants?.[0]?.inventory_quantity && pricedProduct.variants[0].inventory_quantity < 5 && (
            <div className="mt-3 flex items-center gap-1 text-xs text-orange-600">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Plus que {pricedProduct.variants[0].inventory_quantity} en stock
            </div>
          )}
        </div>
      </div>
    </LocalizedClientLink>
  )
}



