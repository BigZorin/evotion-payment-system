"use server"

/**
 * Helper functies voor API-aanroepen met rate limiting en foutafhandeling
 */

// Constanten voor rate limiting
const API_DELAY_MS = 1000 // 1 seconde wachten tussen API-aanroepen
const MAX_RETRIES = 3 // Maximaal 3 pogingen bij fouten

// Cache voor API-aanroepen
const apiCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minuten cache TTL

/**
 * Voert een API-aanroep uit met rate limiting, caching en foutafhandeling
 * @param url De URL om aan te roepen
 * @param options De fetch opties
 * @param cacheKey Een optionele cache key
 * @param cacheTtl Een optionele cache TTL in ms (standaard 5 minuten)
 * @param bypassCache Een optionele boolean om de cache te negeren
 * @returns De API-response als JSON
 */
export async function fetchWithRateLimiting<T>(
  url: string,
  options: RequestInit,
  cacheKey?: string,
  cacheTtl: number = CACHE_TTL_MS,
  bypassCache = false,
): Promise<T> {
  // Check cache first if we have a cache key and aren't bypassing cache
  if (cacheKey && !bypassCache) {
    const cached = apiCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < cacheTtl) {
      console.log(`Using cached data for ${cacheKey}`)
      return cached.data as T
    }
  }

  let lastError: Error | null = null

  // Retry loop
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`API call to ${url} (attempt ${attempt}/${MAX_RETRIES})`)

      const response = await fetch(url, options)

      // Handle rate limiting (429 Too Many Requests)
      if (response.status === 429) {
        const retryAfter = Number.parseInt(response.headers.get("Retry-After") || "60", 10)
        console.log(`Rate limited. Waiting ${retryAfter} seconds before retry...`)

        // Wait for the specified time before retrying
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000))
        continue // Retry after waiting
      }

      // Handle other errors
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error ${response.status} ${response.statusText}: ${errorText}`)
      }

      // Parse JSON response
      const data = await response.json()

      // Cache the result if we have a cache key
      if (cacheKey) {
        apiCache.set(cacheKey, { data, timestamp: Date.now() })
      }

      // Wait before the next API call to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, API_DELAY_MS))

      return data as T
    } catch (error) {
      console.error(`Error in API call to ${url} (attempt ${attempt}/${MAX_RETRIES}):`, error)
      lastError = error instanceof Error ? error : new Error(String(error))

      // If this is not the last attempt, wait before retrying
      if (attempt < MAX_RETRIES) {
        const backoffTime = API_DELAY_MS * Math.pow(2, attempt - 1) // Exponential backoff
        console.log(`Retrying in ${backoffTime}ms...`)
        await new Promise((resolve) => setTimeout(resolve, backoffTime))
      }
    }
  }

  // If we get here, all attempts failed
  throw lastError || new Error(`Failed to fetch from ${url} after ${MAX_RETRIES} attempts`)
}

/**
 * Verwijdert een item uit de cache
 * @param cacheKey De cache key om te verwijderen
 */
export function invalidateCache(cacheKey: string): void {
  apiCache.delete(cacheKey)
  console.log(`Cache invalidated for ${cacheKey}`)
}

/**
 * Verwijdert alle items uit de cache
 */
export function clearCache(): void {
  apiCache.clear()
  console.log("Complete cache cleared")
}

/**
 * Geeft de huidige cache status terug
 */
export function getCacheStatus(): { keys: string[]; size: number } {
  return {
    keys: Array.from(apiCache.keys()),
    size: apiCache.size,
  }
}
