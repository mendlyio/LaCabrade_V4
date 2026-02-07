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
  const vatNumber = (cart.metadata as any)?.vat_number || null
  const customerCountry = cart.shipping_address?.country_code?.toLowerCase()
  const isIntraCommunityExempt = !!(vatNumber && customerCountry && customerCountry !== "be")

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
          Récapitulatif
        </h2>
      </div>

      <div className="p-6 space-y-5">
        {/* Bandeau TVA intracommunautaire */}
        {vatNumber && (
          <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
            isIntraCommunityExempt
              ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
              : "bg-blue-50 border border-blue-200 text-blue-700"
          }`}>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <div>
              <span className="font-semibold">TVA : {vatNumber}</span>
              {isIntraCommunityExempt && (
                <span className="block text-[10px] opacity-80">Exonération intracommunautaire appliquée</span>
              )}
            </div>
          </div>
        )}

        {/* Code Promo */}
        <DiscountCode cart={cart} customer={customer} />

        {/* Séparateur */}
        <div className="border-t border-gray-100" />

        {/* Totaux */}
        <CartTotals totals={cart} />

        {/* Bouton checkout */}
        <LocalizedClientLink
          href={"/checkout?step=" + step}
          data-testid="checkout-button"
          className="block"
        >
          <button className="w-full py-3.5 px-6 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-sm transition-all duration-200 shadow-sm hover:shadow-md">
            Passer la commande
          </button>
        </LocalizedClientLink>

        {/* Sécurité */}
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          Paiement 100% sécurisé
        </p>
      </div>
    </div>
  )
}

export default SummaryModern
