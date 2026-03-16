"use client"

import { useState, useEffect, useCallback } from "react"
import LanguageSelector from "@modules/layout/components/language-selector"
import { HttpTypes } from "@medusajs/types"
import { useTranslate } from "@lib/context/language-context"

const PROMO_KEYS = [
  "topbar.free_shipping",
  "topbar.newsletter_promo",
  "topbar.launch_offer",
] as const

type TopBarProps = {
  regions: HttpTypes.StoreRegion[]
}

const TopBar = ({ regions }: TopBarProps) => {
  const t = useTranslate()
  const [currentBanner, setCurrentBanner] = useState(0)
  const [isSliding, setIsSliding] = useState(false)

  const goToNext = useCallback(() => {
    setIsSliding(true)
    setTimeout(() => {
      setCurrentBanner((prev) => (prev + 1) % PROMO_KEYS.length)
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
              {t(PROMO_KEYS[currentBanner] as any)}
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



