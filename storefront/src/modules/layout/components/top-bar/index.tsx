"use client"

import { useToggleState } from "@medusajs/ui"
import CountrySelect from "@modules/layout/components/country-select"
import LanguageSelector from "@modules/layout/components/language-selector"
import { HttpTypes } from "@medusajs/types"

type TopBarProps = {
  regions: HttpTypes.StoreRegion[]
}

const TopBar = ({ regions }: TopBarProps) => {
  const toggleState = useToggleState()

  return (
    <div className="bg-gray-50 border-b border-gray-200 hidden lg:block">
      <div className="content-container">
        <div className="flex items-center justify-between h-10 text-xs">
          {/* Call to action à gauche */}
          <div className="text-gray-600">
            -10% pour les nouveaux clients avec le code BIENVENUE10 | Livraison gratuite dès 100€
          </div>
          
          {/* Langue et pays à droite */}
          <div className="flex items-center gap-4">
            <LanguageSelector />
            <span className="text-gray-300">|</span>
            <div
              onMouseEnter={toggleState.open}
              onMouseLeave={toggleState.close}
            >
              <CountrySelect toggleState={toggleState} regions={regions} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TopBar



