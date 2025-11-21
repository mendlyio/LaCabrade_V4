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
        className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-amber-600 hover:bg-amber-50 transition-all duration-200 whitespace-nowrap"
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
                ? 'text-amber-600 bg-amber-50' 
                : 'text-gray-700 hover:text-amber-600 hover:bg-amber-50'
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
            <Popover.Panel className="absolute left-1/2 -translate-x-1/2 z-50 mt-3 w-screen max-w-3xl transform px-4 sm:px-0">
              <div className="overflow-hidden rounded-xl shadow-xl ring-1 ring-black ring-opacity-5 bg-white">
                <div className="p-6 grid grid-cols-3 gap-8">
                  {category.category_children?.map((child) => (
                    <div key={child.id} className="space-y-3">
                      {/* Niveau 1 (Enfant direct) */}
                      <LocalizedClientLink
                        href={`/categories/${child.handle}`}
                        onClick={() => close()}
                        className="block text-base font-bold text-gray-900 hover:text-amber-600 transition-colors"
                      >
                        {child.name}
                      </LocalizedClientLink>

                      {/* Niveau 2 (Petit-enfant) */}
                      {child.category_children && child.category_children.length > 0 && (
                        <ul className="space-y-2">
                          {child.category_children.map((grandChild) => (
                            <li key={grandChild.id}>
                              <LocalizedClientLink
                                href={`/categories/${grandChild.handle}`}
                                onClick={() => close()}
                                className="text-sm text-gray-600 hover:text-amber-600 transition-colors block"
                              >
                                {grandChild.name}
                              </LocalizedClientLink>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Footer du menu */}
                <div className="bg-gray-50 p-4 border-t border-gray-100">
                  <LocalizedClientLink
                    href={`/categories/${category.handle}`}
                    onClick={() => close()}
                    className="flex items-center justify-center text-sm font-medium text-amber-600 hover:text-amber-700"
                  >
                    Voir tout {category.name} &rarr;
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

export default MegaMenu
