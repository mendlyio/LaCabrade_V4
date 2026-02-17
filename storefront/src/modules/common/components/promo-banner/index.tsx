"use client"

import { useState, useEffect, useCallback } from "react"

const promoBanners = [
  {
    text: "Livraison gratuite à partir de 75€",
    bgColor: "bg-amber-600",
  },
  {
    text: "Inscris-toi à notre newsletter et bénéficie de 10% sur ta prochaine commande",
    bgColor: "bg-amber-700",
  },
  {
    text: "Offre de lancement : 50 premières commandes reçoivent un cadeau",
    bgColor: "bg-amber-600",
  },
]

const PromoBanner = () => {
  const [currentBanner, setCurrentBanner] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [isSliding, setIsSliding] = useState(false)
  const [direction, setDirection] = useState<"left" | "right">("left")

  const goToNext = useCallback(() => {
    setDirection("left")
    setIsSliding(true)
    setTimeout(() => {
      setCurrentBanner((prev) => (prev + 1) % promoBanners.length)
      setIsSliding(false)
    }, 400)
  }, [])

  useEffect(() => {
    const interval = setInterval(goToNext, 4000)
    return () => clearInterval(interval)
  }, [goToNext])

  if (!isVisible) return null

  return (
    <div className={`${promoBanners[currentBanner].bgColor} text-white text-center py-2.5 text-sm font-medium relative overflow-hidden transition-colors duration-400`}>
      <div className="relative flex items-center justify-center min-h-[24px]">
        <p
          className={`transition-all duration-400 ease-in-out px-10 ${
            isSliding
              ? "opacity-0 -translate-x-8"
              : "opacity-100 translate-x-0"
          }`}
        >
          {promoBanners[currentBanner].text}
        </p>
        <button
          onClick={() => setIsVisible(false)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded-full transition-colors"
          aria-label="Fermer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default PromoBanner
