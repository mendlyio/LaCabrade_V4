import { Metadata } from "next"
import { notFound } from "next/navigation"

import Wrapper from "@modules/checkout/components/payment-wrapper"
import CheckoutForm from "@modules/checkout/templates/checkout-form"
import CheckoutSummary from "@modules/checkout/templates/checkout-summary"
import { enrichLineItems, retrieveCart } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { getCustomer } from "@lib/data/customer"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export const metadata: Metadata = {
  title: "Paiement | La Cabrade",
  description: "Finalisez votre commande en toute sécurité",
}

const fetchCart = async () => {
  const cart = await retrieveCart()
  if (!cart) {
    return notFound()
  }

  if (cart?.items?.length) {
    const enrichedItems = await enrichLineItems(cart?.items, cart?.region_id!)
    cart.items = enrichedItems as HttpTypes.StoreCartLineItem[]
  }

  return cart
}

export default async function Checkout({
  params,
}: {
  params: { countryCode: string }
}) {
  const cart = await fetchCart()
  const customer = await getCustomer()
  const countryCode = params.countryCode || "be"

  const itemCount = cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header compact */}
      <div className="bg-white border-b border-gray-200">
        <div className="content-container py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <LocalizedClientLink href="/cart" className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </LocalizedClientLink>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-gray-900">
                  Finalisation de commande
                </h1>
                <p className="text-[11px] sm:text-xs text-gray-500">
                  {itemCount} article{itemCount > 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-gray-500">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span className="hidden xs:inline">Paiement sécurisé</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="content-container py-4 sm:py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 sm:gap-6 lg:gap-8">
          {/* Colonne gauche : étapes */}
          <div className="min-w-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 sm:p-5 md:p-6">
                <Wrapper cart={cart}>
                  <CheckoutForm cart={cart} customer={customer} countryCode={countryCode} />
                </Wrapper>
              </div>
            </div>

            {/* Retour au panier */}
            <LocalizedClientLink
              href="/cart"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-amber-600 font-medium transition-colors mt-4"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Retour au panier
            </LocalizedClientLink>
          </div>

          {/* Colonne droite : résumé */}
          <div className="lg:sticky lg:top-4 h-fit space-y-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <CheckoutSummary cart={cart} customer={customer} />
            </div>

            {/* Trust badges */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold text-xs text-gray-900">Achat sécurisé</span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-gray-600">
                <li className="flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Cryptage SSL 256 bits
                </li>
                <li className="flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Données protégées
                </li>
                <li className="flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Visa, Mastercard, CB
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
