import { getProductPrice } from "@lib/util/get-product-price"
import { getProductStockInfo } from "@lib/util/product-stock"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../thumbnail"
import PreviewPrice from "./price"
import { getProductsById } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"
import WishlistToggleButton from "@modules/common/components/wishlist-toggle-button"
import Image from "next/image"

export default async function ProductPreview({
  product,
  isFeatured,
  region,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  region: HttpTypes.StoreRegion
}) {
  const [pricedProduct] = await getProductsById({
    ids: [product.id!],
    regionId: region.id,
  })

  if (!pricedProduct) {
    return null
  }

  const { cheapestPrice } = getProductPrice({
    product: pricedProduct,
  })

  // Vérifier si en stock (fallback: inventory_quantity null/undefined → supposer en stock)
  const { isInStock } = getProductStockInfo(pricedProduct.variants)

  // Vérifier les metadata pour les pastilles NEW et PROMO
  const isNew = product.metadata?.is_new === true || product.metadata?.is_new === "true"
  const newUntil = product.metadata?.new_until ? new Date(product.metadata.new_until as string).getTime() : null
  const showNewBadge = isNew && (!newUntil || Date.now() < newUntil)
  const isPromo = product.metadata?.is_promo === true || product.metadata?.is_promo === "true"

  return (
    <LocalizedClientLink 
      href={`/products/${product.handle}`} 
      className="group block h-full"
      data-testid="product-wrapper"
    >
      <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-amber-300 h-full flex flex-col">
        {/* Image Container - Carré */}
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br bg-gray-50">
          {product.thumbnail ? (
            <Image
              src={product.thumbnail}
              alt={product.title || "Produit"}
              fill
              loading="eager"
              className="object-cover group-hover:scale-110 transition-transform duration-500"
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-6xl opacity-20">🏇</div>
            </div>
          )}

          {/* Badge rupture de stock */}
          {!isInStock && (
            <div className="absolute top-3 left-3">
              <div className="bg-gray-800 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                Rupture
              </div>
            </div>
          )}

          {/* Pastilles NEW et PROMO - Top Right */}
          <div className="absolute top-3 right-3 flex flex-col gap-2">
            {showNewBadge && (
              <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg uppercase tracking-wide">
                New
              </div>
            )}
            {isPromo && (
              <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg uppercase tracking-wide">
                Promo
              </div>
            )}
          </div>

          {/* Wishlist Button - Visible au hover */}
          <div className="absolute bottom-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <WishlistToggleButton productId={product.id!} size="md" />
          </div>

          {/* Quick View Overlay - Visible au hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <span className="inline-flex items-center gap-2 text-white text-sm font-semibold">
                Voir détails
                <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </div>
        </div>

        {/* Informations Produit */}
        <div className="p-4 flex-1 flex flex-col">
          {/* Marque (collection) */}
          {product.collection?.title && (
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              {product.collection.title}
            </div>
          )}

          {/* Titre */}
          <h3 
            className="font-semibold text-gray-900 group-hover:text-amber-600 transition-colors mb-2 line-clamp-2 flex-1"
            data-testid="product-title"
          >
            {product.title}
          </h3>

          {/* Prix */}
          <div className="flex items-center justify-between mt-auto">
            <div className="text-lg font-bold text-amber-600">
              {cheapestPrice && <PreviewPrice price={cheapestPrice} />}
            </div>
          </div>
        </div>
      </div>
    </LocalizedClientLink>
  )
}
