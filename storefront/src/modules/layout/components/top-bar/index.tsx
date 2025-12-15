"use client"

import { useToggleState } from "@medusajs/ui"
import CountrySelect from "@modules/layout/components/country-select"
import LanguageSelector from "@modules/layout/components/language-selector"
import { HttpTypes } from "@medusajs/types"
import { useTranslate } from "@lib/context/language-context"

type TopBarProps = {
  regions: HttpTypes.StoreRegion[]
}

const TopBar = ({ regions }: TopBarProps) => {
  const toggleState = useToggleState()
  const t = useTranslate()

  return (
    <div className="bg-gray-50 border-b border-gray-200 hidden lg:block">
      <div className="content-container">
        <div className="flex items-center justify-between h-10 text-xs">
          {/* Call to action à gauche */}
          <div className="text-gray-600">
            {t("topbar.promo")}
          </div>
          
          {/* Langue à droite */}
          <div className="flex items-center gap-4">
            <LanguageSelector />
          </div>
        </div>
      </div>
    </div>
  )
}

export default TopBar



