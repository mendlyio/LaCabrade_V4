"use client"

import { useState, useEffect } from "react"

const promoBanners = [
  {
    text: "🏇 Livraison gratuite dès 100€ d'achat",
    bgColor: "from-amber-600 via-amber-500 to-amber-600",
  },
  {
    text: "✨ Nouveautés équestres disponibles - Découvrez notre collection",
    bgColor: "from-orange-600 via-orange-500 to-orange-600",
  },
  {
    text: "🎁 -10% sur votre première commande avec le code BIENVENUE",
    bgColor: "from-amber-700 via-amber-600 to-amber-700",
  },
  {
    text: "📦 Expédition sous 24h pour toutes les commandes",
    bgColor: "from-amber-500 via-orange-500 to-amber-500",
  },
]

const PromoBanner = () => {
  const [currentBanner, setCurrentBanner] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % promoBanners.length)
    }, 5000) // Change toutes les 5 secondes

    return () => clearInterval(interval)
  }, [])

  if (!isVisible) return null

  return (
    <div
      className={`bg-gradient-to-r ${promoBanners[currentBanner].bgColor} text-white text-center py-2 text-sm font-medium relative overflow-hidden`}
    >
      <div className="absolute inset-0 bg-black/5 animate-pulse"></div>
      <div className="relative flex items-center justify-center gap-4">
        <p className="animate-fade-in">
          {promoBanners[currentBanner].text}
        </p>
        <button
          onClick={() => setIsVisible(false)}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded-full transition-colors"
          aria-label="Fermer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Indicateurs */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-1 pb-1">
        {promoBanners.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentBanner(index)}
            className={`w-1.5 h-1.5 rounded-full transition-all ${
              index === currentBanner ? "bg-white w-4" : "bg-white/50"
            }`}
            aria-label={`Banner ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

export default PromoBanner



