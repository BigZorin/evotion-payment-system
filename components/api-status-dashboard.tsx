"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, CheckCircle, AlertTriangle, Clock, RefreshCw } from "lucide-react"

interface ApiEndpoint {
  name: string
  url: string
  method: string
  description: string
  category: string
}

interface ApiStatusResult {
  endpoint: ApiEndpoint
  status: "online" | "offline" | "degraded" | "unknown"
  responseTime: number
  statusCode?: number
  message?: string
  timestamp: Date
  error?: string
}

interface ApiStatusSummary {
  total: number
  online: number
  offline: number
  degraded: number
  unknown: number
  averageResponseTime: number
  categories: {
    name: string
    total: number
    online: number
    offline: number
    degraded: number
  }[]
}

interface ApiStatusDashboardProps {
  initialData?: {
    results: ApiStatusResult[]
    summary: ApiStatusSummary
  }
}

export default function ApiStatusDashboard({ initialData }: ApiStatusDashboardProps) {
  const [results, setResults] = useState<ApiStatusResult[]>(initialData?.results || [])
  const [summary, setSummary] = useState<ApiStatusSummary | null>(initialData?.summary || null)
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("all")
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(initialData ? new Date() : null)

  // Functie om de API status op te halen
  const fetchApiStatus = async (category?: string) => {
    try {
      setRefreshing(true)
      const url =
        category && category !== "all" ? `/api/admin/api-status?category=${category}` : "/api/admin/api-status"

      console.log(`Fetching API status from: ${url}`)

      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log("API status data:", data)

      setResults(data.results)
      setSummary(data.summary)
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      console.error("Error fetching API status:", err)
      setError(err instanceof Error ? err.message : "Er is een fout opgetreden bij het ophalen van de API status")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Functie om een specifieke API endpoint te testen
  const testEndpoint = async (endpoint: string) => {
    try {
      const response = await fetch(`/api/admin/api-status?endpoint=${encodeURIComponent(endpoint)}`, {
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      // Update alleen de geteste endpoint in de resultaten
      setResults((prevResults) => {
        return prevResults.map((result) => {
          if (result.endpoint.url === endpoint) {
            return data.results[0]
          }
          return result
        })
      })

      // Herbereken de samenvatting
      fetchApiStatus(activeTab !== "all" ? activeTab : undefined)
    } catch (err) {
      console.error("Error testing endpoint:", err)
    }
  }

  // Laad de API status bij het laden van de component als er geen initialData is
  useEffect(() => {
    if (!initialData) {
      fetchApiStatus()
    }
  }, [initialData])

  // Functie om de juiste kleur te bepalen voor de status
  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500 hover:bg-green-600"
      case "offline":
        return "bg-red-500 hover:bg-red-600"
      case "degraded":
        return "bg-yellow-500 hover:bg-yellow-600"
      default:
        return "bg-gray-500 hover:bg-gray-600"
    }
  }

  // Functie om het juiste icoon te bepalen voor de status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "online":
        return <CheckCircle className="h-5 w-5" />
      case "offline":
        return <AlertCircle className="h-5 w-5" />
      case "degraded":
        return <AlertTriangle className="h-5 w-5" />
      default:
        return <Clock className="h-5 w-5" />
    }
  }

  // Functie om de tab te wijzigen
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    fetchApiStatus(value !== "all" ? value : undefined)
  }

  // Functie om de tijd te formatteren
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("nl-NL", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date)
  }

  // Filter resultaten op basis van de actieve tab
  const filteredResults =
    activeTab === "all" ? results : results.filter((result) => result.endpoint.category === activeTab)

  return (
    <div className="container mx-auto py-6 space-y-6 pl-6 pr-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">API Status Dashboard</h1>
          <p className="text-gray-500">
            Monitor de status van alle API-verbindingen
            {lastUpdated && <span className="ml-2">• Laatste update: {formatTime(lastUpdated)}</span>}
          </p>
        </div>
        <Button
          onClick={() => fetchApiStatus(activeTab !== "all" ? activeTab : undefined)}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Verversen..." : "Verversen"}
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Fout! </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-[200px] w-full rounded-lg" />
          <Skeleton className="h-[400px] w-full rounded-lg" />
        </div>
      ) : (
        <>
          {/* Samenvatting */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Totaal</CardTitle>
                  <CardDescription>Alle API endpoints</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{summary.total}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Online</CardTitle>
                  <CardDescription>Beschikbare endpoints</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-green-500">{summary.online}</div>
                  <div className="text-lg">{Math.round((summary.online / summary.total) * 100)}%</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Offline</CardTitle>
                  <CardDescription>Onbeschikbare endpoints</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div className="text-3xl font-bold text-red-500">{summary.offline}</div>
                  <div className="text-lg">{Math.round((summary.offline / summary.total) * 100)}%</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Gemiddelde responstijd</CardTitle>
                  <CardDescription>Alle endpoints</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{summary.averageResponseTime} ms</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tabs voor categorieën */}
          <Tabs defaultValue="all" value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">Alle</TabsTrigger>
              <TabsTrigger value="clickfunnels">ClickFunnels</TabsTrigger>
              <TabsTrigger value="internal">Intern</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              <div className="grid grid-cols-1 gap-4">
                {filteredResults.map((result, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {result.endpoint.name}
                            <Badge className={`${getStatusColor(result.status)} text-white`}>
                              {result.status === "online"
                                ? "Online"
                                : result.status === "offline"
                                  ? "Offline"
                                  : result.status === "degraded"
                                    ? "Traag"
                                    : "Onbekend"}
                            </Badge>
                          </CardTitle>
                          <CardDescription>{result.endpoint.description}</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => testEndpoint(result.endpoint.url)}>
                          Test
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Endpoint:</p>
                          <p className="text-sm break-all">{result.endpoint.url}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Responstijd:</p>
                          <p className="text-sm">{result.responseTime}ms</p>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <div className="w-full">
                        {result.message && (
                          <div className="text-sm mt-2">
                            <span className="font-medium">Bericht: </span>
                            {result.message}
                          </div>
                        )}
                        {result.error && (
                          <div className="text-sm text-red-500 mt-2">
                            <span className="font-medium">Fout: </span>
                            {result.error}
                          </div>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
