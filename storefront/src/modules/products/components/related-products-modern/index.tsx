import { HttpTypes } from "@medusajs/types"
import { getProductsList } from "@lib/data/products"
import { listCategories } from "@lib/data/categories"
import ProductCardModern from "@modules/products/components/product-card-modern"
import ScrollCarousel from "@modules/common/components/scroll-carousel"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const LC_EQUESTRIAN_HANDLES = ["la-cabrade", "lc-equestrian", "lc_equestrian"]

type RelatedProductsModernProps = {
  product: HttpTypes.StoreProduct
  countryCode: string
  region: HttpTypes.StoreRegion
  categoryId?: string | null
}

export default async function RelatedProductsModern({
  product,
  countryCode,
  region,
  categoryId: categoryIdProp,
}: RelatedProductsModernProps) {
  // Si le categoryId est fourni par le parent, on évite l'appel listCategories
  let categoryId: string | null = categoryIdProp ?? null

  if (!categoryId) {
    try {
      const categories = await listCategories()
      const lcCategory = categories?.find(
        (c: any) => LC_EQUESTRIAN_HANDLES.includes((c.handle ?? "").toLowerCase())
      )
      if (lcCategory) {
        categoryId = lcCategory.id
      }
    } catch (error) {
      console.error("Erreur récupération catégorie LC Equestrian:", error)
    }
  }

  if (!categoryId) {
    return null
  }

  const queryParams: any = {
    limit: 12,
    fields:
      "*variants.calculated_price,+variants.inventory_quantity,+variants.prices,+images",
    category_id: [categoryId],
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
                imageSizes="(max-width: 640px) 44vw, (max-width: 1024px) 240px, 230px"
              />
            </div>
          ))}
        </div>
      </ScrollCarousel>

      {relatedProducts.length > 4 && (
        <div className="mt-10 text-center">
          <LocalizedClientLink
            href="/lc-equestrian"
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

