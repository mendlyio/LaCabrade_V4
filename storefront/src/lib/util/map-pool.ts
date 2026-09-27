/**
 * Exécute `fn` sur chaque item avec au plus `concurrency` promesses en vol.
 * L'ordre des résultats suit l'ordre des items (comme Promise.all).
 */
export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) {
    return []
  }

  const limit = Math.max(1, Math.min(concurrency, items.length))
  const results: R[] = new Array(items.length)
  let nextIndex = 0

  const worker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++
      results[index] = await fn(items[index], index)
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()))
  return results
}
