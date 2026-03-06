"use client"

import { useState, useEffect } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const HeroCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0)

  const slides = [
    {
      id: 1,
      image: "https://ik.imagekit.io/kodt9cn6f/Cabrade/header-3.webp",
      alt: "Tous les articles",
      buttonText: "Voir tous les articles",
      buttonHref: "/store",
      buttonStyle: "bg-amber-600 text-white hover:bg-amber-700",
    },
    {
      id: 2,
      image: "https://ik.imagekit.io/kodt9cn6f/Slide-LC-Equestrian.webp",
      alt: "LC Equestrian",
      buttonText: "LC Equestrian",
      buttonHref: "/categories/LC-Equestrian",
      buttonStyle: "bg-white text-amber-700 hover:bg-amber-50 border-2 border-white",
    },
    {
      id: 3,
      image: "https://ik.imagekit.io/kodt9cn6f/Cabrade/header-1.webp",
      alt: "Outlet",
      buttonText: "Voir les promotions",
      buttonHref: "/categories/outlet",
      buttonStyle: "bg-[#c4707f] text-white hover:bg-[#b5616f]",
    },
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

      {/* Bouton par slide — positionné en bas */}
      <div className="absolute bottom-20 sm:bottom-24 left-0 right-0 z-20 flex justify-center px-4">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`transition-opacity duration-700 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0 absolute'
            }`}
          >
            <LocalizedClientLink
              href={slide.buttonHref}
              className={`inline-flex px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-semibold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${slide.buttonStyle}`}
            >
              {slide.buttonText}
            </LocalizedClientLink>
          </div>
        ))}
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

