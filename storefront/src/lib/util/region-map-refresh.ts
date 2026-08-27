/**
 * Décide si le middleware doit recharger /store/regions.
 * Ne change pas la sélection de région : uniquement le rythme des fetches.
 *
 * Sans backoff, un timeout (AbortError 4s) relance un fetch à CHAQUE
 * navigation tant que le cache est expiré → tempête de requêtes + 502.
 */

export const REGION_CACHE_MS = 3600 * 1000
export const REGION_ERROR_BACKOFF_MS = 60 * 1000

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
