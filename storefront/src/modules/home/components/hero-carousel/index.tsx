"use client"

import { useState, useEffect } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const HeroCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0)

  // Images du carrousel (à remplacer par de vraies images)
  const slides = [
    {
      id: 1,
      image: "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=1920&h=800&fit=crop",
      alt: "Équitation de qualité"
    },
    {
      id: 2,
      image: "https://images.unsplash.com/photo-1598978546041-e711cb27ddcf?w=1920&h=800&fit=crop",
      alt: "LC Equestrian"
    },
    {
      id: 3,
      image: "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=1920&h=800&fit=crop",
      alt: "Outlet et promotions"
    }
  ]

  // Auto-défilement toutes les 5 secondes
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [slides.length])

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
  }

  return (
    <section className="relative w-full h-[60vh] md:h-[70vh] lg:h-[80vh] overflow-hidden bg-gray-900">
      {/* Images du carrousel */}
      <div className="relative h-full">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${slide.image})` }}
            />
            {/* Overlay sombre */}
            <div className="absolute inset-0 bg-black/40" />
          </div>
        ))}
      </div>

      {/* Contenu par-dessus */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 drop-shadow-2xl">
            <span className="bg-amber-600 bg-clip-text text-transparent">
              La Cabrade
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-white mb-8 drop-shadow-lg font-light">
            Votre sellerie équestre à Fléron
          </p>
          
          {/* 3 Boutons principaux */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <LocalizedClientLink
              href="/nouveautes"
              className="w-full sm:w-auto px-8 py-4 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Nouveautés
            </LocalizedClientLink>
            
            <LocalizedClientLink
              href="/categories/LC-Equestrian"
              className="w-full sm:w-auto px-8 py-4 bg-white text-amber-700 font-semibold rounded-lg hover:bg-amber-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 border-2 border-white"
            >
              LC Equestrian
            </LocalizedClientLink>
            
            <LocalizedClientLink
              href="/outlet"
              className="w-full sm:w-auto px-8 py-4 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Outlet
            </LocalizedClientLink>
          </div>
        </div>
      </div>

      {/* Indicateurs de slides */}
      <div className="absolute bottom-8 left-0 right-0 z-30 flex justify-center gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentSlide 
                ? 'bg-white w-8' 
                : 'bg-white/50 hover:bg-white/75'
            }`}
            aria-label={`Aller à la slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Flèches de navigation */}
      <button
        onClick={() => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-all duration-300 group"
        aria-label="Image précédente"
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <button
        onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-all duration-300 group"
        aria-label="Image suivante"
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </section>
  )
}

export default HeroCarousel

