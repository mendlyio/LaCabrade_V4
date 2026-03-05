"use client"

import { Fragment, useState, useRef, useEffect } from "react"
import { ChevronDown } from "@medusajs/icons"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"

type MegaMenuProps = {
  category: HttpTypes.StoreProductCategory
}

const MegaMenu = ({ category }: MegaMenuProps) => {
  const hasChildren = category.category_children && category.category_children.length > 0
  const [open, setOpen] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setOpen(true)
  }

  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150)
  }

  const [panelTop, setPanelTop] = useState(160)

  // Calculer la position top du panel en dessous du nav
  useEffect(() => {
    if (!open || !containerRef.current) return
    const nav = containerRef.current.closest(".mega-menu-nav")
    if (nav) {
      const rect = nav.getBoundingClientRect()
      setPanelTop(rect.bottom)
    }
  }, [open])

  // Fermer si clic en dehors
  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  const isOutlet = category.handle === "outlet"

  if (!hasChildren) {
    return (
      <LocalizedClientLink
        href={`/categories/${encodeURIComponent(category.handle)}`}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
          isOutlet 
            ? "text-[#c4707f] hover:text-white hover:bg-[#c4707f]" 
            : "text-gray-700 hover:text-white hover:bg-amber-600"
        }`}
      >
        {category.name}
      </LocalizedClientLink>
    )
  }

  // Grouper les enfants en colonnes de max 8 éléments pour un layout équilibré
  const children = category.category_children || []
  const columnCount = children.length <= 3 ? children.length : children.length <= 6 ? 3 : 4

  return (
    <div
      ref={containerRef}
      className="static"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {/* Lien vers la page catégorie — clic = navigation */}
      <LocalizedClientLink
        href={`/categories/${encodeURIComponent(category.handle)}`}
        className={`
          flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium
          transition-all duration-200 whitespace-nowrap
          ${isOutlet
            ? (open 
                ? 'text-white bg-[#c4707f] shadow-sm' 
                : 'text-[#c4707f] hover:text-white hover:bg-[#c4707f]')
            : (open 
                ? 'text-white bg-amber-600 shadow-sm' 
                : 'text-gray-700 hover:text-white hover:bg-amber-600')
          }
        `}
      >
        <span>{category.name}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 flex-shrink-0 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </LocalizedClientLink>

      {/* Overlay fond sombre */}
      {open && (
        <div
          className="fixed inset-0 z-[55] bg-black/20"
          style={{ top: `${panelTop}px` }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Dropdown Panel — positionné en fixed pour ne jamais sortir */}
      {open && (
        <div
          className="fixed left-0 right-0 z-[60]"
          style={{ top: `${panelTop}px` }}
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
        >
          <div className="max-w-7xl mx-auto px-4">
            <div className="bg-white rounded-b-2xl shadow-2xl ring-1 ring-black/10 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                  {category.name}
                </h3>
                <LocalizedClientLink
                  href={`/categories/${encodeURIComponent(category.handle)}`}
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-2 rounded-full bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
                >
                  Tout voir
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </LocalizedClientLink>
              </div>

              {/* Contenu grille */}
              <div className="max-h-[65vh] overflow-y-auto p-6">
                <div
                  className="grid gap-x-8 gap-y-6"
                  style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
                >
                  {children.map((child) => (
                    <div key={child.id} className="min-w-0">
                      {/* Sous-catégorie parent */}
                      <LocalizedClientLink
                        href={`/categories/${encodeURIComponent(child.handle)}`}
                        onClick={() => setOpen(false)}
                        className="group flex items-center gap-2 mb-3 pb-2 border-b-2 border-gray-300 hover:border-amber-500 transition-colors rounded px-2 py-1 -mx-2 -mt-1 bg-gray-50 hover:bg-amber-50"
                      >
                        <span className="text-sm font-bold text-gray-900 group-hover:text-amber-700 transition-colors truncate">
                          {child.name}
                        </span>
                      </LocalizedClientLink>

                      {/* Enfants de niveau 3 */}
                      {child.category_children && child.category_children.length > 0 && (
                        <ul className="space-y-0.5">
                          {child.category_children.map((grandChild) => (
                            <li key={grandChild.id}>
                              <LocalizedClientLink
                                href={`/categories/${encodeURIComponent(grandChild.handle)}`}
                                onClick={() => setOpen(false)}
                                className="group/item flex items-center py-1.5 px-2 rounded-md text-sm text-gray-700 hover:text-white hover:bg-amber-600 transition-all"
                              >
                                <span className="truncate">{grandChild.name}</span>
                              </LocalizedClientLink>

                              {/* Enfants de niveau 4 */}
                              {grandChild.category_children && grandChild.category_children.length > 0 && (
                                <ul className="ml-5 mt-0.5 space-y-0.5">
                                  {grandChild.category_children.map((greatGrandChild) => (
                                    <li key={greatGrandChild.id}>
                                      <LocalizedClientLink
                                        href={`/categories/${encodeURIComponent(greatGrandChild.handle)}`}
                                        onClick={() => setOpen(false)}
                                        className="block py-1 px-2 rounded text-xs text-gray-500 hover:text-white hover:bg-amber-500 transition-all truncate"
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
          </div>
        </div>
      )}
    </div>
  )
}

export default MegaMenu
