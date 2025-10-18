"use client"

import { Fragment, useState } from "react"
import { Popover, Transition } from "@headlessui/react"
import { ChevronDown } from "@medusajs/icons"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"

type MegaMenuProps = {
  categories: any[]
  collections: HttpTypes.StoreCollection[]
}

const MegaMenu = ({ categories, collections }: MegaMenuProps) => {
  const [activeTab, setActiveTab] = useState<'categories' | 'collections'>('categories')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  // Organiser les catégories par parent
  const parentCategories = categories?.filter(cat => !cat.parent_category) || []

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
            <span>Catégories</span>
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
            <Popover.Panel className="absolute left-1/2 -translate-x-1/2 z-50 mt-3 w-screen max-w-4xl transform px-4">
              {({ close }) => (
                <div className="overflow-hidden rounded-2xl shadow-2xl ring-1 ring-black ring-opacity-5">
                  <div className="relative bg-white">
                    {/* Header du mega menu avec tabs */}
                    <div className="border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
                      <div className="flex items-center justify-between px-6 py-3">
                        <div className="flex gap-3">
                          <button
                            onClick={() => setActiveTab('categories')}
                            className={`
                              px-4 py-1.5 rounded-lg font-medium text-sm transition-all duration-200
                              ${activeTab === 'categories'
                                ? 'bg-white text-amber-600 shadow-md'
                                : 'text-gray-600 hover:text-amber-600'
                              }
                            `}
                          >
                            Catégories
                            <span className="ml-2 text-xs opacity-60">
                              ({parentCategories.length})
                            </span>
                          </button>
                          <button
                            onClick={() => setActiveTab('collections')}
                            className={`
                              px-4 py-1.5 rounded-lg font-medium text-sm transition-all duration-200
                              ${activeTab === 'collections'
                                ? 'bg-white text-amber-600 shadow-md'
                                : 'text-gray-600 hover:text-amber-600'
                              }
                            `}
                          >
                            Collections
                            <span className="ml-2 text-xs opacity-60">
                              ({collections.length})
                            </span>
                          </button>
                        </div>
                        <div className="text-xs text-gray-500">
                          <span>Découvrez nos nouveautés</span>
                        </div>
                      </div>
                    </div>

                    {/* Contenu du mega menu */}
                    <div className="px-6 py-6">
                      {activeTab === 'categories' ? (
                        <div className="grid grid-cols-4 gap-6">
                          {parentCategories.map((category) => {
                            const children = category.category_children || []
                            const isExpanded = expandedCategories.has(category.id)
                            
                            return (
                              <div
                                key={category.id}
                                className="group"
                              >
                                <div className="flex items-stretch gap-1">
                                  <LocalizedClientLink
                                    href={`/categories/${category.handle}`}
                                    onClick={() => close()}
                                    className="flex-1 block"
                                  >
                                    <div className="h-full flex items-center gap-2 p-3 rounded-lg bg-gradient-to-br from-gray-50 to-amber-50 group-hover:from-amber-100 group-hover:to-orange-100 transition-all duration-300 group-hover:shadow-md">
                                      <div className="flex-1">
                                        <h3 className="font-semibold text-sm text-gray-900 group-hover:text-amber-700 transition-colors">
                                          {category.name}
                                        </h3>
                                        {children.length > 0 && (
                                          <p className="text-[10px] text-gray-500">
                                            {children.length} sous-catégorie{children.length > 1 ? 's' : ''}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </LocalizedClientLink>
                                  
                                  {children.length > 0 && (
                                    <button
                                      onClick={() => {
                                        const newExpanded = new Set(expandedCategories)
                                        if (isExpanded) {
                                          newExpanded.delete(category.id)
                                        } else {
                                          newExpanded.add(category.id)
                                        }
                                        setExpandedCategories(newExpanded)
                                      }}
                                      className="px-2 rounded-lg bg-gray-100 hover:bg-amber-100 transition-colors flex items-center"
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
                                  <ul className="space-y-1 ml-2 mt-2 overflow-hidden">
                                    {children.map((child: any) => (
                                      <li key={child.id} className="animate-fade-in">
                                        <LocalizedClientLink
                                          href={`/categories/${child.handle}`}
                                          onClick={() => close()}
                                          className="text-xs text-gray-600 hover:text-amber-600 hover:translate-x-1 transition-all duration-200 flex items-center gap-1.5 group/child py-1"
                                        >
                                          <span className="w-1 h-1 rounded-full bg-gray-300 group-hover/child:bg-amber-500 transition-colors"></span>
                                          {child.name}
                                        </LocalizedClientLink>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-4">
                          {collections.map((collection) => (
                            <LocalizedClientLink
                              key={collection.id}
                              href={`/collections/${collection.handle}`}
                              onClick={() => close()}
                              className="group block"
                            >
                              <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-gray-100 to-amber-50 p-4 h-28 flex items-end transition-all duration-300 group-hover:shadow-lg group-hover:scale-105">
                                {/* Pattern de fond décoratif */}
                                <div className="absolute inset-0 opacity-10">
                                  <div className="absolute inset-0" style={{
                                    backgroundImage: 'radial-gradient(circle, #f59e0b 1px, transparent 1px)',
                                    backgroundSize: '16px 16px'
                                  }}></div>
                                </div>
                                
                                <div className="relative z-10 w-full">
                                  <h3 className="font-semibold text-sm text-gray-900 group-hover:text-amber-700 transition-colors mb-1">
                                    {collection.title}
                                  </h3>
                                  {collection.metadata?.description && (
                                    <p className="text-xs text-gray-600 line-clamp-1">
                                      {collection.metadata.description as string}
                                    </p>
                                  )}
                                  <div className="mt-1 inline-flex items-center text-xs font-medium text-amber-600 group-hover:text-amber-700">
                                    Découvrir
                                    <span className="ml-1 transform group-hover:translate-x-1 transition-transform">
                                      →
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </LocalizedClientLink>
                          ))}

                          {collections.length === 0 && (
                            <div className="col-span-4 text-center py-8 text-gray-500">
                              <p className="text-sm">Aucune collection disponible pour le moment</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Footer du mega menu avec CTA */}
                    <div className="border-t border-gray-200 bg-gradient-to-r from-gray-50 to-amber-50 px-6 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <span className="text-green-500">✓</span>
                            Conseils d&apos;experts
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="text-green-500">✓</span>
                            Livraison rapide
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="text-green-500">✓</span>
                            Satisfait ou remboursé
                          </span>
                        </div>
                        <LocalizedClientLink
                          href="/nouveautes"
                          onClick={() => close()}
                          className="text-sm font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1"
                        >
                          Voir les nouveautés
                        </LocalizedClientLink>
                      </div>
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

export default MegaMenu

