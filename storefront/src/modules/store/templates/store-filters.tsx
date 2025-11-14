"use client"

import { useState } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { HttpTypes } from "@medusajs/types"

type StoreFiltersProps = {
  collections: HttpTypes.StoreCollection[]
  categories: any[]
  currentSort: SortOptions
}

export default function StoreFilters({ 
  collections, 
  categories,
  currentSort 
}: StoreFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [priceMin, setPriceMin] = useState("")
  const [priceMax, setPriceMax] = useState("")
  
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Filtrer uniquement les catégories parentes
  const parentCategories = categories?.filter(cat => !cat.parent_category_id) || []

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    
    // Reset page to 1 when filtering
    params.delete('page')
    
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleSortChange = (newSort: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sortBy', newSort)
    router.push(`${pathname}?${params.toString()}`)
  }

  const handlePriceFilter = () => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (priceMin) params.set('price_min', priceMin)
    else params.delete('price_min')
    
    if (priceMax) params.set('price_max', priceMax)
    else params.delete('price_max')
    
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  const clearFilters = () => {
    setPriceMin("")
    setPriceMax("")
    router.push(pathname)
  }

  const activeFiltersCount = Array.from(searchParams.keys()).filter(
    key => !['sortBy', 'page'].includes(key)
  ).length

  return (
    <div className="mb-6 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Bouton Filtres */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filtres
          {activeFiltersCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-white text-amber-600 rounded-full">
              {activeFiltersCount}
            </span>
          )}
          <svg 
            className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Tri */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Trier par :</label>
          <select
            value={currentSort}
            onChange={(e) => handleSortChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white text-sm"
          >
            <option value="created_at">Nouveautés</option>
            <option value="price_asc">Prix croissant</option>
            <option value="price_desc">Prix décroissant</option>
            <option value="title_asc">Nom A-Z</option>
            <option value="title_desc">Nom Z-A</option>
          </select>
        </div>
      </div>

      {/* Panneau de filtres déroulant */}
      {showFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Filtre Marque (Collections) */}
            {collections && collections.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Marque
                </label>
                <select 
                  value={searchParams.get('collection_id') || ''}
                  onChange={(e) => handleFilterChange('collection_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="">Toutes les marques</option>
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filtre Prix */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Prix
              </label>
              <div className="flex gap-2 items-center">
                <input 
                  type="number" 
                  placeholder="Min" 
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
                <span className="text-gray-400">-</span>
                <input 
                  type="number" 
                  placeholder="Max" 
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
                <button
                  onClick={handlePriceFilter}
                  className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium whitespace-nowrap"
                >
                  OK
                </button>
              </div>
            </div>

            {/* Filtre Catégories */}
            {parentCategories && parentCategories.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Catégorie
                </label>
                <select 
                  value={searchParams.get('category_id') || ''}
                  onChange={(e) => handleFilterChange('category_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="">Toutes les catégories</option>
                  {parentCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Bouton Effacer les filtres */}
          {activeFiltersCount > 0 && (
            <div className="flex justify-center pt-2">
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 text-sm text-amber-600 hover:text-amber-700 font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Effacer tous les filtres
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

