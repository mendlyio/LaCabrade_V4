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
                      <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-pink-50">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg">
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
                                        className="flex-1 px-4 py-2 text-sm text-gray-700 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors font-medium"
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

                        {/* Quick Links */}
                        <div className="mt-8 pt-6 border-t border-gray-200">
                          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-4">
                            {t("nav.quick_links")}
                          </h3>
                          <ul className="space-y-2">
                            {[
                              { name: t("nav.service_client"), href: "/contact" },
                              { name: t("nav.shipping"), href: "/livraison" },
                              { name: t("nav.returns"), href: "/retours" },
                              { name: t("nav.faq"), href: "/faq" },
                            ].map((link) => (
                              <li key={link.name}>
                                <LocalizedClientLink
                                  href={link.href}
                                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:text-amber-600 transition-colors"
                                  onClick={close}
                                >
                                  <span>{link.name}</span>
                                </LocalizedClientLink>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </nav>

                      {/* Footer */}
                      <div className="border-t border-gray-200 bg-gray-50">
                        {/* Coordonnées - Contact */}
                        <div className="px-6 py-4 bg-gray-100 border-b border-gray-200">
                          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
                            Nous contacter
                          </h3>
                          <div className="space-y-2">
                            <a 
                              href="tel:+3243586099" 
                              className="flex items-center gap-3 text-sm text-gray-700 hover:text-amber-600 transition-colors group"
                            >
                              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                                <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                                </svg>
                              </div>
                              <span className="font-medium">+32 (0)4/358.60.99</span>
                            </a>
                            <a 
                              href="mailto:info@lacabrade.be" 
                              className="flex items-center gap-3 text-sm text-gray-700 hover:text-amber-600 transition-colors group"
                            >
                              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                                <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                                </svg>
                              </div>
                              <span className="font-medium">info@lacabrade.be</span>
                            </a>
                          </div>
                        </div>

                        {/* Country Select */}
                        <div className="px-6 py-4 border-b border-gray-200">
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

                        {/* Social Links */}
                        <div className="px-6 py-4">
                          <div className="flex items-center justify-center gap-3 mb-4">
                            <a
                              href="https://facebook.com"
                              target="_blank"
                              rel="noreferrer"
                              className="w-10 h-10 rounded-full bg-white border-2 border-gray-300 hover:border-amber-600 hover:bg-amber-50 flex items-center justify-center transition-all hover:scale-110"
                              aria-label="Facebook"
                            >
                              <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                              </svg>
                            </a>
                            <a
                              href="https://instagram.com"
                              target="_blank"
                              rel="noreferrer"
                              className="w-10 h-10 rounded-full bg-white border-2 border-gray-300 hover:border-amber-600 hover:bg-amber-50 flex items-center justify-center transition-all hover:scale-110"
                              aria-label="Instagram"
                            >
                              <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                              </svg>
                            </a>
                          </div>

                          <p className="text-xs text-gray-500 text-center">
                            © {new Date().getFullYear()} La Cabrade
                          </p>
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
