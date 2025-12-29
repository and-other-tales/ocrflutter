import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay, subDays, format } from "date-fns"

export class AnalyticsService {
  async getOverview(startDate?: Date, endDate?: Date) {
    const start = startDate || subDays(new Date(), 30)
    const end = endDate || new Date()

    const [
      totalNovels,
      totalLookups,
      successfulLookups,
      failedLookups,
      todayLookups,
      avgResponseTime,
    ] = await Promise.all([
      prisma.novel.count(),
      prisma.lookupLog.count({
        where: {
          timestamp: { gte: start, lte: end },
        },
      }),
      prisma.lookupLog.count({
        where: {
          success: true,
          timestamp: { gte: start, lte: end },
        },
      }),
      prisma.lookupLog.count({
        where: {
          success: false,
          timestamp: { gte: start, lte: end },
        },
      }),
      prisma.lookupLog.count({
        where: {
          timestamp: {
            gte: startOfDay(new Date()),
            lte: endOfDay(new Date()),
          },
        },
      }),
      prisma.lookupLog.aggregate({
        where: {
          timestamp: { gte: start, lte: end },
        },
        _avg: {
          responseTimeMs: true,
        },
      }),
    ])

    const successRate = totalLookups > 0 ? (successfulLookups / totalLookups) * 100 : 0

    // Get unique novels scanned
    const uniqueNovelsScanned = await prisma.lookupLog.groupBy({
      by: ["matchedNovelId"],
      where: {
        success: true,
        matchedNovelId: { not: null },
        timestamp: { gte: start, lte: end },
      },
    })

    // Calculate trends (compare to previous period)
    const periodLength = end.getTime() - start.getTime()
    const previousStart = new Date(start.getTime() - periodLength)
    const previousEnd = start

    const [previousLookups, previousSuccessful] = await Promise.all([
      prisma.lookupLog.count({
        where: {
          timestamp: { gte: previousStart, lte: previousEnd },
        },
      }),
      prisma.lookupLog.count({
        where: {
          success: true,
          timestamp: { gte: previousStart, lte: previousEnd },
        },
      }),
    ])

    const lookupsChange =
      previousLookups > 0
        ? ((totalLookups - previousLookups) / previousLookups) * 100
        : 0

    const previousSuccessRate =
      previousLookups > 0 ? (previousSuccessful / previousLookups) * 100 : 0
    const successRateChange = successRate - previousSuccessRate

    return {
      metrics: {
        totalNovels,
        totalLookups,
        totalLookupsToday: todayLookups,
        successfulLookups,
        failedLookups,
        successRate: Number(successRate.toFixed(1)),
        avgResponseTimeMs: Math.round(avgResponseTime._avg.responseTimeMs || 0),
        uniqueNovelsScanned: uniqueNovelsScanned.length,
      },
      trends: {
        lookupsChangePercent: Number(lookupsChange.toFixed(1)),
        successRateChangePercent: Number(successRateChange.toFixed(1)),
      },
    }
  }

  async getTimeline(startDate: Date, endDate: Date, interval: "hour" | "day" | "week" = "day") {
    const logs = await prisma.lookupLog.findMany({
      where: {
        timestamp: { gte: startDate, lte: endDate },
      },
      select: {
        timestamp: true,
        success: true,
        responseTimeMs: true,
      },
      orderBy: { timestamp: "asc" },
    })

    // Group by interval
    const grouped = new Map<string, { lookups: number; successful: number; failed: number; totalResponseTime: number }>()

    logs.forEach((log) => {
      let key: string
      if (interval === "hour") {
        key = format(log.timestamp, "yyyy-MM-dd HH:00")
      } else if (interval === "day") {
        key = format(log.timestamp, "yyyy-MM-dd")
      } else {
        // week
        key = format(log.timestamp, "yyyy-'W'II")
      }

      if (!grouped.has(key)) {
        grouped.set(key, { lookups: 0, successful: 0, failed: 0, totalResponseTime: 0 })
      }

      const data = grouped.get(key)!
      data.lookups++
      if (log.success) {
        data.successful++
      } else {
        data.failed++
      }
      data.totalResponseTime += log.responseTimeMs
    })

    const timeline = Array.from(grouped.entries()).map(([timestamp, data]) => ({
      timestamp,
      lookups: data.lookups,
      successful: data.successful,
      failed: data.failed,
      avgResponseTime: Math.round(data.totalResponseTime / data.lookups),
    }))

    return { timeline }
  }

  async getTopNovels(limit: number = 10, startDate?: Date, endDate?: Date) {
    const start = startDate || subDays(new Date(), 30)
    const end = endDate || new Date()

    const novelStats = await prisma.lookupLog.groupBy({
      by: ["matchedNovelId"],
      where: {
        success: true,
        matchedNovelId: { not: null },
        timestamp: { gte: start, lte: end },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: limit,
    })

    const novelsWithDetails = await Promise.all(
      novelStats.map(async (stat) => {
        const novel = await prisma.novel.findUnique({
          where: { id: stat.matchedNovelId! },
          select: {
            id: true,
            title: true,
            language: true,
          },
        })

        const successCount = await prisma.lookupLog.count({
          where: {
            matchedNovelId: stat.matchedNovelId,
            success: true,
            timestamp: { gte: start, lte: end },
          },
        })

        return {
          novelId: stat.matchedNovelId,
          title: novel?.title || "Unknown",
          language: novel?.language || "unknown",
          scanCount: stat._count.id,
          successCount,
          successRate: Number(((successCount / stat._count.id) * 100).toFixed(1)),
        }
      })
    )

    return { novels: novelsWithDetails }
  }

  async getFailedPatterns(limit: number = 20) {
    const failedLogs = await prisma.lookupLog.findMany({
      where: {
        success: false,
      },
      select: {
        line1: true,
        line2: true,
        line3: true,
        timestamp: true,
      },
      orderBy: {
        timestamp: "desc",
      },
      take: 100,
    })

    // Group by pattern
    const patterns = new Map<string, { count: number; lastAttempt: Date }>()

    failedLogs.forEach((log) => {
      const key = `${log.line1}|${log.line2}|${log.line3}`
      if (!patterns.has(key)) {
        patterns.set(key, { count: 0, lastAttempt: log.timestamp })
      }
      const pattern = patterns.get(key)!
      pattern.count++
      if (log.timestamp > pattern.lastAttempt) {
        pattern.lastAttempt = log.timestamp
      }
    })

    const sortedPatterns = Array.from(patterns.entries())
      .map(([key, data]) => {
        const [line1, line2, line3] = key.split("|")
        return {
          line1,
          line2,
          line3,
          count: data.count,
          lastAttempt: data.lastAttempt,
        }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)

    return { patterns: sortedPatterns }
  }

  async getLanguageDistribution() {
    const distribution = await prisma.novel.groupBy({
      by: ["language"],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
    })

    return {
      distribution: distribution.map((d) => ({
        language: d.language,
        count: d._count.id,
      })),
    }
  }
}

export const analyticsService = new AnalyticsService()
