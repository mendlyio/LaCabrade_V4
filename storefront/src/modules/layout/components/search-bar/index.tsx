"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { MagnifyingGlass, XMark } from "@medusajs/icons"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { useTranslate } from "@lib/context/language-context"
import { useLanguage } from "@lib/context/language-context"

const RECENT_SEARCHES_KEY = "lc_recent_searches"
const MAX_RECENT = 5

const POPULAR_SEARCHES: Record<string, string[]> = {
  fr: [
    "Gants",
    "Selles de dressage",
    "Bottes d'équitation",
    "Tapis de selle",
    "Mors",
    "Licols",
    "Protections cheval",
    "Bombes équitation",
    "Éperons",
  ],
  nl: [
    "Handschoenen",
    "Dressagezadels",
    "Rijlaarzen",
    "Zadeldekjes",
    "Bits",
    "Halsters",
    "Paardenbeschermers",
    "Rijcaps",
    "Sporen",
  ],
}

type ProductSuggestion = {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  collection: string | null
  minPrice: number | null
  currency: string
}

type CategorySuggestion = { name: string; handle: string }
type BrandSuggestion = { name: string; slug: string }

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

/** Enregistre une recherche intentionnelle (best-effort, non bloquant). */
function logSearch(query: string, resultsCount: number | null, country: string) {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (PUBLISHABLE_KEY) headers["x-publishable-api-key"] = PUBLISHABLE_KEY
    void fetch(`${BACKEND_URL}/store/search-log`, {
      method: "POST",
      headers,
      keepalive: true,
      body: JSON.stringify({ query, results_count: resultsCount, country }),
    }).catch(() => {})
  } catch {
    /* noop */
  }
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

function normalizeAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return <span>{text}</span>

  const normQuery = normalizeAccents(query)
  const normText = normalizeAccents(text)

  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let searchFrom = 0

  while (searchFrom < normText.length) {
    const idx = normText.indexOf(normQuery, searchFrom)
    if (idx === -1) break
    if (idx > lastIndex) {
      parts.push(<span key={lastIndex}>{text.slice(lastIndex, idx)}</span>)
    }
    parts.push(
      <mark key={idx} className="bg-amber-100 text-amber-900 font-semibold rounded-sm px-0.5">
        {text.slice(idx, idx + normQuery.length)}
      </mark>
    )
    lastIndex = idx + normQuery.length
    searchFrom = lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(<span key={lastIndex}>{text.slice(lastIndex)}</span>)
  }

  return <>{parts}</>
}

const SearchBar = () => {
  const t = useTranslate()
  const { language } = useLanguage()
  const popularSearches = POPULAR_SEARCHES[language] || POPULAR_SEARCHES.fr

  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [products, setProducts] = useState<ProductSuggestion[]>([])
  const [categories, setCategories] = useState<CategorySuggestion[]>([])
  const [brands, setBrands] = useState<BrandSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const router = useRouter()
  const { countryCode } = useParams()
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Charger les recherches récentes depuis localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
      if (stored) setRecentSearches(JSON.parse(stored))
    } catch {}
  }, [])

  // Fermer si clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

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
    // Log de la recherche (résultats connus si la requête correspond au champ)
    const cc = typeof countryCode === "string" ? countryCode : "fr"
    const count = trimmed.toLowerCase() === query.trim().toLowerCase() ? products.length : null
    logSearch(trimmed, count, cc)
    const basePath = countryCode ? `/${countryCode}/store` : "/store"
    router.push(`${basePath}?q=${encodeURIComponent(trimmed)}`)
    setIsOpen(false)
    setQuery("")
    setProducts([])
    setCategories([])
    setBrands([])
  }, [countryCode, router, saveRecentSearch, query, products.length])

  // Recherche dynamique via API route
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (abortRef.current) abortRef.current.abort()

    if (!query.trim() || query.trim().length < 2) {
      setProducts([])
      setCategories([])
      setBrands([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const cc = typeof countryCode === "string" ? countryCode : "fr"
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim())}&countryCode=${cc}&limit=6`,
          { signal: controller.signal }
        )
        if (res.ok) {
          const data = await res.json()
          setProducts(data.products || [])
          setCategories(data.categories || [])
          setBrands(data.brands || [])
        }
      } catch (e: any) {
        if (e.name !== "AbortError") {
          setProducts([])
          setCategories([])
          setBrands([])
        }
      } finally {
        setIsLoading(false)
      }
    }, 180)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, countryCode])

  // Navigation clavier
  const allItems = query.trim().length >= 2
    ? products.map((p) => p.title)
    : query.trim() === ""
    ? recentSearches.length > 0 ? recentSearches : popularSearches
    : []

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, allItems.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, -1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (selectedIndex >= 0 && query.trim().length >= 2 && products[selectedIndex]) {
        const cc = typeof countryCode === "string" ? countryCode : ""
        const basePath = cc ? `/${cc}/products` : "/products"
        saveRecentSearch(query)
        router.push(`${basePath}/${products[selectedIndex].handle}`)
        setIsOpen(false)
        setQuery("")
      } else if (selectedIndex >= 0 && allItems[selectedIndex]) {
        handleSearch(allItems[selectedIndex])
      } else {
        handleSearch(query)
      }
    } else if (e.key === "Escape") {
      setIsOpen(false)
      setSelectedIndex(-1)
      inputRef.current?.blur()
    }
  }

  const removeRecentSearch = (term: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setRecentSearches((prev) => {
      const updated = prev.filter((s) => s !== term)
      try { localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated)) } catch {}
      return updated
    })
  }

  const showDropdown = isOpen
  const hasQuery = query.trim().length >= 2
  const showProducts = hasQuery && products.length > 0
  const showSuggestions = hasQuery && (categories.length > 0 || brands.length > 0)
  const showNoResult =
    hasQuery && !isLoading && products.length === 0 && categories.length === 0 && brands.length === 0
  const showRecent = !hasQuery && recentSearches.length > 0
  const showPopular = !hasQuery && recentSearches.length === 0

  const goTo = (path: string) => {
    const cc = typeof countryCode === "string" ? countryCode : ""
    router.push(`${cc ? `/${cc}` : ""}${path}`)
    setIsOpen(false)
    setQuery("")
    setProducts([])
    setCategories([])
    setBrands([])
  }

  return (
    <div ref={searchRef} className="relative w-full">
      {/* Input */}
      <div
        className={`
          relative flex items-center bg-white rounded-xl border transition-all duration-200
          ${isOpen
            ? "border-gray-400 shadow-xl ring-4 ring-gray-100"
            : "border-gray-200 hover:border-gray-300 hover:shadow-md"
          }
        `}
      >
        {isLoading ? (
          <span className="absolute left-4 w-5 h-5 flex items-center justify-center">
            <svg className="animate-spin w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </span>
        ) : (
          <MagnifyingGlass
            className={`absolute left-4 w-5 h-5 transition-colors ${isOpen ? "text-gray-700" : "text-gray-500"}`}
          />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelectedIndex(-1) }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={t("search.placeholder" as any)}
          className="w-full pl-12 pr-12 py-3 bg-transparent text-base font-medium text-gray-900 placeholder-gray-400 focus:outline-none"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setProducts([]); inputRef.current?.focus() }}
            className="absolute right-3 p-1 hover:bg-gray-100 rounded-full transition-colors"
            aria-label={t("search.clear" as any)}
          >
            <XMark className="w-3.5 h-3.5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 max-h-[520px] overflow-y-auto">

          {/* Suggestions catégories & marques */}
          {showSuggestions && (
            <div className="p-3 border-b border-gray-100">
              {categories.length > 0 && (
                <div className="mb-2">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest px-2 mb-1.5">
                    Catégories
                  </p>
                  <div className="flex flex-wrap gap-1.5 px-2">
                    {categories.map((c) => (
                      <button
                        key={c.handle}
                        onClick={() => goTo(`/categories/${c.handle}`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-medium transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {brands.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest px-2 mb-1.5">
                    Marques
                  </p>
                  <div className="flex flex-wrap gap-1.5 px-2">
                    {brands.map((b) => (
                      <button
                        key={b.slug}
                        onClick={() => goTo(`/marques/${b.slug}`)}
                        className="inline-flex items-center px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium transition-colors"
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Suggestions dynamiques de produits */}
          {showProducts && (
            <div className="p-3">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest px-2 mb-2">
                {t("search.products_section" as any)}
              </p>
              <ul className="space-y-0.5">
                {products.map((product, i) => (
                  <li key={product.id}>
                    <button
                      onClick={() => {
                        const cc = typeof countryCode === "string" ? countryCode : ""
                        saveRecentSearch(query)
                        router.push(`${cc ? `/${cc}` : ""}/products/${product.handle}`)
                        setIsOpen(false)
                        setQuery("")
                      }}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group
                        ${selectedIndex === i ? "bg-gray-50" : "hover:bg-gray-50"}
                      `}
                    >
                      {/* Thumbnail */}
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 ring-1 ring-gray-200">
                        {product.thumbnail ? (
                          <Image
                            src={product.thumbnail}
                            alt={product.title}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MagnifyingGlass className="w-4 h-4 text-gray-300" />
                          </div>
                        )}
                      </div>
                      {/* Infos */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate leading-tight">
                          {highlightMatch(product.title, query)}
                        </p>
                        {product.collection && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{product.collection}</p>
                        )}
                      </div>
                      {/* Prix */}
                      {product.minPrice != null && (
                        <span className="text-sm font-semibold text-gray-900 flex-shrink-0">
                          {formatPrice(product.minPrice, product.currency)}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              {/* Voir tous les résultats */}
              <button
                onClick={() => handleSearch(query)}
                className="w-full mt-2 px-3 py-2.5 flex items-center justify-between rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors group"
              >
                <span>{t("search.all_results" as any)} &ldquo;{query}&rdquo;</span>
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {/* Aucun résultat */}
          {showNoResult && (
            <div className="px-6 py-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <MagnifyingGlass className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                {t("search.no_result" as any)} &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-gray-400 mb-4">{t("search.try_keywords" as any)}</p>
              <button
                onClick={() => handleSearch(query)}
                className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-medium transition-colors"
              >
                {t("search.search_anyway" as any)}
              </button>
            </div>
          )}

          {/* Recherches récentes */}
          {showRecent && (
            <div className="p-3">
              <div className="flex items-center justify-between px-2 mb-2">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
                  {t("search.recent" as any)}
                </p>
                <button
                  onClick={() => {
                    setRecentSearches([])
                    try { localStorage.removeItem(RECENT_SEARCHES_KEY) } catch {}
                  }}
                  className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {t("search.clear_all" as any)}
                </button>
              </div>
              <ul className="space-y-0.5">
                {recentSearches.map((term, i) => (
                  <li key={term}>
                    <button
                      onClick={() => handleSearch(term)}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group
                        ${selectedIndex === i ? "bg-gray-50" : "hover:bg-gray-50"}
                      `}
                    >
                      <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                      <span className="flex-1 text-sm text-gray-700">{term}</span>
                      <button
                        onClick={(e) => removeRecentSearch(term, e)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-200 transition-all"
                        aria-label={t("search.remove" as any)}
                      >
                        <XMark className="w-3 h-3 text-gray-400" />
                      </button>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recherches populaires */}
          {showPopular && (
            <div className="p-3">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest px-2 mb-2">
                {t("search.popular" as any)}
              </p>
              <div className="flex flex-wrap gap-2 px-2">
                {popularSearches.map((term) => (
                  <button
                    key={term}
                    onClick={() => handleSearch(term)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-full transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer raccourcis clavier */}
          <div className="border-t border-gray-100 bg-gray-50/80 px-4 py-2.5">
            <div className="flex items-center justify-between text-[11px] text-gray-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono shadow-sm">↑↓</kbd>
                  {t("search.nav_hint" as any)}
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono shadow-sm">↵</kbd>
                  {t("search.confirm_hint" as any)}
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono shadow-sm">ESC</kbd>
                  {t("search.close_hint" as any)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SearchBar
