"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { XMark } from "@medusajs/icons"
import Image from "next/image"

const RECENT_SEARCHES_KEY = "lc_recent_searches"
const MAX_RECENT = 5

const POPULAR_CATEGORIES = [
  { label: "Équitation", query: "équitation" },
  { label: "Selles", query: "selle" },
  { label: "Bottes", query: "bottes" },
  { label: "Gants", query: "gants" },
  { label: "Tapis", query: "tapis de selle" },
  { label: "Protections", query: "protections" },
  { label: "Mors", query: "mors" },
  { label: "Licols", query: "licol" },
]

type ProductSuggestion = {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  collection: string | null
  minPrice: number | null
  currency: string
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return <span>{text}</span>
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-amber-100/80 text-amber-900 font-semibold rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

export default function SearchModal() {
  const router = useRouter()
  const { countryCode } = useParams()
  const cc = typeof countryCode === "string" ? countryCode : "fr"

  const [query, setQuery] = useState("")
  const [products, setProducts] = useState<ProductSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [mounted, setMounted] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Animation d'entrée
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(t)
  }, [])

  // Focus auto sur l'input
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [])

  // Bloquer le scroll
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])

  // Charger les recherches récentes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
      if (stored) setRecentSearches(JSON.parse(stored))
    } catch {}
  }, [])

  // Touche Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.back()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [router])

  const saveRecentSearch = useCallback((term: string) => {
    const trimmed = term.trim()
    if (!trimmed) return
    setRecentSearches((prev) => {
      const updated = [trimmed, ...prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX_RECENT)
      try { localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated)) } catch {}
      return updated
    })
  }, [])

  const handleSearch = useCallback((searchQuery: string) => {
    const trimmed = searchQuery.trim()
    if (!trimmed) return
    saveRecentSearch(trimmed)
    const basePath = cc ? `/${cc}/store` : "/store"
    router.push(`${basePath}?q=${encodeURIComponent(trimmed)}`)
  }, [cc, router, saveRecentSearch])

  const handleProductClick = useCallback((handle: string) => {
    saveRecentSearch(query)
    router.push(`${cc ? `/${cc}` : ""}/products/${handle}`)
  }, [cc, query, router, saveRecentSearch])

  // Recherche dynamique
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (abortRef.current) abortRef.current.abort()

    if (!query.trim() || query.trim().length < 2) {
      setProducts([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim())}&countryCode=${cc}&limit=8`,
          { signal: controller.signal }
        )
        if (res.ok) {
          const data = await res.json()
          setProducts(data.products || [])
        }
      } catch (e: any) {
        if (e.name !== "AbortError") setProducts([])
      } finally {
        setIsLoading(false)
      }
    }, 150)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, cc])

  const hasQuery = query.trim().length >= 2
  const showProducts = hasQuery && products.length > 0
  const showNoResult = hasQuery && !isLoading && products.length === 0

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, products.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, -1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (selectedIndex >= 0 && products[selectedIndex]) {
        handleProductClick(products[selectedIndex].handle)
      } else {
        handleSearch(query)
      }
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${mounted ? "opacity-100" : "opacity-0"}`}
        onClick={() => router.back()}
      />

      {/* Panel */}
      <div
        className={`
          relative z-10 mx-auto w-full max-w-2xl mt-[8vh] px-4
          transition-all duration-300
          ${mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}
        `}
      >
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Input header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              data-testid="search-input"
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedIndex(-1) }}
              onKeyDown={handleKeyDown}
              placeholder="Que recherchez-vous ?"
              className="flex-1 text-lg font-medium text-gray-900 placeholder-gray-300 focus:outline-none bg-transparent"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {isLoading && (
              <svg className="animate-spin w-5 h-5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {query && !isLoading && (
              <button
                onClick={() => { setQuery(""); setProducts([]); inputRef.current?.focus() }}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              >
                <XMark className="w-4 h-4 text-gray-400" />
              </button>
            )}
            <button
              onClick={() => router.back()}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors font-medium flex-shrink-0"
            >
              Annuler
            </button>
          </div>

          {/* Résultats produits */}
          {showProducts && (
            <div className="max-h-[60vh] overflow-y-auto" data-testid="search-results">
              <div className="px-4 py-3">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest px-1 mb-3">
                  {products.length} résultat{products.length > 1 ? "s" : ""}
                </p>
                <div className="space-y-0.5">
                  {products.map((product, i) => (
                    <button
                      key={product.id}
                      data-testid="search-result"
                      onClick={() => handleProductClick(product.handle)}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={`
                        w-full flex items-center gap-4 p-3 rounded-2xl transition-all text-left group
                        ${selectedIndex === i ? "bg-gray-50" : "hover:bg-gray-50"}
                      `}
                    >
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 ring-1 ring-gray-200/80">
                        {product.thumbnail ? (
                          <Image
                            src={product.thumbnail}
                            alt={product.title}
                            width={56}
                            height={56}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {highlightMatch(product.title, query)}
                        </p>
                        {product.collection && (
                          <p className="text-xs text-gray-400 mt-0.5">{product.collection}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {product.minPrice != null && (
                          <span className="text-sm font-bold text-gray-900">
                            {formatPrice(product.minPrice, product.currency)}
                          </span>
                        )}
                        <span className="text-[11px] text-gray-400 group-hover:text-amber-600 transition-colors">
                          Voir →
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* CTA voir tous */}
                <button
                  onClick={() => handleSearch(query)}
                  className="w-full mt-3 px-4 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl text-sm font-semibold transition-colors flex items-center justify-between group"
                >
                  <span>Voir tous les résultats pour &ldquo;{query}&rdquo;</span>
                  <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Aucun résultat */}
          {showNoResult && (
            <div className="px-6 py-10 text-center">
              <div className="w-16 h-16 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-base font-semibold text-gray-800 mb-1">
                Aucun produit pour &ldquo;{query}&rdquo;
              </p>
              <p className="text-sm text-gray-400 mb-5">
                Essayez d&rsquo;autres mots-clés ou parcourez nos catégories
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {POPULAR_CATEGORIES.slice(0, 4).map(({ label, query: q }) => (
                  <button
                    key={label}
                    onClick={() => handleSearch(q)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-full transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* État vide — affichage par défaut */}
          {!hasQuery && (
            <div className="px-4 py-4 max-h-[60vh] overflow-y-auto">
              {/* Recherches récentes */}
              {recentSearches.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center justify-between px-1 mb-2">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
                      Récents
                    </p>
                    <button
                      onClick={() => {
                        setRecentSearches([])
                        try { localStorage.removeItem(RECENT_SEARCHES_KEY) } catch {}
                      }}
                      className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Effacer
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    {recentSearches.map((term) => (
                      <button
                        key={term}
                        onClick={() => handleSearch(term)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left group"
                      >
                        <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </span>
                        <span className="flex-1 text-sm text-gray-700">{term}</span>
                        <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Catégories rapides */}
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest px-1 mb-3">
                  Catégories populaires
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {POPULAR_CATEGORIES.map(({ label, query: q }) => (
                    <button
                      key={label}
                      onClick={() => handleSearch(q)}
                      className="flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-2xl text-sm font-medium text-gray-700 transition-colors text-left group"
                    >
                      <span className="flex-1">{label}</span>
                      <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Raccourcis clavier */}
        <div className="flex justify-center gap-5 mt-3 text-[11px] text-white/60">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] font-mono">↑↓</kbd>
            Naviguer
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] font-mono">↵</kbd>
            Sélectionner
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] font-mono">ESC</kbd>
            Fermer
          </span>
        </div>
      </div>
    </div>
  )
}
