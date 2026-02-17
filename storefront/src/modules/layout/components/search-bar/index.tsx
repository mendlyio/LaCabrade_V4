"use client"

import { useState, useEffect, useRef } from "react"
import { MagnifyingGlass, XMark } from "@medusajs/icons"
import { useParams, useRouter } from "next/navigation"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

// Suggestions populaires pour une boutique équestre
const popularSearches = [
  "Selles de dressage",
  "Bottes d'équitation",
  "Tapis de selle",
  "Mors",
  "Licols",
  "Protections cheval",
  "Bombes équitation",
  "Éperons",
]

const SearchBar = () => {
  const [query, setQuery] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const router = useRouter()
  const { countryCode } = useParams()
  const searchRef = useRef<HTMLDivElement>(null)

  // Gérer les clics en dehors du composant
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsFocused(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Simuler l'autocomplete (à remplacer par une vraie API)
  useEffect(() => {
    if (query.length > 0) {
      const filtered = popularSearches.filter((search) =>
        search.toLowerCase().includes(query.toLowerCase())
      )
      setSuggestions(filtered)
    } else {
      setSuggestions([])
    }
  }, [query])

  const handleSearch = (searchQuery: string) => {
    if (searchQuery.trim()) {
      // Utiliser le store avec un filtre de recherche au lieu d'une page dédiée
      const basePath = countryCode ? `/${countryCode}/store` : "/store"
      router.push(`${basePath}?q=${encodeURIComponent(searchQuery.trim())}`)
      setIsFocused(false)
      setQuery("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) =>
        prev < (suggestions.length > 0 ? suggestions : popularSearches).length - 1
          ? prev + 1
          : prev
      )
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (selectedIndex >= 0) {
        const items = suggestions.length > 0 ? suggestions : popularSearches
        handleSearch(items[selectedIndex])
      } else {
        handleSearch(query)
      }
    } else if (e.key === "Escape") {
      setIsFocused(false)
      setSelectedIndex(-1)
    }
  }

  return (
    <div ref={searchRef} className="relative w-full">
      {/* Champ de recherche - Version ultra visible */}
      <div
        className={`
          relative flex items-center bg-white rounded-xl border transition-all duration-200
          ${isFocused 
            ? 'border-gray-400 shadow-xl ring-4 ring-gray-100' 
            : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
          }
        `}
      >
        <MagnifyingGlass
          className={`absolute left-4 w-5 h-5 transition-colors ${
            isFocused ? "text-gray-700" : "text-gray-500"
          }`}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Recherche"
          className="w-full pl-12 pr-12 py-3 bg-transparent text-base font-medium text-gray-900 placeholder-gray-500 focus:outline-none"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 p-0.5 hover:bg-gray-200 rounded-full transition-colors"
            aria-label="Effacer"
          >
            <XMark className="w-3.5 h-3.5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Dropdown des suggestions */}
      {isFocused && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden z-50 animate-fade-in max-h-[500px] overflow-y-auto">
          {/* Recherches récentes ou populaires */}
          {suggestions.length === 0 && query === "" && (
            <div className="p-4">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                </svg>
                Recherches populaires
              </h3>
              <ul className="space-y-1">
                {popularSearches.map((search, index) => (
                  <li key={search}>
                    <button
                      onClick={() => handleSearch(search)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`
                        w-full text-left px-3 py-2 rounded-md text-sm transition-all duration-150
                        flex items-center gap-2 group
                        ${selectedIndex === index 
                          ? 'bg-gray-100 text-gray-900' 
                          : 'text-gray-700 hover:bg-gray-50'
                        }
                      `}
                    >
                      <MagnifyingGlass className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                      <span className="flex-1">{search}</span>
                      <svg className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Résultats de l'autocomplete */}
          {suggestions.length > 0 && query !== "" && (
            <div className="p-4">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                </svg>
                Suggestions
              </h3>
              <ul className="space-y-1">
                {suggestions.map((suggestion, index) => (
                  <li key={suggestion}>
                    <button
                      onClick={() => handleSearch(suggestion)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`
                        w-full text-left px-3 py-2 rounded-md text-sm transition-all duration-150
                        flex items-center gap-2 group
                        ${selectedIndex === index 
                          ? 'bg-gray-100 text-gray-900' 
                          : 'text-gray-700 hover:bg-gray-50'
                        }
                      `}
                    >
                      <MagnifyingGlass className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                      <span className="flex-1">
                        {suggestion.split(new RegExp(`(${query})`, 'gi')).map((part, i) =>
                          part.toLowerCase() === query.toLowerCase() ? (
                            <mark key={i} className="bg-gray-200 text-gray-900 font-medium rounded px-1">
                              {part}
                            </mark>
                          ) : (
                            part
                          )
                        )}
                      </span>
                      <svg className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Aucun résultat */}
          {suggestions.length === 0 && query !== "" && (
            <div className="p-8 text-center">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-sm text-gray-600 mb-4">
                Aucune suggestion pour &quot;{query}&quot;
              </p>
              <button
                onClick={() => handleSearch(query)}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Rechercher quand même
              </button>
            </div>
          )}

          {/* Footer avec raccourcis */}
          <div className="border-t border-gray-200 bg-gray-50 px-4 py-2.5">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded text-[10px] font-mono">
                    ↑↓
                  </kbd>
                  <span>Navigation</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded text-[10px] font-mono">
                    ↵
                  </kbd>
                  <span>Valider</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded text-[10px] font-mono">
                    ESC
                  </kbd>
                  <span>Fermer</span>
                </span>
              </div>
              <LocalizedClientLink
                href="/store"
                className="text-amber-600 hover:text-amber-700 font-medium text-xs"
              >
                Voir tous les produits →
              </LocalizedClientLink>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SearchBar

