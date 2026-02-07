"use client"

import CartTotals from "@modules/common/components/cart-totals"
import DiscountCode from "@modules/checkout/components/discount-code"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import ArrowRight from "@medusajs/icons/dist/esm/arrow-right"

type SummaryProps = {
  cart: HttpTypes.StoreCart & {
    promotions: HttpTypes.StorePromotion[]
  }
  customer?: HttpTypes.StoreCustomer | null
}

function getCheckoutStep(cart: HttpTypes.StoreCart) {
  if (!cart?.shipping_address?.address_1 || !cart.email) {
    return "address"
  } else if (cart?.shipping_methods?.length === 0) {
    return "delivery"
  } else {
    return "payment"
  }
}

const SummaryModern = ({ cart, customer }: SummaryProps) => {
  const step = getCheckoutStep(cart)

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="p-6 bg-amber-600 border-b border-gray-200">
        <h2 className="text-xl font-bold text-white">
          Récapitulatif
        </h2>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Code Promo */}
        <div>
          <DiscountCode cart={cart} customer={customer} />
        </div>

        <div className="border-t border-gray-200 pt-4">
          <CartTotals totals={cart} />
        </div>

        {/* Checkout Button */}
        <LocalizedClientLink
          href={"/checkout?step=" + step}
          data-testid="checkout-button"
          className="block"
        >
          <button className="w-full py-4 px-6 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-3 group">
            <span>Passer la commande</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </LocalizedClientLink>

        {/* Info supplémentaire */}
        <div className="text-center text-xs text-gray-500 space-y-2">
          <p className="flex items-center justify-center gap-1">
            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span>Paiement 100% sécurisé</span>
          </p>
          <p>Vos données sont protégées</p>
        </div>
      </div>
    </div>
  )
}

export default SummaryModern

