import { listCartShippingMethods } from "@lib/data/fulfillment"
import { listCartPaymentMethods } from "@lib/data/payment"
import { getProductsList } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { HttpTypes } from "@medusajs/types"
import Addresses from "@modules/checkout/components/addresses"
import Payment from "@modules/checkout/components/payment"
import Review from "@modules/checkout/components/review"
import Shipping from "@modules/checkout/components/shipping"

async function fetchLastChanceProducts(
  cart: HttpTypes.StoreCart,
  countryCode: string
): Promise<HttpTypes.StoreProduct[]> {
  try {
    const region = await getRegion(countryCode)
    if (!region) return []

    const result = await getProductsList({
      pageParam: 1,
      queryParams: {
        limit: 20,
        region_id: region.id,
        fields: "*variants.calculated_price,+variants.inventory_quantity",
      },
      countryCode,
    })

    const products = result?.response?.products || []
    const cartProductIds = cart.items?.map((item) => item.product_id) || []

    return products
      .filter((p) => !cartProductIds.includes(p.id))
      .filter((p) => {
        const variant = p.variants?.[0] as any
        const price = variant?.calculated_price?.calculated_amount
        return price != null && price > 0
      })
      .sort((a, b) => {
        const priceA = (a.variants?.[0] as any)?.calculated_price?.calculated_amount || 0
        const priceB = (b.variants?.[0] as any)?.calculated_price?.calculated_amount || 0
        return priceA - priceB
      })
      .slice(0, 10)
      .sort(() => Math.random() - 0.5)
      .slice(0, 6)
  } catch {
    return []
  }
}

export default async function CheckoutForm({
  cart,
  customer,
  countryCode,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
  countryCode: string
}) {
  if (!cart) {
    return null
  }

  const [shippingMethods, paymentMethods, lastChanceProducts] = await Promise.all([
    listCartShippingMethods(cart.id),
    listCartPaymentMethods(cart.region?.id ?? ""),
    fetchLastChanceProducts(cart, countryCode),
  ])

  if (!shippingMethods || !paymentMethods) {
    return null
  }

  return (
    <div className="w-full space-y-2">
      <Addresses cart={cart} customer={customer} />
      <Shipping cart={cart} availableShippingMethods={shippingMethods} />
      <Payment cart={cart} availablePaymentMethods={paymentMethods} />
      <Review cart={cart} lastChanceProducts={lastChanceProducts} />
    </div>
  )
}
