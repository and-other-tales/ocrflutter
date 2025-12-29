"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart3, TrendingUp, TrendingDown, Activity, CheckCircle, XCircle, Clock } from "lucide-react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface AnalyticsData {
  metrics: {
    totalNovels: number
    totalLookups: number
    totalLookupsToday: number
    successfulLookups: number
    failedLookups: number
    successRate: number
    avgResponseTimeMs: number
    uniqueNovelsScanned: number
  }
  trends: {
    lookupsChangePercent: number
    successRateChangePercent: number
  }
}

interface TimelineData {
  timestamp: string
  lookups: number
  successful: number
  failed: number
  avgResponseTime: number
}

interface TopNovel {
  novelId: string
  title: string
  language: string
  scanCount: number
  successCount: number
  successRate: number
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [timeline, setTimeline] = useState<TimelineData[]>([])
  const [topNovels, setTopNovels] = useState<TopNovel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const [overviewRes, timelineRes, topNovelsRes] = await Promise.all([
        fetch("/api/admin/analytics/overview"),
        fetch("/api/admin/analytics/timeline"),
        fetch("/api/admin/analytics/top-novels?limit=10"),
      ])

      const [overviewData, timelineData, topNovelsData] = await Promise.all([
        overviewRes.json(),
        timelineRes.json(),
        topNovelsRes.json(),
      ])

      if (overviewData.success) {
        setAnalytics(overviewData.data)
      }
      if (timelineData.success) {
        setTimeline(timelineData.data.timeline)
      }
      if (topNovelsData.success) {
        setTopNovels(topNovelsData.data.novels)
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

  if (loading || !analytics) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Activity className="h-12 w-12 animate-pulse mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    )
  }

  const pieData = [
    { name: "Successful", value: analytics.metrics.successfulLookups },
    { name: "Failed", value: analytics.metrics.failedLookups },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <BarChart3 className="mr-3 h-8 w-8" />
          Analytics Dashboard
        </h1>
        <p className="text-muted-foreground">
          Comprehensive insights and performance metrics
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Lookups</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.metrics.totalLookups.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {analytics.trends.lookupsChangePercent >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
              )}
              <span className={analytics.trends.lookupsChangePercent >= 0 ? "text-green-500" : "text-red-500"}>
                {Math.abs(analytics.trends.lookupsChangePercent).toFixed(1)}%
              </span>
              <span className="ml-1">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.metrics.successRate}%</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {analytics.trends.successRateChangePercent >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
              )}
              <span className={analytics.trends.successRateChangePercent >= 0 ? "text-green-500" : "text-red-500"}>
                {Math.abs(analytics.trends.successRateChangePercent).toFixed(1)}%
              </span>
              <span className="ml-1">change</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.metrics.avgResponseTimeMs}ms</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Novels</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.metrics.uniqueNovelsScanned}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Out of {analytics.metrics.totalNovels} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Timeline Chart */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Lookup Activity Over Time</CardTitle>
            <CardDescription>Daily lookup trends for the past 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={70}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="lookups" stroke="#3b82f6" name="Total" strokeWidth={2} />
                <Line type="monotone" dataKey="successful" stroke="#10b981" name="Successful" strokeWidth={2} />
                <Line type="monotone" dataKey="failed" stroke="#ef4444" name="Failed" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Success/Failure Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Success vs Failure</CardTitle>
            <CardDescription>Lookup success rate distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 flex justify-center gap-4">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-2" />
                <span className="text-sm">Successful: {analytics.metrics.successfulLookups}</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-red-500 mr-2" />
                <span className="text-sm">Failed: {analytics.metrics.failedLookups}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Novels Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Scanned Novels</CardTitle>
            <CardDescription>Most frequently looked up novels</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topNovels} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis
                  dataKey="title"
                  type="category"
                  width={150}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip />
                <Bar dataKey="scanCount" fill="#3b82f6" name="Scans" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Novels Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Scanned Novels - Detailed View</CardTitle>
          <CardDescription>Performance breakdown of most popular novels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Rank</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Title</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Language</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Total Scans</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Successful</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Success Rate</th>
                </tr>
              </thead>
              <tbody>
                {topNovels.map((novel, index) => (
                  <tr key={novel.novelId} className="border-b hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <Badge variant="outline">#{index + 1}</Badge>
                    </td>
                    <td className="px-4 py-3 font-medium">{novel.title}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{novel.language.toUpperCase()}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{novel.scanCount}</td>
                    <td className="px-4 py-3 text-right font-mono">{novel.successCount}</td>
                    <td className="px-4 py-3 text-right">
                      <Badge variant={novel.successRate >= 90 ? "success" : novel.successRate >= 70 ? "warning" : "destructive"}>
                        {novel.successRate}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
