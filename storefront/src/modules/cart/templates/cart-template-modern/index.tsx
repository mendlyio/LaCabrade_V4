import ItemsTemplate from "../items"
import Summary from "./summary-modern"
import EmptyCartMessage from "../../components/empty-cart-message"
import SignInPrompt from "../../components/sign-in-prompt"
import SuggestedProducts from "./suggested-products"
import ViewCartTracker from "@modules/common/components/tracking/view-cart-tracker"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="content-container py-6 sm:py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Mon Panier
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {itemCount > 0 
                  ? `${itemCount} article${itemCount > 1 ? "s" : ""} dans votre panier`
                  : "Votre panier est vide"}
              </p>
            </div>
            <LocalizedClientLink
              href="/store"
              className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all"
            >
              Continuer mes achats
            </LocalizedClientLink>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="content-container py-3">
          <nav className="flex items-center gap-2 text-xs text-gray-400">
            <LocalizedClientLink href="/" className="hover:text-amber-600 transition-colors">
              Accueil
            </LocalizedClientLink>
            <span>/</span>
            <span className="text-gray-700 font-medium">Panier</span>
          </nav>
        </div>
      </div>

      <ViewCartTracker cart={cart} />
      <div className="content-container py-8 sm:py-10" data-testid="cart-container">
        {cart?.items?.length ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
              {/* Colonne gauche */}
              <div className="space-y-6">
                {!customer && <SignInPrompt />}

                {(cart?.metadata as any)?.has_pickup_only_items && (
                  <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
                    <span className="mt-0.5 text-lg leading-none">🏪</span>
                    <div>
                      <p className="text-sm font-semibold text-amber-800">
                        Retrait en magasin uniquement
                      </p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Votre panier contient des articles lourds (sacs d'aliments 20&nbsp;kg+). Ces produits ne peuvent pas être expédiés à domicile — seul le retrait à La Cabrade est disponible.
                      </p>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                      Articles ({itemCount})
                    </h2>
                  </div>
                  <div className="p-4 sm:p-6">
                    <ItemsTemplate items={cart?.items} />
                  </div>
                </div>

                {/* Mobile : continuer achats */}
                <LocalizedClientLink
                  href="/store"
                  className="md:hidden flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all w-full"
                >
                  Continuer mes achats
                </LocalizedClientLink>
              </div>

              {/* Colonne droite : résumé */}
              <div className="lg:sticky lg:top-24 h-fit">
                {cart && cart.region && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <Summary cart={cart as any} customer={customer} />
                  </div>
                )}
              </div>
            </div>

            {/* Réassurance */}
            <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", label: "Paiement sécurisé", sub: "SSL 256 bits" },
                { icon: "M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0", label: "Livraison rapide", sub: "24-48h" },
                { icon: "M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6", label: "Retours faciles", sub: "14 jours" },
                { icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z", label: "Service client", sub: "7j/7" },
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                  <svg className="w-6 h-6 text-amber-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                  </svg>
                  <p className="text-xs font-semibold text-gray-900">{item.label}</p>
                  <p className="text-[10px] text-gray-500">{item.sub}</p>
                </div>
              ))}
            </div>

            {/* Produits suggérés */}
            <div className="mt-10">
              <SuggestedProducts cart={cart} countryCode={countryCode} />
            </div>
          </>
        ) : (
          <EmptyCartMessage />
        )}
      </div>
    </div>
  )
}

export default CartTemplateModern
