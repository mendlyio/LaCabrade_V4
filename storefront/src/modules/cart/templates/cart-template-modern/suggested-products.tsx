import { getRegion } from "@lib/data/regions"
import { getProductsList } from "@lib/data/products"
import ProductCardModern from "@modules/products/components/product-card-modern"
import { HttpTypes } from "@medusajs/types"
import Sparkles from "@medusajs/icons/dist/esm/sparkles"

type SuggestedProductsProps = {
  cart: HttpTypes.StoreCart
  countryCode: string
}

export default async function SuggestedProducts({ cart, countryCode }: SuggestedProductsProps) {
  let suggestedProducts: HttpTypes.StoreProduct[] = []
  let region: HttpTypes.StoreRegion | null = null

  try {
    region = await getRegion(countryCode)

    if (!region) {
      return null
    }

    const result = await getProductsList({
      pageParam: 1,
      queryParams: {
        limit: 4,
        region_id: region.id,
        fields: "*variants.calculated_price,+variants.inventory_quantity",
        order: "-created_at",
      },
      countryCode,
    })

    const products = result?.response?.products || []
    const cartProductIds = cart.items?.map(item => item.product_id) || []
    suggestedProducts = products.filter(p => !cartProductIds.includes(p.id))
  } catch (error) {
    console.error("Erreur lors du chargement des produits suggérés:", error)
    return null
  }

  if (suggestedProducts.length === 0 || !region) {
    return null
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-pink-50 rounded-full flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Vous aimerez aussi
          </h2>
          <p className="text-sm text-gray-600">
            Complétez votre commande avec ces articles
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {suggestedProducts.map((product) => (
          <ProductCardModern
            key={product.id}
            product={product}
            region={region!}
          />
        ))}
      </div>
    </div>
  )
}

