import { HttpTypes } from "@medusajs/types"
import ProductPreview from "@modules/products/components/product-preview"
import ProductCarouselClient from "./client"

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
  itemsPerView = { mobile: 2, tablet: 3, desktop: 5 }
}: ProductCarouselProps) => {
  if (!products || products.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Aucun produit disponible pour le moment
      </div>
    )
  }

  return (
    <ProductCarouselClient itemsPerView={itemsPerView} totalProducts={products.length}>
      {products.map((product) => (
        <div key={product.id} className="flex-shrink-0">
          <ProductPreview
            region={region}
            product={product}
            isFeatured
          />
        </div>
      ))}
    </ProductCarouselClient>
  )
}

export default ProductCarousel

