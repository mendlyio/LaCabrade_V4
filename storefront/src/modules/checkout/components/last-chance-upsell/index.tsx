"use client"

import { addLastChanceItem } from "@lib/data/cart"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import Thumbnail from "@modules/products/components/thumbnail"
import { useParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

const DISCOUNT_PERCENT = 10

type LastChanceUpsellProps = {
  products: HttpTypes.StoreProduct[]
  cartItems?: HttpTypes.StoreCartLineItem[]
  currencyCode: string
}

const LastChanceUpsell = ({
  products,
  cartItems,
  currencyCode,
}: LastChanceUpsellProps) => {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [promoUsed, setPromoUsed] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [countdown, setCountdown] = useState(10 * 60) // 10 minutes
  const scrollRef = useRef<HTMLDivElement>(null)
  const params = useParams()
  const countryCode = (params.countryCode as string) || "be"

  // Timer décompte
  useEffect(() => {
    if (countdown <= 0) return
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [countdown])

  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }, [])

  // Exclure les produits déjà dans le panier
  const cartProductIds = cartItems?.map((item) => item.product_id) || []
  const filteredProducts = products.filter(
    (p) => !cartProductIds.includes(p.id)
  )

  // Masquer si promo déjà utilisée, fermé manuellement, ou plus de produits
  if (promoUsed || dismissed || filteredProducts.length === 0) return null

  const handleAdd = async (product: HttpTypes.StoreProduct) => {
    const variant = product.variants?.[0]
    if (!variant) return

    setLoadingId(product.id)
    try {
      await addLastChanceItem({
        variantId: variant.id,
        countryCode,
      })
      // Promo utilisée → on masque le composant après ajout
      setPromoUsed(true)
    } catch (e) {
      console.error("Erreur ajout last chance:", e)
    } finally {
      setLoadingId(null)
    }
  }

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === "left" ? -180 : 180,
        behavior: "smooth",
      })
    }
  }

  const getPrice = (product: HttpTypes.StoreProduct) => {
    const variant = product.variants?.[0]
    const rawPrice = (variant as any)?.calculated_price?.calculated_amount
    if (rawPrice != null) {
      const price = rawPrice / 100
      return {
        original: price,
        discounted: Math.round(price * (1 - DISCOUNT_PERCENT / 100) * 100) / 100,
      }
    }
    return null
  }

  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-red-300 bg-gradient-to-br from-red-50 via-white to-amber-50">
      {/* Badge */}
      <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg z-10">
        -{DISCOUNT_PERCENT}% EXCLUSIF
      </div>

      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Dernière chance !
              </h3>
              <p className="text-[11px] text-gray-500 leading-snug">
                Choisissez <span className="text-red-500 font-bold">1 article</span> et profitez de{" "}
                <span className="text-red-500 font-bold">-{DISCOUNT_PERCENT}%</span> immédiat
              </p>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-gray-300 hover:text-gray-500 transition-colors p-0.5 flex-shrink-0"
            aria-label="Fermer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Timer */}
        {countdown > 0 && (
          <div className="mt-2.5 flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-red-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full animate-pulse">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatTime(countdown)}
            </div>
            <span className="text-[10px] text-gray-400">Offre limitée</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="relative">
        <button
          onClick={() => scroll("left")}
          className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white/90 shadow border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => scroll("right")}
          className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white/90 shadow border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Carrousel */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-4"
        >
          {filteredProducts.map((product) => {
            const isLoading = loadingId === product.id
            const prices = getPrice(product)

            return (
              <div key={product.id} className="flex-shrink-0 w-[130px]">
                {/* Image */}
                <div className="relative rounded-lg overflow-hidden bg-gray-50 aspect-square mb-2 group">
                  <Thumbnail
                    thumbnail={product.thumbnail}
                    images={product.images}
                    size="square"
                  />
                  <div className="absolute top-1 left-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                    -{DISCOUNT_PERCENT}%
                  </div>
                </div>

                {/* Titre */}
                <p className="text-[11px] text-gray-800 font-medium leading-tight line-clamp-2 mb-1 min-h-[1.75rem]">
                  {product.title}
                </p>

                {/* Prix barré + prix réduit */}
                {prices && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-[10px] text-gray-400 line-through">
                      {convertToLocale({
                        amount: prices.original,
                        currency_code: currencyCode,
                      })}
                    </span>
                    <span className="text-xs font-bold text-red-600">
                      {convertToLocale({
                        amount: prices.discounted,
                        currency_code: currencyCode,
                      })}
                    </span>
                  </div>
                )}

                {/* Bouton */}
                <button
                  onClick={() => handleAdd(product)}
                  disabled={isLoading}
                  className="w-full py-1.5 px-2 text-[10px] font-bold rounded-md transition-all duration-200 bg-red-500 text-white hover:bg-red-600 active:scale-95 disabled:opacity-50 disabled:cursor-wait shadow-sm"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-1">
                      <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      J&apos;en profite !
                    </span>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default LastChanceUpsell
