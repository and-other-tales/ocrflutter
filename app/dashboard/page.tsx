import { Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Activity, TrendingUp, Clock } from "lucide-react"
import { prisma } from "@/lib/prisma"

// Prevent static generation for this dynamic page
export const dynamic = "force-dynamic"

async function getDashboardMetrics() {
  const [totalNovels, totalLogs, todayLogs, successfulLogs] = await Promise.all([
    prisma.novel.count(),
    prisma.lookupLog.count(),
    prisma.lookupLog.count({
      where: {
        timestamp: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    prisma.lookupLog.count({
      where: {
        success: true,
      },
    }),
  ])

  const successRate = totalLogs > 0 ? ((successfulLogs / totalLogs) * 100).toFixed(1) : "0.0"

  const recentLogs = await prisma.lookupLog.findMany({
    take: 10,
    orderBy: { timestamp: "desc" },
    include: {
      matchedNovel: {
        select: {
          title: true,
        },
      },
    },
  })

  return {
    totalNovels,
    totalLogs,
    todayLogs,
    successRate,
    recentLogs,
  }
}

function MetricsCards({ metrics }: { metrics: Awaited<ReturnType<typeof getDashboardMetrics>> }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Novels</CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalNovels}</div>
          <p className="text-xs text-muted-foreground">
            Novels in database
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Lookups Today</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.todayLogs}</div>
          <p className="text-xs text-muted-foreground">
            API requests today
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.successRate}%</div>
          <p className="text-xs text-muted-foreground">
            Of all lookups
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Lookups</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalLogs}</div>
          <p className="text-xs text-muted-foreground">
            All-time requests
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function RecentActivity({ logs }: { logs: any[] }) {
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {log.matchedNovel?.title || "Unknown Novel"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {log.line1} / {log.line2} / {log.line3}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      log.success
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {log.success ? "Success" : "Failed"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {log.responseTimeMs}ms
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your Novel OCR Admin Panel
        </p>
      </div>

      <Suspense fallback={<div>Loading metrics...</div>}>
        <MetricsCards metrics={metrics} />
      </Suspense>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
        <Suspense fallback={<div>Loading activity...</div>}>
          <RecentActivity logs={metrics.recentLogs} />
        </Suspense>
      </div>
    </div>
  )
}
