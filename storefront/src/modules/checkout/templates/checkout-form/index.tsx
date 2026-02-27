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

  let shippingMethods: Awaited<ReturnType<typeof listCartShippingMethods>>
  let paymentMethods: Awaited<ReturnType<typeof listCartPaymentMethods>>
  let productSets: [HttpTypes.StoreProduct[], HttpTypes.StoreProduct[]]

  try {
    const regionId = cart.region?.id ?? ""
    const [ship, pay, prod] = await Promise.all([
      listCartShippingMethods(cart.id),
      regionId ? listCartPaymentMethods(regionId) : Promise.resolve(null),
      fetchUpsellProducts(cart, countryCode),
    ])
    shippingMethods = ship
    paymentMethods = pay
    productSets = prod as [HttpTypes.StoreProduct[], HttpTypes.StoreProduct[]]
  } catch (err) {
    console.error("[CheckoutForm] Erreur lors du chargement:", err)
    return (
      <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl">
        <p className="text-amber-800 font-medium">
          Impossible de charger les options de livraison. Vérifiez que votre adresse est complète et réessayez.
        </p>
        <p className="text-sm text-amber-700 mt-2">
          Si le problème persiste, contactez-nous ou videz votre panier et réessayez.
        </p>
      </div>
    )
  }

  if (!shippingMethods || !paymentMethods) {
    return (
      <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl">
        <p className="text-amber-800 font-medium">
          Les options de livraison ne sont pas disponibles pour votre panier.
        </p>
        <p className="text-sm text-amber-700 mt-2">
          Assurez-vous d&apos;avoir renseigné une adresse de livraison valide. Certains articles peuvent ne pas être livrables à votre adresse.
        </p>
      </div>
    )
  }

  const [upsellProducts, lastChanceProducts] = productSets

  return (
    <div className="w-full relative">
      {/* Auto-routage vers la bonne étape au chargement */}
      <CheckoutStepRouter cart={cart} />

      {/* Ligne de progression verticale */}
      <div className="absolute left-[19px] top-6 bottom-6 w-[2px] bg-gradient-to-b from-amber-200 via-gray-200 to-gray-100 hidden sm:block" />

      {/* Étape 1 : Adresse */}
      <div className="relative pb-8 mb-0">
        <Addresses cart={cart} customer={customer} />
        <div className="mx-4 sm:mx-0 sm:ml-[40px] mt-6 border-b-2 border-dashed border-gray-200" />
      </div>

      {/* Étape 2 : Livraison */}
      <div className="relative pb-8 mb-0">
        <Shipping cart={cart} availableShippingMethods={shippingMethods} />
        <div className="mx-4 sm:mx-0 sm:ml-[40px] mt-6 border-b-2 border-dashed border-gray-200" />
      </div>

      {/* Étape 3 : Complétez votre commande (upsell) */}
      <div className="relative pb-8 mb-0">
        <CheckoutUpsell
          products={upsellProducts || []}
          cartItems={cart.items}
          currencyCode={cart.currency_code}
          stepNumber={3}
        />
        <div className="mx-4 sm:mx-0 sm:ml-[40px] mt-6 border-b-2 border-dashed border-gray-200" />
      </div>

      {/* Étape 4 : Paiement */}
      <div className="relative pb-8 mb-0">
        <Payment cart={cart} availablePaymentMethods={paymentMethods} />
        <div className="mx-4 sm:mx-0 sm:ml-[40px] mt-6 border-b-2 border-dashed border-gray-200" />
      </div>

      {/* Étape 5 : Vérification et validation */}
      <div className="relative pb-2">
        <Review cart={cart} lastChanceProducts={lastChanceProducts || []} />
      </div>
    </div>
  )
}
