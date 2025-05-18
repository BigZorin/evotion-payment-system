"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { RefreshCw, Trash2 } from "lucide-react"
import Link from "next/link"

interface CacheStats {
  size: number
  keys: string[]
}

interface CacheResponse {
  status: string
  cache: CacheStats
}

export default function CachePage() {
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Functie om cache statistieken op te halen
  const fetchCacheStats = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/cache")

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data: CacheResponse = await response.json()
      setCacheStats(data.cache)
    } catch (err) {
      setError(`Fout bij het ophalen van cache statistieken: ${err.message}`)
      console.error("Error fetching cache stats:", err)
    } finally {
      setLoading(false)
    }
  }

  // Functie om de cache te legen
  const clearCache = async (type?: string) => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const url = type ? `/api/admin/cache?type=${type}` : "/api/admin/cache"
      const response = await fetch(url, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      setSuccess(data.message)

      // Haal nieuwe statistieken op
      fetchCacheStats()
    } catch (err) {
      setError(`Fout bij het legen van de cache: ${err.message}`)
      console.error("Error clearing cache:", err)
    } finally {
      setLoading(false)
    }
  }

  // Haal cache statistieken op bij het laden van de pagina
  useEffect(() => {
    fetchCacheStats()
  }, [])

  // Groepeer cache keys per type
  const groupedKeys =
    cacheStats?.keys.reduce(
      (groups, key) => {
        const type = key.split(":")[0]
        if (!groups[type]) {
          groups[type] = []
        }
        groups[type].push(key)
        return groups
      },
      {} as Record<string, string[]>,
    ) || {}

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Cache Beheer</h1>
        <div className="flex gap-2">
          <Button onClick={() => fetchCacheStats()} disabled={loading} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Vernieuwen
          </Button>
          <Button onClick={() => clearCache()} disabled={loading} variant="destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Leeg alle cache
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Fout</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 bg-green-50 text-green-800 border-green-200">
          <AlertTitle>Succes</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Cache Overzicht</CardTitle>
          <CardDescription>Overzicht van de huidige cache status en statistieken</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : cacheStats ? (
            <div className="space-y-4">
              <div className="flex items-center">
                <span className="font-medium mr-2">Totaal aantal items in cache:</span>
                <Badge variant="secondary">{cacheStats.size}</Badge>
              </div>

              {Object.keys(groupedKeys).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(groupedKeys).map(([type, keys]) => (
                    <div key={type} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium flex items-center">
                          <span className="capitalize">{type}</span>
                          <Badge variant="outline" className="ml-2">
                            {keys.length}
                          </Badge>
                        </h3>
                        <Button
                          onClick={() => clearCache(type)}
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="mr-2 h-3 w-3" />
                          Leeg {type} cache
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {keys.map((key) => (
                          <div key={key} className="text-sm bg-gray-50 p-2 rounded truncate">
                            {key}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Geen items in de cache.</p>
              )}
            </div>
          ) : (
            <p className="text-gray-500">Geen cache statistieken beschikbaar.</p>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <p className="text-sm text-gray-500">
            Cache wordt automatisch ververst na een bepaalde tijd, afhankelijk van het type data.
          </p>
        </CardFooter>
      </Card>

      <div className="flex justify-between">
        <Link href="/admin/dashboard">
          <Button variant="outline">Terug naar Dashboard</Button>
        </Link>
        <Link href="/admin/api-test">
          <Button variant="outline">API Test</Button>
        </Link>
      </div>
    </div>
  )
}
