import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

interface LogFilters {
  startDate?: Date
  endDate?: Date
  success?: boolean
  novelId?: string
  ipAddress?: string
}

export class LogService {
  async list(page: number = 1, limit: number = 50, filters: LogFilters = {}) {
    const skip = (page - 1) * limit

    const where: Prisma.LookupLogWhereInput = {}

    if (filters.startDate || filters.endDate) {
      where.timestamp = {}
      if (filters.startDate) where.timestamp.gte = filters.startDate
      if (filters.endDate) where.timestamp.lte = filters.endDate
    }

    if (filters.success !== undefined) {
      where.success = filters.success
    }

    if (filters.novelId) {
      where.matchedNovelId = filters.novelId
    }

    if (filters.ipAddress) {
      where.ipAddress = { contains: filters.ipAddress }
    }

    const [logs, total] = await Promise.all([
      prisma.lookupLog.findMany({
        where,
        include: {
          matchedNovel: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { timestamp: "desc" },
        skip,
        take: limit,
      }),
      prisma.lookupLog.count({ where }),
    ])

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    }
  }

  async getById(id: string) {
    const log = await prisma.lookupLog.findUnique({
      where: { id },
      include: {
        matchedNovel: {
          select: {
            id: true,
            title: true,
            url: true,
            language: true,
          },
        },
      },
    })

    return log
  }

  async export(format: "csv" | "json", filters: LogFilters = {}) {
    const where: Prisma.LookupLogWhereInput = {}

    if (filters.startDate || filters.endDate) {
      where.timestamp = {}
      if (filters.startDate) where.timestamp.gte = filters.startDate
      if (filters.endDate) where.timestamp.lte = filters.endDate
    }

    if (filters.success !== undefined) {
      where.success = filters.success
    }

    if (filters.novelId) {
      where.matchedNovelId = filters.novelId
    }

    const logs = await prisma.lookupLog.findMany({
      where,
      include: {
        matchedNovel: {
          select: {
            title: true,
          },
        },
      },
      orderBy: { timestamp: "desc" },
      take: 10000, // Limit export to 10k records
    })

    if (format === "json") {
      return JSON.stringify(logs, null, 2)
    }

    // CSV format
    const headers = [
      "id",
      "timestamp",
      "line1",
      "line2",
      "line3",
      "matched_novel",
      "success",
      "response_time_ms",
      "ip_address",
      "user_agent",
    ]

    const rows = logs.map((log) => [
      log.id,
      log.timestamp.toISOString(),
      log.line1,
      log.line2,
      log.line3,
      log.matchedNovel?.title || "",
      log.success,
      log.responseTimeMs,
      log.ipAddress || "",
      log.userAgent || "",
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n")

    return csvContent
  }

  async getStats() {
    const [total, successful, failed, avgResponseTime] = await Promise.all([
      prisma.lookupLog.count(),
      prisma.lookupLog.count({ where: { success: true } }),
      prisma.lookupLog.count({ where: { success: false } }),
      prisma.lookupLog.aggregate({
        _avg: { responseTimeMs: true },
      }),
    ])

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? ((successful / total) * 100).toFixed(1) : "0.0",
      avgResponseTimeMs: Math.round(avgResponseTime._avg.responseTimeMs || 0),
    }
  }
}

export const logService = new LogService()
