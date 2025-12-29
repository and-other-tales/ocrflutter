"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Activity, Download, Filter, RefreshCw, Search } from "lucide-react"
import { toast } from "sonner"
import { formatDateTime } from "@/lib/utils"

interface Log {
  id: string
  timestamp: string
  line1: string
  line2: string
  line3: string
  matchedNovelId: string | null
  matchedNovel?: {
    id: string
    title: string
  }
  success: boolean
  responseTimeMs: number
  ipAddress: string | null
  userAgent: string | null
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  const [filters, setFilters] = useState({
    success: "",
    ipAddress: "",
    startDate: "",
    endDate: "",
  })

  useEffect(() => {
    fetchLogs()
  }, [page])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
        ...(filters.success && { success: filters.success }),
        ...(filters.ipAddress && { ip_address: filters.ipAddress }),
        ...(filters.startDate && { start_date: filters.startDate }),
        ...(filters.endDate && { end_date: filters.endDate }),
      })

      const response = await fetch(`/api/admin/logs?${params}`)
      const data = await response.json()

      if (data.success) {
        setLogs(data.data.logs)
        setTotalPages(data.data.pagination.totalPages)
      } else {
        toast.error("Failed to fetch logs")
      }
    } catch (error) {
      toast.error("Failed to fetch logs")
    } finally {
      setLoading(false)
    }
  }

  const handleFilter = () => {
    setPage(1)
    fetchLogs()
  }

  const handleReset = () => {
    setFilters({
      success: "",
      ipAddress: "",
      startDate: "",
      endDate: "",
    })
    setPage(1)
    setTimeout(fetchLogs, 100)
  }

  const handleExport = async (format: "csv" | "json") => {
    try {
      const params = new URLSearchParams({
        format,
        ...(filters.success && { success: filters.success }),
        ...(filters.ipAddress && { ip_address: filters.ipAddress }),
        ...(filters.startDate && { start_date: filters.startDate }),
        ...(filters.endDate && { end_date: filters.endDate }),
      })

      const response = await fetch(`/api/admin/logs/export?${params}`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `logs-${Date.now()}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success(`Exported ${format.toUpperCase()} successfully`)
    } catch (error) {
      toast.error("Failed to export logs")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <Activity className="mr-3 h-8 w-8" />
            Activity Logs
          </h1>
          <p className="text-muted-foreground">
            Monitor all API lookup requests and activity
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => handleExport("csv")}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={fetchLogs}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>
      </div>

      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter logs by various criteria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="success">Status</Label>
                <select
                  id="success"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={filters.success}
                  onChange={(e) => setFilters({ ...filters, success: e.target.value })}
                >
                  <option value="">All</option>
                  <option value="true">Success</option>
                  <option value="false">Failed</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ipAddress">IP Address</Label>
                <Input
                  id="ipAddress"
                  placeholder="192.168.1.1"
                  value={filters.ipAddress}
                  onChange={(e) => setFilters({ ...filters, ipAddress: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={handleReset}>
                Reset
              </Button>
              <Button onClick={handleFilter}>
                <Search className="mr-2 h-4 w-4" />
                Apply Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Timestamp</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Fingerprint</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Matched Novel</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Response Time</th>
                <th className="px-4 py-3 text-left text-sm font-medium">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5 text-xs font-mono text-muted-foreground max-w-xs">
                        <div className="truncate">{log.line1}</div>
                        <div className="truncate">{log.line2}</div>
                        <div className="truncate">{log.line3}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {log.matchedNovel ? (
                        <div className="text-sm font-medium">{log.matchedNovel.title}</div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No match</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={log.success ? "success" : "destructive"}>
                        {log.success ? "Success" : "Failed"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {log.responseTimeMs}ms
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">
                      {log.ipAddress || "N/A"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <div className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
