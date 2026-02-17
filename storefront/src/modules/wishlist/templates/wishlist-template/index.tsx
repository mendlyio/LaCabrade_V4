"use client"

import { useWishlist } from "@lib/context/wishlist-context"
import { useEffect, useState } from "react"
import { HttpTypes } from "@medusajs/types"
import ProductCardWishlist from "@modules/products/components/product-card-wishlist"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Heart, ShoppingBag } from "@medusajs/icons"

type WishlistTemplateProps = {
  region: HttpTypes.StoreRegion
  countryCode: string
}

export default function WishlistTemplate({ region, countryCode }: WishlistTemplateProps) {
  const { items, clearWishlist, itemCount } = useWishlist()
  const [products, setProducts] = useState<HttpTypes.StoreProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadProducts = async () => {
      if (items.length === 0) {
        setProducts([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch('/api/wishlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productIds: items,
            regionId: region.id,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to fetch wishlist products')
        }

        const data = await response.json()
        setProducts(data.products || [])
      } catch (error) {
        console.error("Erreur lors du chargement des produits de la wishlist:", error)
        setProducts([])
      } finally {
        setIsLoading(false)
      }
    }

    loadProducts()
  }, [items, region.id])

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <div className="bg-[#9e354a] text-white">
        <div className="content-container py-12">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold mb-3">
              Ma liste de souhaits
            </h1>
            <p className="text-lg text-white/90 mb-4">
              Retrouvez tous les produits que vous aimez en un seul endroit.
            </p>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                <Heart className="w-5 h-5 fill-current" />
                <span className="font-semibold">{itemCount} produit{itemCount > 1 ? 's' : ''}</span>
              </div>
              {itemCount > 0 && (
                <button
                  onClick={clearWishlist}
                  className="text-white/90 hover:text-white underline underline-offset-4 transition-colors"
                >
                  Tout supprimer
                </button>
              )}
            </div>
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
            <span className="text-gray-900 font-medium">Liste de souhaits</span>

          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="content-container py-12">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-[#9e354a] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement de votre liste de souhaits...</p>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-gradient-to-br from-[#9e354a]/10 to-[#9e354a]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="w-12 h-12 text-[#9e354a]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Votre liste de souhaits est vide
              </h2>
              <p className="text-gray-600 mb-8">
                Parcourez notre catalogue et ajoutez vos produits préférés à votre liste de souhaits 
                en cliquant sur l'icône cœur.
              </p>
              <LocalizedClientLink
                href="/store"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#9e354a] hover:bg-[#8a2d40] text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
              >
                <ShoppingBag className="w-5 h-5" />
                Découvrir nos produits
              </LocalizedClientLink>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Bar */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    {itemCount} produit{itemCount > 1 ? 's' : ''} dans votre liste
                  </h2>
                  <p className="text-sm text-gray-600">
                    Ajoutez vos favoris au panier pour passer commande
                  </p>
                </div>
                <button
                  onClick={clearWishlist}
                  className="px-4 py-2 text-[#9e354a] hover:bg-[#9e354a]/10 rounded-lg transition-colors font-medium text-sm"
                >
                  Tout supprimer
                </button>
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
              {products.map((product) => (
                <ProductCardWishlist
                  key={product.id}
                  product={product}
                  region={region}
                />
              ))}
            </div>

            {/* CTA */}
            <div className="mt-12 text-center">
              <LocalizedClientLink
                href="/store"
                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg"
              >
                <ShoppingBag className="w-5 h-5" />
                Continuer mes achats
              </LocalizedClientLink>
            </div>
          </>
        )}
      </div>

      {/* Trust Badges */}
      <div className="bg-white border-t border-gray-200 py-12">
        <div className="content-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Heart className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="font-semibold text-sm mb-1">Sauvegardé</h3>
              <p className="text-xs text-gray-600">Retrouvez vos favoris</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-amber-600 text-white rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🚚</span>
              </div>
              <h3 className="font-semibold text-sm mb-1">Livraison Rapide</h3>
              <p className="text-xs text-gray-600">Expédition sous 24-48h</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-amber-600 text-white rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="font-semibold text-sm mb-1">Paiement Sécurisé</h3>
              <p className="text-xs text-gray-600">Transactions protégées</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-amber-600 text-white rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">💬</span>
              </div>
              <h3 className="font-semibold text-sm mb-1">Support Client</h3>
              <p className="text-xs text-gray-600">À votre écoute 7j/7</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

