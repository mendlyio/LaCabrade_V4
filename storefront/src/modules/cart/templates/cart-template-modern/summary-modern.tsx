"use client"

import CartTotals from "@modules/common/components/cart-totals"
import DiscountCode from "@modules/checkout/components/discount-code"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"

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
      <div className="p-5 border-b border-gray-200 bg-gray-50">
        <h2 className="text-base font-bold text-gray-900">
          Récapitulatif
        </h2>
      </div>

      {/* Content */}
      <div className="p-5 space-y-5">
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
          <button className="w-full py-3.5 px-6 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-base transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 group">
            <span>Passer la commande</span>
            <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </LocalizedClientLink>

        {/* Info supplémentaire */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          <span>Paiement 100% sécurisé</span>
        </div>
      </div>
    </div>
  )
}

export default SummaryModern
