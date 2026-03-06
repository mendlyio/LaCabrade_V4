import { HttpTypes } from "@medusajs/types"
import { getProductsList } from "@lib/data/products"
import ProductCardModern from "@modules/products/components/product-card-modern"
import ScrollCarousel from "@modules/common/components/scroll-carousel"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type RelatedProductsModernProps = {
  product: HttpTypes.StoreProduct
  countryCode: string
  region: HttpTypes.StoreRegion
}

export default async function RelatedProductsModern({
  product,
  countryCode,
  region,
}: RelatedProductsModernProps) {
  // Récupérer les produits liés (même collection ou même catégorie)
  const queryParams: any = {
    limit: 12,
    fields: "*variants.calculated_price,+variants.inventory_quantity,+variants.prices",
  }

  // Essayer d'abord par collection
  if (product.collection_id) {
    queryParams.collection_id = [product.collection_id]
  }

  const { response } = await getProductsList({
    queryParams,
    countryCode,
  })

  // Filtrer le produit actuel
  const relatedProducts = response.products.filter((p) => p.id !== product.id)

  if (relatedProducts.length === 0) {
    return null
  }

  return (
    <div>
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
          Articles similaires
        </h2>
        <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
          Découvrez notre sélection de produits complémentaires
        </p>
      </div>

      {/* Carrousel de produits similaires */}
      <ScrollCarousel className="px-4 md:px-0">
        <div className="flex gap-3 sm:gap-4">
          {relatedProducts.map((relatedProduct) => (
            <div key={relatedProduct.id} className="flex-shrink-0 w-[44vw] sm:w-[40vw] md:w-[240px] lg:w-[230px]">
              <ProductCardModern
                product={relatedProduct}
                region={region}
              />
            </div>
          ))}
        </div>
      </ScrollCarousel>

      {relatedProducts.length > 4 && (
        <div className="mt-10 text-center">
          <LocalizedClientLink
            href={product.collection ? `/collections/${product.collection.handle}` : '/store'}
            className="inline-flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 text-sm md:text-base"
          >
            <span>Voir plus de produits</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </LocalizedClientLink>
        </div>
      )}
    </div>
  )
}

