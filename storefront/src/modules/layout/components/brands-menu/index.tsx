"use client"

import { Fragment } from "react"
import { Popover, Transition } from "@headlessui/react"
import { ChevronDown } from "@medusajs/icons"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"

type BrandsMenuProps = {
  collections: HttpTypes.StoreCollection[]
}

const BrandsMenu = ({ collections }: BrandsMenuProps) => {
  // Si pas de collections, ne rien afficher ou un lien simple
  if (!collections || collections.length === 0) {
    return (
      <LocalizedClientLink
        href="/store"
        className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-amber-600 hover:bg-amber-50 transition-all duration-200"
      >
        Marques
      </LocalizedClientLink>
    )
  }

  return (
    <Popover className="relative">
      {({ open, close }) => (
        <>
          <Popover.Button
            className={`
              flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium outline-none
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
              <div className="overflow-hidden rounded-xl shadow-xl ring-1 ring-black ring-opacity-5 bg-white">
                {/* Header */}
                <div className="border-b border-gray-100 bg-gray-50 px-6 py-3">
                  <h3 className="font-semibold text-sm text-gray-900">
                    Nos marques
                  </h3>
                </div>

                {/* Liste des marques */}
                <div className="p-4 max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-2">
                    {collections.map((brand) => (
                      <LocalizedClientLink
                        key={brand.id}
                        href={`/collections/${brand.handle}`}
                        onClick={() => close()}
                        className="px-3 py-2 text-sm text-gray-700 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all duration-200 font-medium truncate"
                      >
                        {brand.title}
                      </LocalizedClientLink>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 p-3 border-t border-gray-100 text-center">
                  <LocalizedClientLink
                    href="/store"
                    onClick={() => close()}
                    className="text-xs font-medium text-amber-600 hover:text-amber-700"
                  >
                    Voir tout →
                  </LocalizedClientLink>
                </div>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  )
}

export default BrandsMenu



