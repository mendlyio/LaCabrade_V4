"use client"

import { useState, useRef, useEffect } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"

type CategoryCarouselProps = {
  categories: any[] // Type de catégorie Medusa
}

const CategoryCarousel = ({ categories }: CategoryCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [itemsToShow, setItemsToShow] = useState(4)

  // Détecter la taille de l'écran
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setItemsToShow(1)
      } else if (window.innerWidth < 768) {
        setItemsToShow(2)
      } else if (window.innerWidth < 1024) {
        setItemsToShow(3)
      } else {
        setItemsToShow(4)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const maxIndex = Math.max(0, categories.length - itemsToShow)

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
      goToNext()
    }
    if (touchStart - touchEnd < -75) {
      goToPrevious()
    }
  }

  if (!categories || categories.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Aucune catégorie disponible
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Carrousel */}
      <div
        className="overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex transition-transform duration-500 ease-out gap-6"
          style={{
            transform: `translateX(-${currentIndex * (100 / itemsToShow)}%)`
          }}
        >
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex-shrink-0"
              style={{ width: `calc(${100 / itemsToShow}% - ${(itemsToShow - 1) * 24 / itemsToShow}px)` }}
            >
              <LocalizedClientLink
                href={`/categories/${category.handle}`}
                className="group relative block overflow-hidden rounded-xl aspect-square bg-gradient-to-br from-amber-100 to-orange-100 hover:shadow-2xl transition-all duration-300"
              >
                {/* Image de fond - dégradé par défaut */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-100 via-orange-100 to-amber-50 transition-transform duration-500 group-hover:scale-105" />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-amber-900/60 via-amber-900/20 to-transparent group-hover:from-amber-900/70 transition-all duration-300" />
                
                {/* Icône décorative */}
                <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-30 transition-opacity">
                  <svg className="w-32 h-32 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </div>
                
                {/* Contenu */}
                <div className="absolute inset-0 flex flex-col items-center justify-end p-6 text-center">
                  <h3 className="text-xl md:text-2xl font-bold text-amber-900 mb-2 drop-shadow-lg">
                    {category.name}
                  </h3>
                  <p className="text-sm text-amber-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-medium">
                    Découvrir →
                  </p>
                </div>
              </LocalizedClientLink>
            </div>
          ))}
        </div>
      </div>

      {/* Boutons de navigation */}
      {categories.length > itemsToShow && (
        <>
          <button
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            className={`hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-12 h-12 items-center justify-center bg-white rounded-full shadow-lg transition-all duration-300 ${
              currentIndex === 0
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-amber-50 hover:scale-110'
            }`}
            aria-label="Catégories précédentes"
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
            aria-label="Catégories suivantes"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Indicateurs de position (mobile) */}
      {categories.length > itemsToShow && (
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

export default CategoryCarousel

