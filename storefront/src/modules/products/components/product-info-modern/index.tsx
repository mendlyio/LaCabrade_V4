import { HttpTypes } from "@medusajs/types"
import { getProductPrice } from "@lib/util/get-product-price"
import { convertToLocale } from "@lib/util/money"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { slugify } from "@lib/util/slugify"

type ProductInfoModernProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
}

export default function ProductInfoModern({ product, region }: ProductInfoModernProps) {
  const { cheapestPrice, variantPrice } = getProductPrice({
    product,
  })

  const hasDiscount = variantPrice?.calculated_price && variantPrice?.original_price && 
    variantPrice.calculated_price < variantPrice.original_price

  const discountPercentage = hasDiscount
    ? Math.round(((variantPrice!.original_price! - variantPrice!.calculated_price!) / variantPrice!.original_price!) * 100)
    : 0

  // Détection Outlet
  const categories = (product as any).categories || []
  const isOutlet = categories.some((cat: any) => cat.handle?.toLowerCase() === "outlet")

  // Prix outlet : -50% sur le prix affiché
  const outletOriginalNumber = cheapestPrice?.calculated_price_number ?? 0
  const outletPriceNumber = outletOriginalNumber * 0.5
  const currencyCode = cheapestPrice?.currency_code || "eur"
  const outletPriceFormatted = isOutlet
    ? convertToLocale({ amount: outletPriceNumber, currency_code: currencyCode })
    : null

  // Extraire la marque depuis les métadonnées ou la collection
  const brand = product.metadata?.brand as string | undefined || product.collection?.title

  return (
    <div className="space-y-4">
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

      {/* 3. PRIX */}
      <div className="py-3">
        {isOutlet ? (
          <div className="space-y-2">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl md:text-4xl font-bold text-[#c4707f]">
                {outletPriceFormatted}
              </span>
              <span className="text-xl md:text-2xl text-gray-400 line-through">
                {cheapestPrice?.calculated_price}
              </span>
            </div>
            <div className="inline-flex items-center gap-2 bg-[#c4707f]/10 text-[#c4707f] px-3 py-1.5 rounded-full text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6.207.293a1 1 0 00-1.414 0l-6.5 6.5a1 1 0 101.414 1.414l6.5-6.5a1 1 0 000-1.414zM12.5 10a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
              </svg>
              <span className="font-bold">Prix Outlet — économisez 50%</span>
            </div>
            <p className="text-xs text-gray-500">
              La remise de -50% est appliquée automatiquement dans votre panier.
            </p>
          </div>
        ) : hasDiscount ? (
          <div className="space-y-2">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl md:text-4xl font-bold text-red-600">
                {cheapestPrice?.calculated_price}
              </span>
              <span className="text-xl md:text-2xl text-gray-400 line-through">
                {cheapestPrice?.original_price}
              </span>
            </div>
            <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1.5 rounded-full text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
              </svg>
              <span className="font-bold">-{discountPercentage}%</span>
            </div>
          </div>
        ) : (
          <div className="text-3xl md:text-4xl font-bold text-gray-900">
            {cheapestPrice?.calculated_price || "Prix sur demande"}
          </div>
        )}
        
        <div className="mt-2 text-sm text-gray-500">
          TVA incluse • Frais de livraison calculés à l'étape suivante • Paiement 100% sécurisé
        </div>
      </div>
    </div>
  )
}

