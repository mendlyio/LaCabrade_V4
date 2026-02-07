"use client"

import { addToCart } from "@lib/data/cart"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import Thumbnail from "@modules/products/components/thumbnail"
import { useParams } from "next/navigation"
import { useRef, useState } from "react"

type CheckoutUpsellProps = {
  products: HttpTypes.StoreProduct[]
  cartItems?: HttpTypes.StoreCartLineItem[]
  currencyCode: string
}

const CheckoutUpsell = ({ products, cartItems, currencyCode }: CheckoutUpsellProps) => {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const scrollRef = useRef<HTMLDivElement>(null)
  const params = useParams()
  const countryCode = (params.countryCode as string) || "be"

  // Exclure les produits déjà dans le panier
  const cartProductIds = cartItems?.map(item => item.product_id) || []
  const filteredProducts = products.filter(p => !cartProductIds.includes(p.id) && !addedIds.has(p.id))

  if (filteredProducts.length === 0) return null

  const handleAdd = async (product: HttpTypes.StoreProduct) => {
    const variant = product.variants?.[0]
    if (!variant) return

    setLoadingId(product.id)
    try {
      await addToCart({
        variantId: variant.id,
        quantity: 1,
        countryCode,
      })
      setAddedIds(prev => new Set(prev).add(product.id))
    } catch (e) {
      console.error("Erreur ajout upsell:", e)
    } finally {
      setLoadingId(null)
    }
  }

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const amount = 200
      scrollRef.current.scrollBy({
        left: direction === "left" ? -amount : amount,
        behavior: "smooth",
      })
    }
  }

  const getPrice = (product: HttpTypes.StoreProduct) => {
    const variant = product.variants?.[0]
    const price = (variant as any)?.calculated_price?.calculated_amount
    if (price != null) {
      return convertToLocale({ amount: price, currency_code: currencyCode })
    }
    return null
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Complétez votre commande
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">Ajoutez en un clic</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => scroll("left")}
            className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto no-scrollbar p-4"
      >
        {filteredProducts.map((product) => {
          const isLoading = loadingId === product.id
          const price = getPrice(product)

          return (
            <div
              key={product.id}
              className="flex-shrink-0 w-[140px] group"
            >
              <div className="relative rounded-lg overflow-hidden bg-gray-50 aspect-square mb-2">
                <Thumbnail
                  thumbnail={product.thumbnail}
                  images={product.images}
                  size="square"
                />
              </div>
              <p className="text-xs text-gray-900 font-medium leading-tight line-clamp-2 mb-1 min-h-[2rem]">
                {product.title}
              </p>
              {price && (
                <p className="text-xs font-bold text-amber-600 mb-2">{price}</p>
              )}
              <button
                onClick={() => handleAdd(product)}
                disabled={isLoading}
                className="w-full py-1.5 px-2 text-[11px] font-semibold rounded-md transition-all duration-200 border border-amber-600 text-amber-600 hover:bg-amber-600 hover:text-white disabled:opacity-50 disabled:cursor-wait"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-1">
                    <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Ajout...
                  </span>
                ) : (
                  "+ Ajouter"
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default CheckoutUpsell
