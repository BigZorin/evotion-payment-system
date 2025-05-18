"use server"

import { apiCache } from "./cache"

// Constanten voor rate limiting
const API_DELAY_MS = 500 // Wacht 500ms tussen API-aanroepen
const MAX_RETRIES = 3 // Maximaal 3 herhaalpogingen
const RETRY_DELAY_BASE_MS = 1000 // Basis wachttijd voor herhaalpogingen (1 seconde)

// Globale variabele om bij te houden wanneer de laatste API-aanroep was gedaan
let lastApiCallTime = 0

/**
 * Wacht een bepaalde tijd om rate limiting te voorkomen
 * @param delayMs De wachttijd in milliseconden
 */
async function waitForRateLimit(delayMs: number = API_DELAY_MS): Promise<void> {
  const now = Date.now()
  const timeSinceLastCall = now - lastApiCallTime

  if (timeSinceLastCall < delayMs) {
    const waitTime = delayMs - timeSinceLastCall
    console.log(`Rate limiting: Waiting ${waitTime}ms before next API call`)
    await new Promise((resolve) => setTimeout(resolve, waitTime))
  }

  lastApiCallTime = Date.now()
}

/**
 * Voert een fetch uit met rate limiting, caching en automatische herhaalpogingen
 * @param url De URL om op te halen
 * @param options De fetch opties
 * @param cacheKey De cache sleutel
 * @param cacheTtl De cache TTL in milliseconden
 * @returns De response data
 */
export async function fetchWithRateLimiting<T>(
  url: string,
  options: RequestInit = {},
  cacheKey: string,
  cacheTtl: number = 5 * 60 * 1000, // 5 minuten standaard
): Promise<T> {
  // Controleer eerst of we een gecachte versie hebben
  const cachedData = apiCache.get<T>(cacheKey)
  if (cachedData) {
    console.log(`Cache hit for ${cacheKey}`)
    return cachedData
  }

  console.log(`Cache miss for ${cacheKey}, fetching from API: ${url}`)

  // Wacht om rate limiting te voorkomen
  await waitForRateLimit()

  // Implementeer retry logic met exponentiële backoff
  let lastError: Error | null = null
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        cache: "no-store", // Zorg ervoor dat we altijd verse data ophalen
      })

      // Controleer op rate limiting (429 Too Many Requests)
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After")
        const retryAfterMs = retryAfter
          ? Number.parseInt(retryAfter) * 1000
          : RETRY_DELAY_BASE_MS * Math.pow(2, attempt)
        console.warn(`Rate limited (429). Retrying after ${retryAfterMs}ms...`)
        await new Promise((resolve) => setTimeout(resolve, retryAfterMs))
        continue
      }

      // Controleer op andere fouten
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      // Parse de response als JSON
      const data = await response.json()

      // Sla de data op in de cache
      apiCache.set(cacheKey, data, cacheTtl)

      return data as T
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.error(`Error in API call (attempt ${attempt + 1}/${MAX_RETRIES}):`, lastError)

      // Als dit niet de laatste poging is, wacht dan en probeer opnieuw
      if (attempt < MAX_RETRIES - 1) {
        const retryDelayMs = RETRY_DELAY_BASE_MS * Math.pow(2, attempt)
        console.log(`Retrying in ${retryDelayMs}ms...`)
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
      }
    }
  }

  // Als we hier komen, zijn alle pogingen mislukt
  throw lastError || new Error("Failed to fetch after multiple retries")
}
