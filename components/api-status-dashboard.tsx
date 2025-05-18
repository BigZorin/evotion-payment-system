"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/use-toast"
import type { ApiStatusResult, ApiEndpoint } from "@/lib/api-status"
import { CheckCircle, XCircle, AlertTriangle, HelpCircle, RefreshCw, Clock, Server } from "lucide-react"

interface ApiStatusDashboardProps {
  initialData?: {
    results: ApiStatusResult[]
    summary?: {
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
  }
}

export default function ApiStatusDashboard({ initialData }: ApiStatusDashboardProps) {
  const [data, setData] = useState(initialData || { results: [] })
  const [loading, setLoading] = useState(!initialData)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [lastUpdated, setLastUpdated] = useState<Date | null>(initialData ? new Date() : null)
  const [error, setError] = useState<string | null>(null)

  // Functie om de API status op te halen
  const fetchApiStatus = async (category?: string) => {
    try {
      setRefreshing(true)
      setError(null)

      const url =
        category && category !== "all" ? `/api/admin/api-status?category=${category}` : "/api/admin/api-status"

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Error fetching API status: ${response.status}`)
      }

      const newData = await response.json()
      setData(newData)
      setLastUpdated(new Date())

      // Toon een toast als er offline API's zijn
      const offlineCount = newData.results.filter((r: ApiStatusResult) => r.status === "offline").length
      if (offlineCount > 0) {
        toast({
          title: `${offlineCount} API${offlineCount === 1 ? " is" : "'s zijn"} offline`,
          description: "Bekijk het dashboard voor meer details.",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Error fetching API status:", err)
      setError("Er is een fout opgetreden bij het ophalen van de API status.")

      toast({
        title: "Fout bij verversen",
        description: "Er is een fout opgetreden bij het verversen van de API status.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Haal de API status op bij eerste render
  useEffect(() => {
    if (!initialData) {
      fetchApiStatus()
    }
  }, [])

  // Functie om een specifieke API endpoint te testen
  const testEndpoint = async (endpoint: ApiEndpoint) => {
    try {
      toast({
        title: `API Test: ${endpoint.name}`,
        description: "Bezig met testen...",
      })

      const response = await fetch(`/api/admin/api-status?endpoint=${encodeURIComponent(endpoint.url)}`)

      if (!response.ok) {
        throw new Error(`Error testing endpoint: ${response.status}`)
      }

      const result = await response.json()

      toast({
        title: `API Test: ${endpoint.name}`,
        description:
          result.results[0].status === "online"
            ? `Online (${result.results[0].responseTime}ms)`
            : `Offline: ${result.results[0].message}`,
        variant: result.results[0].status === "online" ? "default" : "destructive",
      })

      // Ververs de volledige lijst
      fetchApiStatus(activeTab !== "all" ? activeTab : undefined)
    } catch (err) {
      console.error("Error testing endpoint:", err)

      toast({
        title: `API Test: ${endpoint.name}`,
        description: "Er is een fout opgetreden bij het testen van de API.",
        variant: "destructive",
      })
    }
  }

  // Functie om alle API's te verversen
  const refreshAll = () => {
    fetchApiStatus(activeTab !== "all" ? activeTab : undefined)
  }

  // Functie om de status badge te renderen
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "online":
        return (
          <Badge variant="success" className="ml-2">
            Online
          </Badge>
        )
      case "offline":
        return (
          <Badge variant="error" className="ml-2">
            Offline
          </Badge>
        )
      case "degraded":
        return (
          <Badge variant="warning" className="ml-2">
            Traag
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="ml-2">
            Onbekend
          </Badge>
        )
    }
  }

  // Functie om het status icoon te renderen
  const renderStatusIcon = (status: string, size = 16) => {
    switch (status) {
      case "online":
        return <CheckCircle size={size} className="text-green-500" />
      case "offline":
        return <XCircle size={size} className="text-red-500" />
      case "degraded":
        return <AlertTriangle size={size} className="text-amber-500" />
      default:
        return <HelpCircle size={size} className="text-gray-400" />
    }
  }

  // Filter resultaten op basis van de actieve tab
  const filteredResults = data.results.filter(
    (result: ApiStatusResult) => activeTab === "all" || result.endpoint.category === activeTab,
  )

  // Bereken statistieken voor de gefilterde resultaten
  const filteredStats = {
    total: filteredResults.length,
    online: filteredResults.filter((r: ApiStatusResult) => r.status === "online").length,
    offline: filteredResults.filter((r: ApiStatusResult) => r.status === "offline").length,
    degraded: filteredResults.filter((r: ApiStatusResult) => r.status === "degraded").length,
    unknown: filteredResults.filter((r: ApiStatusResult) => r.status === "unknown").length,
  }

  // Bepaal de algemene status
  const overallStatus =
    filteredStats.offline > 0
      ? "offline"
      : filteredStats.degraded > 0
        ? "degraded"
        : filteredStats.online === filteredStats.total
          ? "online"
          : "unknown"

  return (
    <div className="space-y-6">
      {/* Header met algemene status */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            API Status Dashboard
            {renderStatusIcon(overallStatus, 24)}
          </h1>
          <p className="text-muted-foreground">Monitor de status van alle API-verbindingen</p>
        </div>

        <div className="flex items-center gap-2">
          {lastUpdated && (
            <div className="text-sm text-muted-foreground flex items-center">
              <Clock size={14} className="mr-1" />
              Laatste update: {lastUpdated.toLocaleTimeString()}
            </div>
          )}

          <Button variant="outline" size="sm" onClick={refreshAll} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Verversen..." : "Verversen"}
          </Button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Fout</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Status overzicht */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Totaal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : filteredStats.total}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Online</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  {filteredStats.online}
                  <span className="text-sm text-muted-foreground ml-2">
                    ({Math.round((filteredStats.online / filteredStats.total) * 100)}%)
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-600">Traag</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : filteredStats.degraded}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Offline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : filteredStats.offline}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Status Tabs */}
      <Tabs
        defaultValue="all"
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value)
          if (value !== activeTab) {
            fetchApiStatus(value !== "all" ? value : undefined)
          }
        }}
      >
        <TabsList className="mb-4">
          <TabsTrigger value="all">Alle API's</TabsTrigger>
          <TabsTrigger value="clickfunnels">ClickFunnels</TabsTrigger>
          <TabsTrigger value="stripe">Stripe</TabsTrigger>
          <TabsTrigger value="internal">Intern</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-1/2 mb-2" />
                    <Skeleton className="h-4 w-1/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredResults.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    Geen API endpoints gevonden voor deze categorie.
                  </CardContent>
                </Card>
              ) : (
                filteredResults.map((result: ApiStatusResult) => (
                  <Card
                    key={result.endpoint.url}
                    className={
                      result.status === "offline"
                        ? "border-red-200 bg-red-50"
                        : result.status === "degraded"
                          ? "border-amber-200 bg-amber-50"
                          : ""
                    }
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg flex items-center">
                            {result.endpoint.name}
                            {renderStatusBadge(result.status)}
                          </CardTitle>
                          <CardDescription>{result.endpoint.description}</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => testEndpoint(result.endpoint)}>
                          Test
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2 pt-0">
                      <div className="text-sm">
                        <div className="flex items-center mb-1">
                          <Server size={14} className="mr-2 text-gray-500" />
                          <span className="font-medium">Endpoint:</span>
                          <span className="ml-2 text-muted-foreground truncate max-w-md">{result.endpoint.url}</span>
                        </div>
                        <div className="flex items-center mb-1">
                          <Clock size={14} className="mr-2 text-gray-500" />
                          <span className="font-medium">Responstijd:</span>
                          <span className="ml-2 text-muted-foreground">{result.responseTime}ms</span>
                        </div>
                        {result.message && <div className="mt-2 text-sm">{result.message}</div>}
                      </div>
                    </CardContent>
                    {result.error && (
                      <CardFooter className="pt-0 pb-4">
                        <Alert variant="destructive" className="w-full mt-2">
                          <AlertTitle>Foutmelding</AlertTitle>
                          <AlertDescription className="text-xs break-all">{result.error}</AlertDescription>
                        </Alert>
                      </CardFooter>
                    )}
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
