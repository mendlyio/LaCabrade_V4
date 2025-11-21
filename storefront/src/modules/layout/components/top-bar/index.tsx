"use client"

import { useToggleState } from "@medusajs/ui"
import CountrySelect from "@modules/layout/components/country-select"
import { HttpTypes } from "@medusajs/types"

type TopBarProps = {
  regions: HttpTypes.StoreRegion[]
}

const TopBar = ({ regions }: TopBarProps) => {
  const toggleState = useToggleState()

  return (
    <div className="bg-gray-50 border-b border-gray-200">
      <div className="content-container">
        <div className="flex items-center justify-between h-10 text-xs">
          <div className="flex items-center gap-4 text-gray-600">
            {/* Sélecteur de langue/pays avec drapeau */}
            <div
              onMouseEnter={toggleState.open}
              onMouseLeave={toggleState.close}
            >
              <CountrySelect toggleState={toggleState} regions={regions} />
            </div>
          </div>
          <div className="flex items-center gap-4 text-gray-600">
            <a href="tel:+3243586099" className="hover:text-amber-600 transition-colors flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
              </svg>
              +32 (0)4/358.60.99
            </a>
            <span className="text-gray-300">|</span>
            <a href="/aide" className="hover:text-amber-600 transition-colors">
              Aide
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TopBar


