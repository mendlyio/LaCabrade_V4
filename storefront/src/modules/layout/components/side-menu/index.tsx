"use client"

import { Popover, Transition } from "@headlessui/react"
import { XMark, ChevronDown } from "@medusajs/icons"
import { useToggleState } from "@medusajs/ui"
import { Fragment, useState } from "react"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CountrySelect from "../country-select"
import { HttpTypes } from "@medusajs/types"
import { useTranslate } from "@lib/context/language-context"
import { Brand } from "@lib/data/brands"
import { buildCategoryTree } from "@lib/util/category-tree"

// Items principaux (non catégories) - les clés de traduction
const SideMenuItemsKeys = [
  { key: "nav.accueil", href: "/" },
  { key: "nav.nouveautes", href: "/nouveautes", badge: "NEW" },
  { key: "nav.bon_cadeau", href: "/bon-cadeau" },
  { key: "nav.marques", href: "/marques" },
  { key: "nav.a_propos", href: "/a-propos" },
]

type SideMenuProps = {
  regions: HttpTypes.StoreRegion[] | null
  categories?: any[]
  brands?: Brand[]
}

const SideMenu = ({ regions, categories = [], brands = [] }: SideMenuProps) => {
  const toggleState = useToggleState()
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const t = useTranslate()
  
  const { roots } = buildCategoryTree(categories)
  const parentCategories = roots.filter((cat) => (cat as any).is_active !== false)

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  return (
    <div className="h-full">
      <div className="flex items-center h-full">
        <Popover className="h-full flex">
          {({ open, close }) => (
            <>
              <div className="relative flex h-full">
                <Popover.Button
                  data-testid="nav-menu-button"
                  className="relative h-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 focus:outline-none hover:bg-amber-50 hover:text-amber-600"
                >
                  <div className="flex flex-col gap-1">
                    <span className={`w-5 h-0.5 bg-current transition-all duration-300 ${open ? 'rotate-45 translate-y-1.5' : ''}`}></span>
                    <span className={`w-5 h-0.5 bg-current transition-all duration-300 ${open ? 'opacity-0' : ''}`}></span>
                    <span className={`w-5 h-0.5 bg-current transition-all duration-300 ${open ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
                  </div>
                  <span className="text-sm font-medium">{t("nav.menu")}</span>
                </Popover.Button>
              </div>

              <Transition
                show={open}
                as={Fragment}
                enter="transition ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100 backdrop-blur-sm"
                leave="transition ease-in duration-200"
                leaveFrom="opacity-100 backdrop-blur-sm"
                leaveTo="opacity-0"
              >
                <Popover.Panel className="fixed inset-0 z-40 lg:hidden">
                  {/* Overlay */}
                  <div 
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={close}
                  />
                  
                  {/* Menu Panel */}
                  <div className="absolute left-0 top-0 bottom-0 w-[85%] max-w-sm bg-white shadow-2xl animate-slide-in-left">
                    <div className="flex flex-col h-full">
                      {/* Header */}
                      <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-amber-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            LC
                          </div>
                          <div>
                            <h2 className="text-lg font-bold text-gray-900">La Cabrade</h2>
                          <p className="text-xs text-gray-600">{t("nav.menu")}</p>
                          </div>
                        </div>
                        <button
                          onClick={close}
                          data-testid="close-menu-button"
                          className="p-2 hover:bg-white rounded-full transition-colors"
                          aria-label="Fermer le menu"
                        >
                          <XMark className="w-6 h-6" />
                        </button>
                      </div>

                      {/* Raccourcis Profil & Wishlist */}
                      <div className="flex border-b border-gray-200">
                        <LocalizedClientLink
                          href="/account"
                          className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-gray-700 hover:text-amber-600 hover:bg-amber-50 transition-colors border-r border-gray-200"
                          onClick={close}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Mon compte
                        </LocalizedClientLink>
                        <LocalizedClientLink
                          href="/wishlist"
                          className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-gray-700 hover:text-red-500 hover:bg-red-50 transition-colors"
                          onClick={close}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          Favoris
                        </LocalizedClientLink>
                      </div>

                      {/* Menu Items */}
                      <nav className="flex-1 overflow-y-auto custom-scrollbar p-6">
                        <ul className="space-y-2">
                          {SideMenuItemsKeys.map((item) => (
                            <li key={item.key}>
                              <LocalizedClientLink
                                href={item.href}
                                className="flex items-center gap-4 px-4 py-3 rounded-xl text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-all duration-200 group relative"
                                onClick={close}
                                data-testid={`${item.key.toLowerCase()}-link`}
                              >
                                <span className="text-base font-medium flex-1">
                                  {t(item.key as any)}
                                </span>
                                {item.badge && (
                                  <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full font-bold">
                                    {item.badge}
                                  </span>
                                )}
                                <span className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                  →
                                </span>
                              </LocalizedClientLink>
                            </li>
                          ))}
                        </ul>

                        {/* Categories Section */}
                        {parentCategories.length > 0 && (
                          <div className="mt-8 pt-6 border-t border-gray-200">
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-4">
                              {t("nav.categories")}
                            </h3>
                            <ul className="space-y-2">
                              {parentCategories.map((category) => {
                                const children = category.category_children || []
                                const isExpanded = expandedCategories.has(category.id)
                                
                                return (
                                  <li key={category.id}>
                                    <div className="flex items-center gap-2">
                                      <LocalizedClientLink
                                        href={`/categories/${category.handle}`}
                                        className={`flex-1 px-4 py-2 text-sm rounded-lg transition-colors font-medium ${
                                          category.handle === "outlet"
                                            ? "text-[#c4707f] hover:text-[#9e354a] hover:bg-[#c4707f]/10"
                                            : "text-gray-700 hover:text-amber-600 hover:bg-amber-50"
                                        }`}
                                        onClick={close}
                                      >
                                        {category.name}
                                      </LocalizedClientLink>
                                      
                                      {children.length > 0 && (
                                        <button
                                          onClick={() => toggleCategory(category.id)}
                                          className="mr-2 p-2 rounded-lg hover:bg-amber-50 transition-colors"
                                          aria-label={isExpanded ? "Masquer les sous-catégories" : "Afficher les sous-catégories"}
                                        >
                                          <ChevronDown
                                            className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${
                                              isExpanded ? 'rotate-180' : ''
                                            }`}
                                          />
                                        </button>
                                      )}
                                    </div>
                                    
                                    {children.length > 0 && isExpanded && (
                                      <ul className="ml-6 mt-2 space-y-2 border-l-2 border-amber-200 pl-3">
                                        {children.map((child: any) => (
                                          <li key={child.id} className="space-y-1">
                                            <LocalizedClientLink
                                              href={`/categories/${child.handle}`}
                                              className="block px-2 py-1 text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors"
                                              onClick={close}
                                            >
                                              {child.name}
                                            </LocalizedClientLink>
                                            {child.category_children?.length > 0 && (
                                              <ul className="ml-3 mt-1 space-y-1 border-l border-gray-200 pl-3">
                                                {child.category_children.map((grandChild: any) => (
                                                  <li key={grandChild.id}>
                                                    <LocalizedClientLink
                                                      href={`/categories/${grandChild.handle}`}
                                                      className="block px-2 py-1 text-xs text-gray-600 hover:text-amber-600 transition-colors"
                                                      onClick={close}
                                                    >
                                                      {grandChild.name}
                                                    </LocalizedClientLink>
                                                    {grandChild.category_children?.length > 0 && (
                                                      <ul className="ml-3 mt-1 space-y-1 border-l border-gray-100 pl-3">
                                                        {grandChild.category_children.map((greatGrandChild: any) => (
                                                          <li key={greatGrandChild.id}>
                                                            <LocalizedClientLink
                                                              href={`/categories/${greatGrandChild.handle}`}
                                                              className="block px-2 py-1 text-xs text-gray-500 hover:text-amber-600 transition-colors"
                                                              onClick={close}
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
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        )}

                        {/* Brands Section */}
                        {brands.length > 0 && (
                          <div className="mt-8 pt-6 border-t border-gray-200">
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-4">
                              {t("nav.marques")}
                            </h3>
                            <ul className="space-y-2 max-h-64 overflow-y-auto pr-2">
                              {brands.map((brand) => (
                                <li key={brand.slug}>
                                  <LocalizedClientLink
                                    href={`/marques/${brand.slug}`}
                                    className="block px-4 py-2 text-sm text-gray-700 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                    onClick={close}
                                  >
                                    {brand.name}
                                  </LocalizedClientLink>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Contact */}
                        <div className="mt-8 pt-6 border-t border-gray-200">
                          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-4">
                            Contact
                          </h3>
                          <ul className="space-y-2">
                            <li>
                              <a
                                href="tel:+3243586099"
                                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:text-amber-600 transition-colors"
                              >
                                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                                </svg>
                                <span>+32 (0)4/358.60.99</span>
                              </a>
                            </li>
                            <li>
                              <a
                                href="mailto:contact@sellerielacabrade.be"
                                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:text-amber-600 transition-colors"
                              >
                                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                                </svg>
                                <span>contact@sellerielacabrade.be</span>
                              </a>
                            </li>
                          </ul>
                        </div>
                      </nav>

                      {/* Footer — compact */}
                      <div className="border-t border-gray-200 bg-gray-50">
                        {/* Country Select */}
                        <div className="px-6 py-3">
                          <div
                            onMouseEnter={toggleState.open}
                            onMouseLeave={toggleState.close}
                          >
                            {regions && (
                              <CountrySelect
                                toggleState={toggleState}
                                regions={regions}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Popover.Panel>
              </Transition>
            </>
          )}
        </Popover>
      </div>
    </div>
  )
}

export default SideMenu
