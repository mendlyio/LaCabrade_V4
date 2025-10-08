/**
 * Cache simple pour les IDs Odoo synchronisés
 * En production, utilisez Redis ou un cache distribué
 */

interface CacheEntry {
  ids: Set<string>
  timestamp: number
}

class OdooSyncCache {
  private cache: CacheEntry | null = null
  private readonly TTL = 30000 // 30 secondes

  get(): Set<string> | null {
    if (!this.cache) return null

    const now = Date.now()
    if (now - this.cache.timestamp > this.TTL) {
      this.cache = null
      return null
    }

    return this.cache.ids
  }

  set(ids: Set<string>): void {
    this.cache = {
      ids,
      timestamp: Date.now(),
    }
  }

  invalidate(): void {
    this.cache = null
  }

  isValid(): boolean {
    if (!this.cache) return false
    const now = Date.now()
    return (now - this.cache.timestamp) < this.TTL
  }
}

// Instance singleton
export const odooSyncCache = new OdooSyncCache()

