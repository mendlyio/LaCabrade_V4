import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { slugify } from "@lib/util/slugify"

type ProductInfoModernProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
}

export default function ProductInfoModern({ product, region }: ProductInfoModernProps) {
  // Détection Outlet (pour le badge)
  const categories = (product as any).categories || []
  const isOutlet = categories.some((cat: any) => cat.handle?.toLowerCase() === "outlet")

  // Extraire la marque depuis les métadonnées ou la collection
  const brand = product.metadata?.brand as string | undefined || product.collection?.title

  return (
    <div className="space-y-3">
      {/* 1. MARQUE */}
      {brand && (
        <LocalizedClientLink
          href={`/marques/${slugify(brand)}`}
          className="inline-flex items-center gap-2 text-sm text-amber-600 font-semibold uppercase tracking-wide hover:text-amber-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          {brand}
        </LocalizedClientLink>
      )}

      {/* Badge OUTLET */}
      {isOutlet && (
        <div className="inline-flex items-center gap-2 bg-[#c4707f] text-white px-4 py-1.5 rounded-full text-sm font-bold">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          OUTLET — 50% de réduction
        </div>
      )}

      {/* 2. TITRE PRODUIT */}
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
        {product.title}
      </h1>
    </div>
  )
}

