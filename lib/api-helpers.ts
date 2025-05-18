"use server"

import { apiCache } from "./cache"

// Constanten voor rate limiting
const API_DELAY_MS = 500 // Wachttijd tussen API-aanroepen
const MAX_RETRIES = 3 // Maximaal aantal herhaalpogingen
const INITIAL_RETRY_DELAY = 1000 // Initiële wachttijd voor herhaalpogingen

/**
 * Haalt data op van een API met rate limiting en caching
 * @param url De URL om op te halen
 * @param options Fetch opties
 * @param cacheKey De sleutel voor caching
 * @param cacheTTL De time-to-live voor de cache in milliseconden
 * @returns De opgehaalde data
 */
export async function fetchWithRateLimiting<T>(
  url: string,
  options: RequestInit = {},
  cacheKey?: string,
  cacheTTL: number = 5 * 60 * 1000, // 5 minuten standaard
): Promise<T> {
  // Controleer eerst de cache als een cacheKey is opgegeven
  if (cacheKey) {
    const cachedData = apiCache.get<T>(cacheKey)
    if (cachedData) {
      console.log(`Cache hit for ${cacheKey}`)
      return cachedData
    }
    console.log(`Cache miss for ${cacheKey}`)
  }

  // Wacht een korte tijd om rate limiting te voorkomen
  await new Promise((resolve) => setTimeout(resolve, API_DELAY_MS))

  let lastError: Error | null = null
  let retryDelay = INITIAL_RETRY_DELAY

  // Probeer de aanroep meerdere keren met exponentiële backoff
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        cache: "no-store", // Geen HTTP caching
      })

      // Controleer op rate limiting (429 Too Many Requests)
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After")
        const waitTime = retryAfter ? Number.parseInt(retryAfter, 10) * 1000 : retryDelay

        console.warn(`Rate limited (429). Waiting ${waitTime}ms before retry.`)
        await new Promise((resolve) => setTimeout(resolve, waitTime))

        // Verhoog de retry delay voor de volgende poging (exponentiële backoff)
        retryDelay *= 2
        continue
      }

      // Controleer op andere fouten
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error ${response.status}: ${errorText}`)
      }

      // Parse de response als JSON
      const text = await response.text()
      let data: T

      try {
        data = JSON.parse(text) as T
      } catch (e) {
        console.error(`Invalid JSON response: ${text.substring(0, 100)}...`)
        throw new Error(`Invalid JSON response: ${e.message}`)
      }

      // Sla de data op in de cache als een cacheKey is opgegeven
      if (cacheKey) {
        apiCache.set(cacheKey, data, cacheTTL)
      }

      return data
    } catch (error) {
      console.error(`Attempt ${attempt + 1}/${MAX_RETRIES} failed:`, error)
      lastError = error instanceof Error ? error : new Error(String(error))

      // Als dit niet de laatste poging is, wacht dan en probeer opnieuw
      if (attempt < MAX_RETRIES - 1) {
        console.log(`Retrying in ${retryDelay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, retryDelay))

        // Verhoog de retry delay voor de volgende poging (exponentiële backoff)
        retryDelay *= 2
      }
    }
  }

  // Als we hier komen, zijn alle pogingen mislukt
  throw lastError || new Error("Failed after multiple attempts")
}
