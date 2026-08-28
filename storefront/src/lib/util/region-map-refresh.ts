/**
 * Décide si le middleware doit recharger /store/regions.
 * Ne change pas la sélection de région : uniquement le rythme des fetches.
 *
 * Sans backoff, un timeout (AbortError 4s) relance un fetch à CHAQUE
 * navigation tant que le cache est expiré → tempête de requêtes + 502.
 */

import { HttpTypes } from "@medusajs/types"

export const REGION_CACHE_MS = 3600 * 1000
export const REGION_ERROR_BACKOFF_MS = 60 * 1000

/** Pays boutique établis (BE + FR). Utilisé uniquement en repli middleware. */
export const FALLBACK_COUNTRY_CODES = ["fr", "be"] as const

export function shouldRefreshRegionMap(opts: {
  hasCache: boolean
  cacheUpdatedAt: number
  now: number
  backoffUntil: number
  ttlMs?: number
}): boolean {
  const ttlMs = opts.ttlMs ?? REGION_CACHE_MS
  if (opts.hasCache && opts.now < opts.backoffUntil) {
    return false
  }
  if (!opts.hasCache) {
    return true
  }
  return opts.cacheUpdatedAt < opts.now - ttlMs
}

/**
 * Partage un fetch /store/regions déjà lancé.
 * Sans ça, N navigations simultanées (cache vide) ouvrent N AbortController 4 s.
 */
export function attachInflight<T>(
  current: Promise<T> | null,
  start: () => Promise<T>
): { promise: Promise<T>; started: boolean } {
  if (current) {
    return { promise: current, started: false }
  }
  return { promise: start(), started: true }
}

/** Enregistre FR et BE sur le cache de repli, sans écraser une région déjà sync. */
export function seedFallbackRegionMap(
  map: Map<string, HttpTypes.StoreRegion>,
  region: HttpTypes.StoreRegion
): void {
  for (const code of FALLBACK_COUNTRY_CODES) {
    if (!map.has(code)) {
      map.set(code, region)
    }
  }
}
