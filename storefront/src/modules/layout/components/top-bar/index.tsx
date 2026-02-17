"use client"

import { useState, useEffect, useCallback } from "react"
import LanguageSelector from "@modules/layout/components/language-selector"
import { HttpTypes } from "@medusajs/types"

const promoBanners = [
  {
    text: "Livraison gratuite à partir de 75€",
  },
  {
    text: "Inscris-toi à notre newsletter et bénéficie de 10% sur ta prochaine commande",
  },
  {
    text: "Offre de lancement : 50 premières commandes reçoivent un cadeau",
  },
]

type TopBarProps = {
  regions: HttpTypes.StoreRegion[]
}

const TopBar = ({ regions }: TopBarProps) => {
  const [currentBanner, setCurrentBanner] = useState(0)
  const [isSliding, setIsSliding] = useState(false)

  const goToNext = useCallback(() => {
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

  return (
    <div className="bg-amber-600 text-white relative overflow-hidden">
      <div className="content-container">
        <div className="flex items-center justify-between h-10 text-xs">
          {/* Bandeau promo déroulant au centre */}
          <div className="flex-1 flex items-center justify-center min-h-[24px] overflow-hidden">
            <p
              className={`text-sm font-medium transition-all duration-400 ease-in-out ${
                isSliding
                  ? "opacity-0 -translate-x-8"
                  : "opacity-100 translate-x-0"
              }`}
            >
              {promoBanners[currentBanner].text}
            </p>
          </div>

          {/* Langue à droite */}
          <div className="hidden lg:flex items-center gap-4 flex-shrink-0 ml-4">
            <LanguageSelector />
          </div>
        </div>
      </div>
    </div>
  )
}

export default TopBar



