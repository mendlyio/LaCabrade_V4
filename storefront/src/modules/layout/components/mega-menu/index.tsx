"use client"

import { Fragment } from "react"
import { Popover, Transition } from "@headlessui/react"
import { ChevronDown } from "@medusajs/icons"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"

type MegaMenuProps = {
  category: HttpTypes.StoreProductCategory
}

const MegaMenu = ({ category }: MegaMenuProps) => {
  const hasChildren = category.category_children && category.category_children.length > 0

  if (!hasChildren) {
    return (
      <LocalizedClientLink
        href={`/categories/${category.handle}`}
        className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-white hover:bg-amber-600 transition-all duration-200 whitespace-nowrap"
      >
        {category.name}
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
              transition-all duration-200 whitespace-nowrap
              ${open 
                ? 'text-white bg-amber-600 shadow-sm' 
                : 'text-gray-700 hover:text-white hover:bg-amber-600'
              }
            `}
          >
            <span>{category.name}</span>
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
            <Popover.Panel className="absolute left-0 right-0 z-50 mt-4 w-screen px-4">
              <div className="overflow-hidden rounded-2xl shadow-2xl ring-1 ring-black/5 bg-white max-w-6xl mx-auto">
                <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-900">
                      {category.name}
                    </span>
                    <span className="text-xs text-gray-500">Catégories</span>
                  </div>
                  <LocalizedClientLink
                    href={`/categories/${category.handle}`}
                    onClick={() => close()}
                    className="inline-flex items-center gap-2 rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
                  >
                    Voir tout
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </LocalizedClientLink>
                </div>

                <div className="max-h-[70vh] overflow-y-auto">
                  <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-6">
                    {category.category_children?.map((child) => (
                      <div key={child.id} className="space-y-3">
                        <LocalizedClientLink
                          href={`/categories/${child.handle}`}
                          onClick={() => close()}
                          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-amber-700 transition-colors"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          {child.name}
                        </LocalizedClientLink>

                        {child.category_children && child.category_children.length > 0 && (
                          <ul className="space-y-1.5">
                            {child.category_children.map((grandChild) => (
                              <li key={grandChild.id} className="space-y-1">
                                <LocalizedClientLink
                                  href={`/categories/${grandChild.handle}`}
                                  onClick={() => close()}
                                  className="text-sm text-gray-700 hover:text-amber-700 transition-colors block"
                                >
                                  {grandChild.name}
                                </LocalizedClientLink>
                                {grandChild.category_children &&
                                  grandChild.category_children.length > 0 && (
                                    <ul className="ml-3 border-l border-gray-200 pl-3 space-y-1">
                                      {grandChild.category_children.map((greatGrandChild) => (
                                        <li key={greatGrandChild.id}>
                                          <LocalizedClientLink
                                            href={`/categories/${greatGrandChild.handle}`}
                                            onClick={() => close()}
                                            className="text-xs text-gray-500 hover:text-amber-700 transition-colors block"
                                          >
                                            {greatGrandChild.name}
                                          </LocalizedClientLink>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
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

export default MegaMenu
