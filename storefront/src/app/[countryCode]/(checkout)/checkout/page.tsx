import { Metadata } from "next"
import { notFound } from "next/navigation"

import Wrapper from "@modules/checkout/components/payment-wrapper"
import CheckoutForm from "@modules/checkout/templates/checkout-form"
import CheckoutSummary from "@modules/checkout/templates/checkout-summary"
import { enrichLineItems, retrieveCart } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { getCustomer } from "@lib/data/customer"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CreditCard from "@medusajs/icons/dist/esm/credit-card"
import ShieldCheck from "@medusajs/icons/dist/esm/shield-check"
import LockClosedSolid from "@medusajs/icons/dist/esm/lock-closed-solid"

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

export default async function Checkout() {
  const cart = await fetchCart()
  const customer = await getCustomer()

  const itemCount = cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <div className="bg-[#ac2948] text-white">
        <div className="content-container py-6 sm:py-8 md:py-12">
          <div className="max-w-3xl">
            <div className="inline-block bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full mb-3 sm:mb-4">
              <span className="text-xs sm:text-sm font-semibold flex items-center gap-2">
                <CreditCard className="w-3 h-3 sm:w-4 sm:h-4" />
                Paiement Sécurisé
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2">
              Finalisation de votre commande
            </h1>
            <p className="text-white/90 mb-3 sm:mb-4 text-sm sm:text-base">
              {itemCount > 0 
                ? `${itemCount} article${itemCount > 1 ? 's' : ''} • Dernière étape avant de recevoir votre commande`
                : "Complétez vos informations pour finaliser votre achat"}
            </p>
            
            {/* Étapes de checkout */}
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
              <div className="flex items-center gap-1.5 sm:gap-2 bg-white/10 backdrop-blur-sm px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg">
                <LockClosedSolid className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">SSL Sécurisé</span>
                <span className="xs:hidden">SSL</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 bg-white/10 backdrop-blur-sm px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg">
                <ShieldCheck className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Données protégées</span>
                <span className="xs:hidden">Protégé</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 bg-white/10 backdrop-blur-sm px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg">
                <span>🚚</span>
                <span className="hidden xs:inline">Livraison rapide</span>
                <span className="xs:hidden">Rapide</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumb - masqué sur très petit écran */}
      <div className="hidden sm:block bg-white border-b border-gray-200">
        <div className="content-container py-3 sm:py-4">
          <nav className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
            <LocalizedClientLink href="/" className="hover:text-amber-600 transition-colors">
              Accueil
            </LocalizedClientLink>
            <span>/</span>
            <LocalizedClientLink href="/cart" className="hover:text-amber-600 transition-colors">
              Panier
            </LocalizedClientLink>
            <span>/</span>
            <span className="text-gray-900 font-medium">Paiement</span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="content-container py-6 sm:py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 sm:gap-8">
          {/* Formulaire de checkout */}
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* En-tête du formulaire */}
              <div className="bg-pink-50 border-b border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-7 h-7 sm:w-8 sm:h-8 bg-amber-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    1
                  </span>
                  Informations de commande
                </h2>
              </div>

              <div className="p-4 sm:p-6 md:p-8">
            <Wrapper cart={cart}>
              <CheckoutForm cart={cart} customer={customer} />
            </Wrapper>
              </div>
            </div>

            {/* Retour au panier */}
            <LocalizedClientLink
              href="/cart"
              className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base text-amber-600 hover:text-amber-700 font-medium transition-colors"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Retour au panier</span>
            </LocalizedClientLink>
          </div>

          {/* Résumé de la commande */}
          <div className="lg:sticky lg:top-24 h-fit space-y-4 sm:space-y-6">
            <div className="bg-white rounded-lg sm:rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <CheckoutSummary cart={cart} customer={customer} />
            </div>

            {/* Trust badges */}
            <div className="bg-pink-50 rounded-xl p-6 border border-amber-200">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                Paiement 100% sécurisé
              </h3>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  </div>
                  <span>Cryptage SSL 256 bits</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  </div>
                  <span>Vos données ne sont jamais stockées</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  </div>
                  <span>Conforme PCI-DSS</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span>Paiement en toute confiance</span>
                </li>
              </ul>
            </div>

            {/* Moyens de paiement acceptés */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h4 className="font-semibold text-gray-900 mb-4 text-sm">
                Moyens de paiement acceptés
              </h4>
              <div className="flex flex-wrap gap-3">
                <div className="px-3 py-2 bg-gray-50 rounded border border-gray-200 text-xs font-medium text-gray-700">
                  💳 Carte bancaire
                </div>
                <div className="px-3 py-2 bg-gray-50 rounded border border-gray-200 text-xs font-medium text-gray-700">
                  Visa
                </div>
                <div className="px-3 py-2 bg-gray-50 rounded border border-gray-200 text-xs font-medium text-gray-700">
                  Mastercard
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
