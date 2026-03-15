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
  const [mobileOpen, setMobileOpen] = useState(false)
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
    setSearchQuery(searchParams.get("q") || "")
  }, [searchParams])

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [mobileOpen])

  const activeFiltersCount = Array.from(searchParams.keys()).filter(
    (key) => !["sortBy", "page"].includes(key)
  ).length

  const handlePriceFilter = () => {
    updateFilters({
      price_min: priceRange.min || null,
      price_max: priceRange.max || null,
    })
  }

  const filterSections = (
    <>
      {/* Trier par */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
          </svg>
          Trier par
        </label>
        <select
          value={searchParams.get("sortBy") || "-created_at"}
          onChange={(e) => {
            const newSort = e.target.value === "-created_at" ? null : e.target.value
            updateFilters({ sortBy: newSort, page: null })
          }}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm bg-white appearance-none"
        >
          <option value="-created_at">Nouveautés</option>
          <option value="price_asc">Prix croissant</option>
          <option value="price_desc">Prix décroissant</option>
          <option value="title_asc">Nom A-Z</option>
          <option value="title_desc">Nom Z-A</option>
        </select>
      </div>

      {/* Recherche */}
      <div className="space-y-3">
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
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm"
        />
      </div>

      {/* Prix */}
      <div className="space-y-3">
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
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
          />
          <span className="text-gray-300 font-light">—</span>
          <input
            type="number"
            placeholder="Max"
            value={priceRange.max}
            onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
          />
        </div>
        <button
          onClick={handlePriceFilter}
          className="w-full px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl font-medium text-sm transition-colors"
        >
          Appliquer
        </button>
      </div>

      {/* Marques */}
      {brands.length > 0 && (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Marques
          </label>
          <div className="space-y-1.5">
            {brands.map((brand) => {
              const isActive = searchParams.get("brand") === brand.slug
              return (
                <button
                  key={brand.slug}
                  onClick={() => updateFilters({ brand: isActive ? null : brand.slug })}
                  className={`
                    w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all
                    ${isActive
                      ? "bg-amber-50 text-amber-700 font-semibold ring-1 ring-amber-300"
                      : "hover:bg-gray-50 text-gray-700"
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex-1">{brand.name}</span>
                    <span className="text-xs text-gray-400 mr-1">({brand.count})</span>
                    {isActive && (
                      <svg className="w-4 h-4 flex-shrink-0 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
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
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Disponibilité
        </label>
        <label className="flex items-center gap-3 cursor-pointer py-1.5">
          <input
            type="checkbox"
            checked={searchParams.get("in_stock") === "true"}
            onChange={(e) => updateFilters({ in_stock: e.target.checked ? "true" : null })}
            className="w-5 h-5 text-amber-600 border-gray-300 rounded-md focus:ring-amber-500"
          />
          <span className="text-sm text-gray-700">En stock uniquement</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer py-1.5">
          <input
            type="checkbox"
            checked={searchParams.get("on_sale") === "true"}
            onChange={(e) => updateFilters({ on_sale: e.target.checked ? "true" : null })}
            className="w-5 h-5 text-amber-600 border-gray-300 rounded-md focus:ring-amber-500"
          />
          <span className="text-sm text-gray-700">En promotion</span>
        </label>
      </div>
    </>
  )

  return (
    <>
      {/* ══════════ Desktop sidebar (lg+) ══════════ */}
      <div className="hidden lg:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden sticky top-24">
        <div className="bg-amber-600 px-6 py-4 border-b border-amber-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <h2 className="font-bold text-white text-base">
                Filtres
                {activeFiltersCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-amber-700 bg-white rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </h2>
            </div>
          </div>
          {activeFiltersCount > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); clearAllFilters() }}
              className="mt-3 text-sm text-white/90 hover:text-white font-medium flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Effacer tous les filtres
            </button>
          )}
        </div>
        <div className="p-6 space-y-6 divide-y divide-gray-100 [&>*:not(:first-child)]:pt-6">
          {filterSections}
        </div>
      </div>

      {/* ══════════ Mobile trigger button (< lg) ══════════ */}
      <div className="lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3.5 shadow-sm active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-600 flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900 text-sm">Filtres & tri</span>
            {activeFiltersCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-amber-600 rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* ══════════ Mobile fullscreen overlay ══════════ */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />

          {/* Panel */}
          <div className="absolute inset-0 flex flex-col bg-white animate-slide-in-left">
            {/* Header fixe */}
            <div className="flex-shrink-0 bg-amber-600 px-4 py-3.5 flex items-center justify-between safe-top">
              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <h2 className="font-bold text-white text-base">Filtres & tri</h2>
                {activeFiltersCount > 0 && (
                  <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-amber-700 bg-white rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/20 active:bg-white/30 transition-colors"
                aria-label="Fermer les filtres"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenu scrollable — pas de scrollbar visible */}
            <div className="flex-1 overflow-y-auto overscroll-contain no-scrollbar">
              <div className="px-5 py-5 space-y-6 divide-y divide-gray-100 [&>*:not(:first-child)]:pt-6">
                {filterSections}
              </div>
            </div>

            {/* Footer fixe */}
            <div className="flex-shrink-0 border-t border-gray-200 bg-white px-4 py-3.5 safe-bottom">
              <div className="flex gap-3">
                {activeFiltersCount > 0 && (
                  <button
                    onClick={() => { clearAllFilters(); setMobileOpen(false) }}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 active:bg-gray-50 transition-colors"
                  >
                    Tout effacer
                  </button>
                )}
                <button
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Voir les résultats
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
