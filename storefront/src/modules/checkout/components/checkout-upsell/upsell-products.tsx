import { getProductsList } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { HttpTypes } from "@medusajs/types"
import CheckoutUpsell from "./index"

type UpsellProductsProps = {
  cart: HttpTypes.StoreCart
  countryCode: string
}

export default async function UpsellProducts({ cart, countryCode }: UpsellProductsProps) {
  try {
    const region = await getRegion(countryCode)
    if (!region) return null

    // Récupérer des produits triés par prix croissant (les moins chers)
    const result = await getProductsList({
      pageParam: 1,
      queryParams: {
        limit: 12,
        region_id: region.id,
        fields: "*variants.calculated_price,+variants.inventory_quantity",
        order: "created_at",
      },
      countryCode,
    })

    const products = result?.response?.products || []
    
    // Filtrer : exclure les produits déjà dans le panier et trier par prix
    const cartProductIds = cart.items?.map(item => item.product_id) || []
    const available = products
      .filter(p => !cartProductIds.includes(p.id))
      .filter(p => {
        const variant = p.variants?.[0] as any
        const price = variant?.calculated_price?.calculated_amount
        return price != null && price > 0
      })
      .sort((a, b) => {
        const priceA = (a.variants?.[0] as any)?.calculated_price?.calculated_amount || 0
        const priceB = (b.variants?.[0] as any)?.calculated_price?.calculated_amount || 0
        return priceA - priceB
      })
      .slice(0, 8)

    if (available.length === 0) return null

    return (
      <CheckoutUpsell
        products={available}
        cartItems={cart.items}
        currencyCode={cart.currency_code}
      />
    )
  } catch (error) {
    console.error("Erreur chargement upsell:", error)
    return null
  }
}
