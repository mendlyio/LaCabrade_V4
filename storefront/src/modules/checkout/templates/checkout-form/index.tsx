import { listCartShippingMethods } from "@lib/data/fulfillment"
import { listCartPaymentMethods } from "@lib/data/payment"
import { getProductByHandle, getProductsList } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { isGiftCardOnlyCart } from "@lib/util/cart-amounts"
import { isVariantAvailable } from "@lib/util/product-stock"
import { HttpTypes } from "@medusajs/types"
import Addresses from "@modules/checkout/components/addresses"
import Payment from "@modules/checkout/components/payment"
import Review from "@modules/checkout/components/review"
import Shipping from "@modules/checkout/components/shipping"
import CheckoutUpsell from "@modules/checkout/components/checkout-upsell"
import CheckoutStepRouter from "@modules/checkout/components/checkout-step-router"

/** Détecte si une option de livraison est "Livraison numérique" (bon cadeau uniquement) */
function isDigitalShippingOption(opt: { name?: string | null; data?: Record<string, unknown> }): boolean {
  const name = (opt.name ?? "").toLowerCase()
  const mode = (opt.data as any)?.mode
  return name.includes("numérique") || name.includes("digital") || mode === "digital"
}

/** Produits fixes pour "Complétez votre commande" (étape 3 checkout) */
const CHECKOUT_UPSELL_HANDLES = [
  "73197-cure-pied-nala-lc-equestrian-odoo-23066",
  "filet-foin-kimi-lc-equestrian-odoo-22530",
  "licol-condor-lc-equestrian-odoo-22531",
  "cloches-caoutchouc-tania-lc-equestrian-odoo-22532",
  "cloches-caoutchouc-mouton-soraya-lc-equestrian-odoo-22534",
  "chaussettes-jolie-lc-equestrian-odoo-22648",
]

/** Produits fixes pour "Vérification et validation" (étape 5 checkout - Last chance) */
const LAST_CHANCE_HANDLES = [
  "care-brush-on-rose-and-green-tea-stubben-odoo-12639",
  "gants-grip-widow-lc-equestrian-odoo-22529",
  "chaussettes-thermo-willow-br-odoo-21618",
  "bonbons-pour-chevaux-sellerie-la-cabrade-odoo-20384",
  "74214-brosse-douce-exclusive-waldhausen-odoo-23273",
  "baume-de-warendorf-s-r-odoo-12709",
  "ponge-xl-qhp-odoo-21413",
]

function getFirstAvailableVariant(product: HttpTypes.StoreProduct) {
  return product.variants?.find((v) => isVariantAvailable(v)) ?? null
}

async function fetchUpsellProducts(
  cart: HttpTypes.StoreCart,
  countryCode: string
): Promise<[HttpTypes.StoreProduct[], HttpTypes.StoreProduct[]]> {
  try {
    const region = await getRegion(countryCode)
    if (!region) return [[], []]

    const safeGetProduct = async (handle: string) => {
      try {
        return await getProductByHandle(handle, region.id)
      } catch {
        return null
      }
    }

    const upsellRaw = await Promise.all(
      CHECKOUT_UPSELL_HANDLES.map(safeGetProduct)
    )
    let upsell = upsellRaw
      .filter((p): p is HttpTypes.StoreProduct => p != null)
      .filter((p) => {
        const variant = getFirstAvailableVariant(p) as any
        const price = variant?.calculated_price?.calculated_amount
        return price != null && price > 0
      })
    upsell = CHECKOUT_UPSELL_HANDLES
      .map((h) => upsell.find((p) => (p.handle || "").toLowerCase() === h.toLowerCase()))
      .filter((p): p is HttpTypes.StoreProduct => p != null)

    const cartProductIds = cart.items?.map((item) => item.product_id) || []
    upsell = upsell.filter((p) => !cartProductIds.includes(p.id))

    const lastChanceRaw = await Promise.all(
      LAST_CHANCE_HANDLES.map(safeGetProduct)
    )
    let lastChance = lastChanceRaw
      .filter((p): p is HttpTypes.StoreProduct => p != null)
      .filter((p) => {
        const variant = getFirstAvailableVariant(p) as any
        const price = variant?.calculated_price?.calculated_amount
        return price != null && price > 0
      })
    lastChance = LAST_CHANCE_HANDLES
      .map((h) => lastChance.find((p) => (p.handle || "").toLowerCase() === h.toLowerCase()))
      .filter((p): p is HttpTypes.StoreProduct => p != null)
    lastChance = lastChance.filter((p) => !cartProductIds.includes(p.id) && !upsell.some((u) => u.id === p.id))

    return [upsell, lastChance]
  } catch {
    return [[], []]
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

  // Livraison numérique : visible uniquement si panier = bon cadeau seul
  // Sinon : masquer Livraison numérique
  const giftCardOnly = isGiftCardOnlyCart(cart)
  const filteredShippingMethods = (shippingMethods ?? []).filter((opt) => {
    const isDigital = isDigitalShippingOption(opt)
    if (giftCardOnly) return isDigital
    return !isDigital
  })

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
        <Shipping cart={cart} availableShippingMethods={filteredShippingMethods} />
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
