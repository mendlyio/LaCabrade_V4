import { HttpTypes } from "@medusajs/types"
import ProductPreview from "@modules/products/components/product-preview"

type ProductCarouselProps = {
  products: HttpTypes.StoreProduct[]
  region: HttpTypes.StoreRegion
  itemsPerView?: {
    mobile: number
    tablet: number
    desktop: number
  }
}

const ProductCarousel = ({
  products,
  region,
}: ProductCarouselProps) => {
  if (!products || products.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Aucun produit disponible pour le moment
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Carrousel horizontal scrollable */}
      <div className="overflow-x-auto overflow-y-hidden scrollbar-hide -mx-4 px-4">
        <div className="flex gap-4 pb-4">
          {products.map((product) => (
            <div 
              key={product.id} 
              className="flex-none w-[calc(50%-8px)] sm:w-[calc(33.333%-11px)] lg:w-[calc(20%-13px)]"
            >
              <ProductPreview
                region={region}
                product={product}
                isFeatured
              />
            </div>
          ))}
        </div>
      </div>

      {/* Indicateur de scroll */}
      <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white to-transparent pointer-events-none" />
    </div>
  )
}

export default ProductCarousel
