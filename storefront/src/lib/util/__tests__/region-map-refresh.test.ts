/**
 * Tests backoff cache régions (middleware).
 * Exécuter : cd storefront && npx tsx src/lib/util/__tests__/region-map-refresh.test.ts
 */

import { shouldRefreshRegionMap, REGION_CACHE_MS, REGION_ERROR_BACKOFF_MS } from "../region-map-refresh"

let passed = 0
let failed = 0

function assert(label: string, actual: unknown, expected: unknown) {
  const ok = actual === expected
  if (ok) {
    console.log(`  ✅ ${label}`)
    passed++
  } else {
    console.log(`  ❌ ${label}: got ${actual}, expected ${expected}`)
    failed++
  }
}

const now = 1_000_000

assert(
  "cache vide → fetch",
  shouldRefreshRegionMap({ hasCache: false, cacheUpdatedAt: 0, now, backoffUntil: 0 }),
  true
)

assert(
  "cache frais → pas de fetch",
  shouldRefreshRegionMap({
    hasCache: true,
    cacheUpdatedAt: now - 60_000,
    now,
    backoffUntil: 0,
  }),
  false
)

assert(
  "cache expiré (1h) → fetch",
  shouldRefreshRegionMap({
    hasCache: true,
    cacheUpdatedAt: now - REGION_CACHE_MS - 1,
    now,
    backoffUntil: 0,
  }),
  true
)

assert(
  "cache expiré mais backoff actif → pas de fetch",
  shouldRefreshRegionMap({
    hasCache: true,
    cacheUpdatedAt: now - REGION_CACHE_MS - 1,
    now,
    backoffUntil: now + REGION_ERROR_BACKOFF_MS,
  }),
  false
)

assert(
  "cache vide même en backoff → fetch (premier démarrage)",
  shouldRefreshRegionMap({
    hasCache: false,
    cacheUpdatedAt: 0,
    now,
    backoffUntil: now + REGION_ERROR_BACKOFF_MS,
  }),
  true
)

assert(
  "backoff écoulé + cache expiré → fetch",
  shouldRefreshRegionMap({
    hasCache: true,
    cacheUpdatedAt: now - REGION_CACHE_MS - 1,
    now,
    backoffUntil: now - 1,
  }),
  true
)

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
