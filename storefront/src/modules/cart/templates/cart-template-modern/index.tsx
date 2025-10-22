import ItemsTemplate from "../items"
import Summary from "./summary-modern"
import EmptyCartMessage from "../../components/empty-cart-message"
import SignInPrompt from "../../components/sign-in-prompt"
import SuggestedProducts from "./suggested-products"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ShoppingBag from "@medusajs/icons/dist/esm/shopping-bag"
import Heart from "@medusajs/icons/dist/esm/heart"
import TruckFast from "@medusajs/icons/dist/esm/truck-fast"
import ShieldCheck from "@medusajs/icons/dist/esm/shield-check"

const CartTemplateModern = ({
  cart,
  customer,
  countryCode,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
  countryCode: string
}) => {
  const itemCount = cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white">
        <div className="content-container py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  Mon Panier
                </span>
              </div>
              <h1 className="text-4xl font-bold mb-2">
                Votre Panier
              </h1>
              <p className="text-white/90">
                {itemCount > 0 
                  ? `${itemCount} article${itemCount > 1 ? 's' : ''} dans votre panier`
                  : "Votre panier est vide"}
              </p>
            </div>
            <LocalizedClientLink
              href="/store"
              className="hidden md:flex items-center gap-2 px-6 py-3 bg-white text-amber-600 hover:bg-amber-50 rounded-lg font-medium transition-all shadow-lg hover:shadow-xl"
            >
              <ShoppingBag className="w-5 h-5" />
              Continuer mes achats
            </LocalizedClientLink>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="content-container py-4">
          <nav className="flex items-center gap-2 text-sm text-gray-600">
            <LocalizedClientLink href="/" className="hover:text-amber-600 transition-colors">
              Accueil
            </LocalizedClientLink>
            <span>/</span>
            <span className="text-gray-900 font-medium">Panier</span>
          </nav>
        </div>
      </div>

      <div className="content-container py-12" data-testid="cart-container">
        {cart?.items?.length ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
              {/* Articles du panier */}
              <div className="space-y-6">
                {!customer && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                    <SignInPrompt />
                  </div>
                )}

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <ShoppingBag className="w-6 h-6 text-amber-600" />
                      Articles ({itemCount})
                    </h2>
                  </div>
                  <div className="p-6">
                    <ItemsTemplate items={cart?.items} />
                  </div>
                </div>

                {/* Continue Shopping Button (Mobile) */}
                <LocalizedClientLink
                  href="/store"
                  className="md:hidden flex items-center justify-center gap-2 px-6 py-3 border-2 border-amber-600 text-amber-600 hover:bg-amber-50 rounded-lg font-medium transition-all w-full"
                >
                  <ShoppingBag className="w-5 h-5" />
                  Continuer mes achats
                </LocalizedClientLink>
              </div>

              {/* Résumé */}
              <div className="lg:sticky lg:top-24 h-fit">
                {cart && cart.region && (
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    <Summary cart={cart as any} />
                  </div>
                )}
              </div>
            </div>

            {/* Trust Badges */}
            <div className="mt-12 bg-white rounded-xl border border-gray-200 p-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ShieldCheck className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">Paiement Sécurisé</h3>
                  <p className="text-xs text-gray-600">100% sécurisé</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <TruckFast className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">Livraison Rapide</h3>
                  <p className="text-xs text-gray-600">24-48h</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">↩️</span>
                  </div>
                  <h3 className="font-semibold text-sm mb-1">Retours Faciles</h3>
                  <p className="text-xs text-gray-600">14 jours</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Heart className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">Service Client</h3>
                  <p className="text-xs text-gray-600">7j/7</p>
                </div>
              </div>
            </div>

            {/* Produits suggérés */}
            <div className="mt-12">
              <SuggestedProducts cart={cart} countryCode={countryCode} />
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <EmptyCartMessage />
          </div>
        )}
      </div>
    </div>
  )
}

export default CartTemplateModern

