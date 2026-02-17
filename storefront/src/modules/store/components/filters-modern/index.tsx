"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { Brand } from "@lib/data/brands"

type FiltersModernProps = {
  categories?: any[]
  brands: Brand[]
}

export default function FiltersModern({ brands }: FiltersModernProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const [priceRange, setPriceRange] = useState({ min: "", max: "" })
  const [showFilters, setShowFilters] = useState(false) // Fermé par défaut sur mobile
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "")
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const createQueryString = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      })
      
      return params.toString()
    },
    [searchParams]
  )

  const updateFilters = (updates: Record<string, string | null>) => {
    const query = createQueryString(updates)
    router.push(`${pathname}${query ? `?${query}` : ""}`, { scroll: false })
  }

  const clearAllFilters = () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
      searchTimeoutRef.current = null
    }
    router.push(pathname, { scroll: false })
    setPriceRange({ min: "", max: "" })
    setSearchQuery("")
  }
  useEffect(() => {
    const nextQuery = searchParams.get("q") || ""
    setSearchQuery(nextQuery)
  }, [searchParams])


  const activeFiltersCount = Array.from(searchParams.keys()).filter(
    key => !['sortBy', 'page'].includes(key)
  ).length

  const handlePriceFilter = () => {
    updateFilters({
      price_min: priceRange.min || null,
      price_max: priceRange.max || null,
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden sticky top-24">
      {/* Header — cliquable sur mobile pour toggle */}
      <div
        className="bg-amber-600 px-4 py-3 lg:px-6 lg:py-4 border-b border-amber-500 cursor-pointer lg:cursor-default"
        onClick={() => setShowFilters(!showFilters)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 lg:gap-3">
            <svg className="w-4 h-4 lg:w-5 lg:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <h2 className="font-bold text-white text-sm lg:text-base">
              <span className="lg:hidden">Filtres & catégories</span>
              <span className="hidden lg:inline">Filtres</span>
              {activeFiltersCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 lg:w-6 lg:h-6 text-[10px] lg:text-xs font-bold text-amber-700 bg-white rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </h2>
          </div>
          <div className="lg:hidden p-1 text-white">
            <svg className={`w-5 h-5 transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        
        {activeFiltersCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="mt-3 text-sm text-white/90 hover:text-white font-medium flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Effacer tous les filtres
          </button>
        )}
      </div>

      {/* Filters Content */}
      <div className={`p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto lg:block ${showFilters ? 'block' : 'hidden'}`}>
          {/* Trier par */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              Trier par
            </label>
            <select
              value={searchParams.get('sortBy') || '-created_at'}
              onChange={(e) => updateFilters({ sortBy: e.target.value === '-created_at' ? null : e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm bg-white"
            >
              <option value="-created_at">Nouveautés</option>
              <option value="price_asc">Prix croissant</option>
              <option value="price_desc">Prix décroissant</option>
              <option value="title_asc">Nom A-Z</option>
              <option value="title_desc">Nom Z-A</option>
            </select>
          </div>

          {/* Recherche instantanée */}
          <div className="space-y-3 pt-6 border-t border-gray-200">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Recherche
            </label>
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChange={(e) => {
                const nextValue = e.target.value
                setSearchQuery(nextValue)
                if (searchTimeoutRef.current) {
                  clearTimeout(searchTimeoutRef.current)
                }
                searchTimeoutRef.current = setTimeout(() => {
                  updateFilters({ q: nextValue || null })
                }, 500)
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm"
            />
          </div>

          {/* Prix */}
          <div className="space-y-3 pt-6 border-t border-gray-200">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Fourchette de prix
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                value={priceRange.min}
                onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
              />
              <span className="text-gray-400">-</span>
              <input
                type="number"
                placeholder="Max"
                value={priceRange.max}
                onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
              />
            </div>
            <button
              onClick={handlePriceFilter}
              className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-sm transition-colors"
            >
              Appliquer
            </button>
          </div>

          {/* Marques */}
          {brands.length > 0 && (
            <div className="space-y-3 pt-6 border-t border-gray-200">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Marques
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {brands.map((brand) => {
                  const isActive = searchParams.get('brand') === brand.slug
                  return (
                    <button
                      key={brand.slug}
                      onClick={() => updateFilters({ brand: isActive ? null : brand.slug })}
                      className={`
                        w-full text-left px-3 py-2 rounded-lg text-sm transition-all
                        ${isActive
                          ? 'bg-amber-100 text-amber-700 font-semibold border border-amber-300'
                          : 'hover:bg-gray-50 text-gray-700 border border-transparent'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex-1">{brand.name}</span>
                        <span className="text-xs text-gray-400 mr-1">({brand.count})</span>
                        {isActive && (
                          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Disponibilité */}
          <div className="space-y-3 pt-6 border-t border-gray-200">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Disponibilité
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={searchParams.get('in_stock') === 'true'}
                onChange={(e) => updateFilters({ in_stock: e.target.checked ? 'true' : null })}
                className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
              />
              <span className="text-sm text-gray-700 group-hover:text-amber-600 transition-colors">
                En stock uniquement
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={searchParams.get('on_sale') === 'true'}
                onChange={(e) => updateFilters({ on_sale: e.target.checked ? 'true' : null })}
                className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
              />
              <span className="text-sm text-gray-700 group-hover:text-amber-600 transition-colors">
                En promotion
              </span>
            </label>
          </div>

        </div>
    </div>
  )
}



