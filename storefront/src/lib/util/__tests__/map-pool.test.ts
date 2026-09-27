/**
 * mapPool : même résultats que Promise.all, concurrence bornée.
 * Exécuter : cd storefront && npx tsx src/lib/util/__tests__/map-pool.test.ts
 */

import { mapPool } from "../map-pool"

let passed = 0
let failed = 0

function assert(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) {
    console.log(`  ✅ ${label}`)
    passed++
  } else {
    console.log(`  ❌ ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`)
    failed++
  }
}

async function run() {
  const empty = await mapPool([], 3, async (n: number) => n)
  assert("liste vide", empty, [])

  const ordered = await mapPool([3, 1, 2], 2, async (n) => {
    await new Promise((resolve) => setTimeout(resolve, n * 5))
    return n * 10
  })
  assert("ordre des résultats = ordre des items", ordered, [30, 10, 20])

  let inFlight = 0
  let maxInFlight = 0
  await mapPool([1, 2, 3, 4, 5], 2, async () => {
    inFlight++
    maxInFlight = Math.max(maxInFlight, inFlight)
    await new Promise((resolve) => setTimeout(resolve, 15))
    inFlight--
    return true
  })
  assert("jamais plus de 2 promesses en vol", maxInFlight <= 2, true)
  assert("au moins 2 en vol (toujours parallèle)", maxInFlight, 2)

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed) process.exit(1)
}

run()
