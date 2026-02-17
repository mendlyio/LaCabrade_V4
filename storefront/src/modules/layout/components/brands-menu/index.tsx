"use client"

import { Fragment } from "react"
import { Popover, Transition } from "@headlessui/react"
import { ChevronDown } from "@medusajs/icons"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useTranslate } from "@lib/context/language-context"
import { Brand } from "@lib/data/brands"

type BrandsMenuProps = {
  brands: Brand[]
}

const BrandsMenu = ({ brands }: BrandsMenuProps) => {
  const t = useTranslate()

  // Si pas de marques, ne rien afficher ou un lien simple
  if (!brands || brands.length === 0) {
    return (
      <LocalizedClientLink
        href="/marques"
        className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-white hover:bg-amber-600 transition-all duration-200"
      >
        {t("nav.marques")}
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
                ? 'text-white bg-amber-600 shadow-sm' 
                : 'text-gray-700 hover:text-white hover:bg-amber-600'
              }
            `}
          >
            <span>{t("nav.marques")}</span>
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
            <Popover.Panel className="absolute left-1/2 -translate-x-1/2 z-50 mt-3 w-[600px] max-w-[90vw] transform">
              <div className="overflow-hidden rounded-xl shadow-xl ring-1 ring-black ring-opacity-5 bg-white">
                {/* Header */}
                <div className="border-b border-gray-100 bg-gray-50 px-6 py-3 flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-gray-900">
                    {t("nav.brands_title")}
                  </h3>
                  <LocalizedClientLink
                    href="/marques"
                    onClick={() => close()}
                    className="text-xs font-medium text-amber-600 hover:text-amber-700"
                  >
                    {t("nav.view_all")} →
                  </LocalizedClientLink>
                </div>

                {/* Liste des marques - grand rectangle scrollable */}
                <div className="p-4 max-h-[60vh] overflow-y-auto">
                  <div className="grid grid-cols-3 gap-2">
                    {brands.map((brand) => (
                      <LocalizedClientLink
                        key={brand.slug}
                        href={`/marques/${brand.slug}`}
                        onClick={() => close()}
                        className="px-3 py-2 text-sm text-gray-700 hover:text-white hover:bg-amber-600 rounded-lg transition-all duration-200 font-medium"
                      >
                        {brand.name}
                      </LocalizedClientLink>
                    ))}
                  </div>
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



