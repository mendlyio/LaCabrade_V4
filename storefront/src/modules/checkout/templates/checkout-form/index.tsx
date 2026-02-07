import { listCartShippingMethods } from "@lib/data/fulfillment"
import { listCartPaymentMethods } from "@lib/data/payment"
import { getProductsList } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { HttpTypes } from "@medusajs/types"
import Addresses from "@modules/checkout/components/addresses"
import Payment from "@modules/checkout/components/payment"
import Review from "@modules/checkout/components/review"
import Shipping from "@modules/checkout/components/shipping"
import CheckoutUpsell from "@modules/checkout/components/checkout-upsell"
import CheckoutStepRouter from "@modules/checkout/components/checkout-step-router"

async function fetchUpsellProducts(
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

    const filtered = products
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

    // Upsell "complétez votre commande" = les 8 moins chers
    const upsell = filtered.slice(0, 8)
    // Last chance = 6 aléatoires parmi les 10 suivants (pour varier)
    const lastChance = filtered.slice(0, 12).sort(() => Math.random() - 0.5).slice(0, 6)

    return [upsell, lastChance] as any
  } catch {
    return [[], []] as any
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

  const [shippingMethods, paymentMethods, productSets] = await Promise.all([
    listCartShippingMethods(cart.id),
    listCartPaymentMethods(cart.region?.id ?? ""),
    fetchUpsellProducts(cart, countryCode),
  ])

  if (!shippingMethods || !paymentMethods) {
    return null
  }

  const [upsellProducts, lastChanceProducts] = productSets as any as [HttpTypes.StoreProduct[], HttpTypes.StoreProduct[]]

  return (
    <div className="w-full">
      {/* Auto-routage vers la bonne étape au chargement */}
      <CheckoutStepRouter cart={cart} />

      {/* Étape 1 : Adresse */}
      <div className="border-b border-gray-100 pb-2 mb-2">
        <Addresses cart={cart} customer={customer} />
      </div>

      {/* Étape 2 : Livraison */}
      <div className="border-b border-gray-100 pb-2 mb-2">
        <Shipping cart={cart} availableShippingMethods={shippingMethods} />
      </div>

      {/* Étape 3 : Complétez votre commande (upsell) */}
      <div className="border-b border-gray-100 pb-2 mb-2">
        <CheckoutUpsell
          products={upsellProducts || []}
          cartItems={cart.items}
          currencyCode={cart.currency_code}
          stepNumber={3}
        />
      </div>

      {/* Étape 4 : Paiement */}
      <div className="border-b border-gray-100 pb-2 mb-2">
        <Payment cart={cart} availablePaymentMethods={paymentMethods} />
      </div>

      {/* Étape 5 : Vérification et validation */}
      <div>
        <Review cart={cart} lastChanceProducts={lastChanceProducts || []} />
      </div>
    </div>
  )
}
