"use client"

import { Fragment } from "react"
import { Popover, Transition } from "@headlessui/react"
import { ChevronDown } from "@medusajs/icons"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

// Liste des marques principales
const BRANDS = [
  { name: "Equiline", handle: "equiline" },
  { name: "Kingsland", handle: "kingsland" },
  { name: "Samshield", handle: "samshield" },
  { name: "Vestrum", handle: "vestrum" },
  { name: "Pikeur", handle: "pikeur" },
  { name: "Cavallo", handle: "cavallo" },
  { name: "Eskadron", handle: "eskadron" },
  { name: "LeMieux", handle: "lemieux" },
  { name: "Fair Play", handle: "fair-play" },
  { name: "BR", handle: "br" },
  { name: "HV Polo", handle: "hv-polo" },
  { name: "Anky", handle: "anky" },
]

const BrandsMenu = () => {
  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <Popover.Button
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
              transition-all duration-200
              ${open 
                ? 'text-amber-600 bg-amber-50' 
                : 'text-gray-700 hover:text-amber-600 hover:bg-amber-50'
              }
            `}
          >
            <span>Marques</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                open ? 'rotate-180' : ''
              }`}
            />
          </Popover.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="absolute left-1/2 -translate-x-1/2 z-50 mt-3 w-80 transform px-4">
              {({ close }) => (
                <div className="overflow-hidden rounded-2xl shadow-2xl ring-1 ring-black ring-opacity-5">
                  <div className="relative bg-white">
                    {/* Header */}
                    <div className="border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-3">
                      <h3 className="font-semibold text-sm text-gray-900">
                        Nos marques
                      </h3>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {BRANDS.length} marques disponibles
                      </p>
                    </div>

                    {/* Liste des marques */}
                    <div className="px-4 py-4 max-h-96 overflow-y-auto">
                      <div className="grid grid-cols-2 gap-2">
                        {BRANDS.map((brand) => (
                          <LocalizedClientLink
                            key={brand.handle}
                            href={`/store?marque=${brand.handle}`}
                            onClick={() => close()}
                            className="px-3 py-2 text-sm text-gray-700 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all duration-200 font-medium"
                          >
                            {brand.name}
                          </LocalizedClientLink>
                        ))}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-200 bg-gray-50 px-6 py-3">
                      <LocalizedClientLink
                        href="/store"
                        onClick={() => close()}
                        className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center justify-center gap-1"
                      >
                        Voir toutes les marques
                        <span>→</span>
                      </LocalizedClientLink>
                    </div>
                  </div>
                </div>
              )}
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  )
}

export default BrandsMenu

