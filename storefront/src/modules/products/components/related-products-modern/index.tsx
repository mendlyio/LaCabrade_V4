import { HttpTypes } from "@medusajs/types"
import { getProductsList } from "@lib/data/products"
import { listCategories } from "@lib/data/categories"
import { unstable_cache } from "next/cache"
import ProductCardModern from "@modules/products/components/product-card-modern"
import ScrollCarousel from "@modules/common/components/scroll-carousel"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const LC_EQUESTRIAN_HANDLES = ["la-cabrade", "lc-equestrian", "lc_equestrian"]

// Cache 2h — les produits similaires ne changent pas souvent
const getCachedRelatedProducts = unstable_cache(
  async (categoryId: string, countryCode: string) => {
    const { response } = await getProductsList({
      queryParams: {
        limit: 12,
        fields:
          "*variants.calculated_price,+variants.inventory_quantity,+variants.prices,+images",
        category_id: [categoryId],
      } as any,
      countryCode,
    })
    return response.products
  },
  ["related-products-lc-equestrian"],
  { revalidate: 7200, tags: ["products"] }
)

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
  let categoryId: string | null = categoryIdProp ?? null
  let categoryName: string | null = null

  const allCategories = await listCategories().catch(() => [] as any[])

  if (!categoryId) {
    const lcCategory = allCategories?.find(
      (c: any) => LC_EQUESTRIAN_HANDLES.includes((c.handle ?? "").toLowerCase())
    )
    if (lcCategory) {
      categoryId = lcCategory.id
    }
  }

  if (categoryId) {
    categoryName = allCategories?.find((c: any) => c.id === categoryId)?.name ?? null
  }

  if (!categoryId) {
    return null
  }

  let products = await getCachedRelatedProducts(categoryId, countryCode)
  let relatedProducts = products.filter((p) => p.id !== product.id)

  // Si moins de 4 produits dans la catégorie courante, remonter au parent
  if (relatedProducts.length < 4) {
    const currentCat = allCategories?.find((c: any) => c.id === categoryId)
    const parentId = currentCat?.parent_category_id || currentCat?.parent_category?.id
    if (parentId) {
      const parentProducts = await getCachedRelatedProducts(parentId, countryCode)
      relatedProducts = parentProducts.filter((p) => p.id !== product.id)
      categoryName = allCategories?.find((c: any) => c.id === parentId)?.name ?? categoryName
    }
  }

  if (relatedProducts.length === 0) {
    return null
  }

  return (
    <div>
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
          {categoryName ? `Autres produits — ${categoryName}` : "Articles similaires"}
        </h2>
        <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
          Découvrez notre sélection de produits dans la même catégorie
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
                imageQuality={50}
              />
            </div>
          ))}
        </div>
      </ScrollCarousel>

      {relatedProducts.length > 4 && (
        <div className="mt-10 text-center">
          <LocalizedClientLink
            href={categoryId ? `/categories/${allCategories?.find((c: any) => c.id === categoryId)?.handle ?? ""}` : "/store"}
            className="inline-flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 text-sm md:text-base"
          >
            <span>Voir tous les produits{categoryName ? ` ${categoryName}` : ""}</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </LocalizedClientLink>
        </div>
      )}
    </div>
  )
}

