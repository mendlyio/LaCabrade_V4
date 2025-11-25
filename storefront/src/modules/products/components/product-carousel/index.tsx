"use client"

import { useState, useRef, useEffect } from "react"
import { HttpTypes } from "@medusajs/types"
import ProductPreview from "@modules/products/components/product-preview"

type ProductCarouselProps = {
  products: HttpTypes.StoreProduct[]
  region: HttpTypes.StoreRegion
  itemsPerView?: {
    mobile: number
    tablet: number
    desktop: number
  }
}

const ProductCarousel = ({
  products,
  region,
  itemsPerView = { mobile: 2, tablet: 3, desktop: 5 }
}: ProductCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [itemsToShow, setItemsToShow] = useState(itemsPerView.desktop)
  const carouselRef = useRef<HTMLDivElement>(null)

  // Détecter la taille de l'écran et ajuster le nombre d'items
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setItemsToShow(itemsPerView.mobile)
      } else if (window.innerWidth < 1024) {
        setItemsToShow(itemsPerView.tablet)
      } else {
        setItemsToShow(itemsPerView.desktop)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [itemsPerView])

  const maxIndex = Math.max(0, products.length - itemsToShow)

  const goToPrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1))
  }

  const goToNext = () => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1))
  }

  // Support du swipe sur mobile
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      // Swipe left
      goToNext()
    }

    if (touchStart - touchEnd < -75) {
      // Swipe right
      goToPrevious()
    }
  }

  if (!products || products.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Aucun produit disponible pour le moment
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Carrousel */}
      <div
        ref={carouselRef}
        className="overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex transition-transform duration-500 ease-out gap-4"
          style={{
            transform: `translateX(-${currentIndex * (100 / itemsToShow)}%)`
          }}
        >
          {products.map((product) => (
            <div
              key={product.id}
              className="flex-shrink-0"
              style={{ width: `calc(${100 / itemsToShow}% - ${(itemsToShow - 1) * 16 / itemsToShow}px)` }}
            >
              <ProductPreview
                region={region}
                product={product}
                isFeatured
              />
            </div>
          ))}
        </div>
      </div>

      {/* Boutons de navigation (desktop uniquement si plus d'items que la vue) */}
      {products.length > itemsToShow && (
        <>
          <button
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            className={`hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-12 h-12 items-center justify-center bg-white rounded-full shadow-lg transition-all duration-300 ${
              currentIndex === 0
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-amber-50 hover:scale-110'
            }`}
            aria-label="Produits précédents"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={goToNext}
            disabled={currentIndex >= maxIndex}
            className={`hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-12 h-12 items-center justify-center bg-white rounded-full shadow-lg transition-all duration-300 ${
              currentIndex >= maxIndex
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-amber-50 hover:scale-110'
            }`}
            aria-label="Produits suivants"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Indicateurs de position (mobile) */}
      {products.length > itemsToShow && (
        <div className="flex md:hidden justify-center gap-2 mt-6">
          {Array.from({ length: maxIndex + 1 }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'bg-amber-600 w-6'
                  : 'bg-gray-300 hover:bg-amber-300'
              }`}
              aria-label={`Aller à la page ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default ProductCarousel

