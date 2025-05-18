// Cache implementatie voor API-responses
// Deze implementatie gebruikt een in-memory cache met TTL (time-to-live)

type CacheEntry<T> = {
  data: T
  expiry: number
}

class Cache {
  private cache: Map<string, CacheEntry<any>> = new Map()

  // Standaard cache-duur in milliseconden (1 seconde - effectief geen cache)
  private defaultTTL = 1 * 1000

  // Cache-duur per type data (allemaal 1 seconde - effectief geen cache)
  private ttlConfig = {
    products: 1 * 1000, // 1 seconde voor producten
    collections: 1 * 1000, // 1 seconde voor collections
    courses: 1 * 1000, // 1 seconde voor cursussen
    variants: 1 * 1000, // 1 seconde voor varianten
    prices: 1 * 1000, // 1 seconde voor prijzen
    enrollments: 1 * 1000, // 1 seconde voor inschrijvingen
    contacts: 1 * 1000, // 1 seconde voor contacten
  }

  // Haal data op uit de cache
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    // Als er geen entry is of de entry is verlopen, return null
    if (!entry || entry.expiry < Date.now()) {
      if (entry) {
        // Verwijder verlopen entries
        this.cache.delete(key)
      }
      return null
    }

    return entry.data as T
  }

  // Sla data op in de cache
  set<T>(key: string, data: T, type?: keyof typeof this.ttlConfig): void {
    // Sla op met zeer korte TTL (1 seconde)
    const expiry = Date.now() + (type ? this.ttlConfig[type] : this.defaultTTL)
    this.cache.set(key, { data, expiry })
  }

  // Verwijder een specifieke entry uit de cache
  delete(key: string): void {
    this.cache.delete(key)
  }

  // Verwijder alle entries van een bepaald type uit de cache
  invalidateType(type: string): void {
    const prefix = `${type}:`
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
      }
    }
  }

  // Verwijder alle entries uit de cache
  clear(): void {
    this.cache.clear()
  }

  // Haal alle keys op uit de cache
  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  // Haal statistieken op over de cache
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: this.keys(),
    }
  }
}

// Singleton instance van de cache
export const apiCache = new Cache()

// Helper functie om gecachte data op te halen of nieuwe data op te halen en te cachen
export async function getCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  type?: keyof Cache["ttlConfig"],
  bypassCache = true, // Standaard altijd de cache omzeilen
): Promise<T> {
  // Altijd de cache omzeilen tenzij expliciet anders aangegeven
  if (bypassCache) {
    const data = await fetchFn()
    apiCache.set(key, data, type)
    return data
  }

  // Probeer data uit de cache te halen
  const cachedData = apiCache.get<T>(key)
  if (cachedData !== null) {
    return cachedData
  }

  // Als er geen gecachte data is, haal dan nieuwe data op
  const data = await fetchFn()
  apiCache.set(key, data, type)
  return data
}
