import { HttpTypes } from "@medusajs/types"
import { getProductsList } from "@lib/data/products"
import ProductCardModern from "@modules/products/components/product-card-modern"

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
    limit: 8,
    fields: "*variants.calculated_price,+variants.inventory_quantity",
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
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Vous aimerez aussi
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Découvrez notre sélection de produits complémentaires
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {relatedProducts.slice(0, 4).map((relatedProduct) => (
          <div
            key={relatedProduct.id}
            className="group animate-fade-in"
          >
            <ProductCardModern
              product={relatedProduct}
              region={region}
            />
          </div>
        ))}
      </div>

      {relatedProducts.length > 4 && (
        <div className="mt-12 text-center">
          <a
            href={product.collection ? `/collections/${product.collection.handle}` : '/store'}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-700 hover:to-orange-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
          >
            <span>Voir plus de produits</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>
      )}
    </div>
  )
}

