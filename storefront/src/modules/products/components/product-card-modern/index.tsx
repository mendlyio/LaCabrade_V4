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

  const hasDiscount =
    variantPrice?.calculated_price &&
    variantPrice?.original_price &&
    variantPrice.calculated_price < variantPrice.original_price

  const discountPercentage = hasDiscount
    ? Math.round(
        ((variantPrice!.original_price! - variantPrice!.calculated_price!) /
          variantPrice!.original_price!) *
          100
      )
    : 0

  const variants = pricedProduct.variants || []
  const hasUnlimitedStock = variants.some(
    (v) => !v.manage_inventory || v.allow_backorder
  )
  const totalAvailable = variants.reduce((acc, v) => {
    if (!v.manage_inventory || v.allow_backorder) return acc
    return acc + (v.inventory_quantity || 0)
  }, 0)
  const isInStock = hasUnlimitedStock || totalAvailable > 0
  const isLowStock =
    !hasUnlimitedStock && totalAvailable > 0 && totalAvailable < 5

  const collection = pricedProduct.collection?.title

  // Images : 3ème image pour le hover
  const images = pricedProduct.images || []
  const hoverImage = images.length > 2 ? images[2]?.url : null

  const variantCount = variants.length

  // ─── COMPACT ───────────────────────────────────────────────
  if (variant === "compact") {
    return (
      <LocalizedClientLink
        href={`/products/${product.handle}`}
        className="group block"
        data-testid="product-card"
      >
        <div className="bg-white rounded-2xl border border-gray-100 hover:border-amber-200 shadow-sm hover:shadow-md transition-all duration-300 p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0">
            {product.thumbnail ? (
              <Image
                src={product.thumbnail}
                alt={product.title || "Produit"}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="80px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <svg
                  className="w-6 h-6 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
            )}
            {hasDiscount && (
              <div className="absolute top-1 left-1 bg-red-500 text-white px-1.5 py-0.5 rounded-md text-[9px] font-bold">
                -{discountPercentage}%
              </div>
            )}
            {!isInStock && (
              <div className="absolute inset-0 bg-gray-900/40 flex items-center justify-center">
                <span className="text-white text-[9px] font-bold uppercase">
                  Épuisé
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {collection && (
              <div className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5 truncate font-medium">
                {collection}
              </div>
            )}
            <h3 className="font-semibold text-gray-900 group-hover:text-amber-600 transition-colors text-sm leading-snug line-clamp-2">
              {product.title}
            </h3>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <div className="flex items-baseline gap-1.5">
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
                    {cheapestPrice?.calculated_price || "Sur demande"}
                  </span>
                )}
              </div>
              {isLowStock && (
                <span className="flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                  <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                  Stock faible
                </span>
              )}
            </div>
          </div>
        </div>
      </LocalizedClientLink>
    )
  }

  // ─── DEFAULT ───────────────────────────────────────────────
  return (
    <LocalizedClientLink
      href={`/products/${product.handle}`}
      className="group block h-full"
      data-testid="product-card"
    >
      <div
        className={`bg-white rounded-2xl overflow-hidden transition-all duration-300 border h-full flex flex-col hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] ${
          !isInStock
            ? "border-gray-200 opacity-75 hover:opacity-100"
            : "border-gray-100 hover:border-gray-200"
        }`}
      >
        {/* ── Image Container ── */}
        <div className="relative aspect-[4/5] overflow-hidden bg-gray-50">
          {/* Image principale */}
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
              <svg
                className="w-12 h-12 text-gray-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
          )}

          {/* 3ème image au hover : légère rotation + zoom */}
          {hoverImage && (
            <Image
              src={hoverImage}
              alt={`${product.title} - vue alternative`}
              fill
              className="object-cover absolute inset-0 opacity-0 scale-[1.08] rotate-[-1deg] group-hover:opacity-100 group-hover:scale-[1.03] group-hover:rotate-[1deg] transition-all duration-700 ease-out"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          )}

          {/* Overlay rupture */}
          {!isInStock && (
            <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-[1px] flex items-center justify-center z-10">
              <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                  Épuisé
                </span>
              </div>
            </div>
          )}

          {/* Badges haut gauche */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
            {hasDiscount && (
              <div className="bg-red-500 text-white px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-[11px] font-bold tracking-wide shadow-sm">
                -{discountPercentage}%
              </div>
            )}
            {pricedProduct.metadata?.new && (
              <div className="bg-emerald-500 text-white px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-[11px] font-bold tracking-wide shadow-sm">
                Nouveau
              </div>
            )}
            {isLowStock && (
              <div className="bg-amber-500 text-white px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-[11px] font-bold tracking-wide shadow-sm flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                Plus que {totalAvailable}
              </div>
            )}
          </div>

          {/* Collection badge */}
          {collection && (
            <div className="absolute bottom-2.5 left-2.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="bg-white/80 backdrop-blur-md text-gray-600 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider shadow-sm">
                {collection}
              </div>
            </div>
          )}

          {/* Wishlist - toujours visible */}
          <div className="absolute top-2.5 right-2.5 z-10">
            <WishlistToggleButton productId={product.id!} size="md" />
          </div>

          {/* Nombre de variantes */}
          {variantCount > 1 && (
            <div className="absolute bottom-2.5 left-2.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="bg-white/90 backdrop-blur-sm text-gray-700 px-2 py-1 rounded-lg text-[10px] font-medium shadow-sm">
                {variantCount} variantes
              </div>
            </div>
          )}
        </div>

        {/* ── Infos Produit ── */}
        <div className="p-3 sm:p-4 flex-1 flex flex-col gap-1">
          {/* Titre */}
          <h3 className="font-semibold text-gray-900 group-hover:text-amber-600 transition-colors text-[13px] sm:text-sm leading-snug line-clamp-2 flex-1">
            {product.title}
          </h3>

          {/* Stock indicator texte */}
          {isInStock && !isLowStock && (
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              En stock
            </div>
          )}
          {isLowStock && (
            <div className="flex items-center gap-1.5 text-[10px] text-amber-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Plus que {totalAvailable} en stock
            </div>
          )}
          {!isInStock && (
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
              Indisponible
            </div>
          )}

          {/* Prix + CTA */}
          <div className="flex items-end justify-between gap-2 mt-auto pt-1.5">
            <div className="flex flex-col">
              {hasDiscount ? (
                <>
                  <span className="text-[11px] text-gray-400 line-through leading-none">
                    {cheapestPrice?.original_price}
                  </span>
                  <span className="text-base sm:text-lg font-bold text-red-600 leading-tight">
                    {cheapestPrice?.calculated_price}
                  </span>
                  <span className="text-[10px] text-red-500 font-semibold mt-0.5">
                    Économisez {discountPercentage}%
                  </span>
                </>
              ) : (
                <span className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                  {cheapestPrice?.calculated_price || "Sur demande"}
                </span>
              )}
            </div>

            {/* Bouton flèche */}
            <span className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-amber-600 text-gray-400 group-hover:text-white flex items-center justify-center transition-all duration-300 flex-shrink-0 group-hover:shadow-md">
              <svg
                className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </LocalizedClientLink>
  )
}
