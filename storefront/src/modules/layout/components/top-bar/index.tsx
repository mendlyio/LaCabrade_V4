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
    <div className="bg-gray-50 border-b border-gray-200 hidden lg:block">
      <div className="content-container">
        <div className="flex items-center justify-end h-10 text-xs">
          <div
            onMouseEnter={toggleState.open}
            onMouseLeave={toggleState.close}
          >
            <CountrySelect toggleState={toggleState} regions={regions} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default TopBar



