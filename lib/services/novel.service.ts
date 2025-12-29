import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import type { NovelInput, NovelUpdateInput, NovelQuery } from "@/lib/validations/novel"

export class NovelService {
  async list(query: NovelQuery) {
    const page = query.page || 1
    const limit = query.limit || 20
    const skip = (page - 1) * limit

    const where: Prisma.NovelWhereInput = {}

    // Search across multiple fields
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { isbn: { contains: query.search, mode: "insensitive" } },
        { line1: { contains: query.search, mode: "insensitive" } },
        { line2: { contains: query.search, mode: "insensitive" } },
        { line3: { contains: query.search, mode: "insensitive" } },
      ]
    }

    // Filter by language
    if (query.language) {
      where.language = query.language
    }

    // Sort
    const orderBy: Prisma.NovelOrderByWithRelationInput = {}
    if (query.sort) {
      orderBy[query.sort] = query.order || "desc"
    } else {
      orderBy.createdAt = "desc"
    }

    const [novels, total] = await Promise.all([
      prisma.novel.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              lookupLogs: true,
            },
          },
        },
      }),
      prisma.novel.count({ where }),
    ])

    return {
      novels: novels.map((novel) => ({
        ...novel,
        scanCount: novel._count.lookupLogs,
      })),
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
    const novel = await prisma.novel.findUnique({
      where: { id },
      include: {
        lookupLogs: {
          take: 10,
          orderBy: { timestamp: "desc" },
        },
        _count: {
          select: {
            lookupLogs: true,
          },
        },
      },
    })

    if (!novel) {
      return null
    }

    const successfulScans = await prisma.lookupLog.count({
      where: {
        matchedNovelId: id,
        success: true,
      },
    })

    const lastScanned = await prisma.lookupLog.findFirst({
      where: { matchedNovelId: id },
      orderBy: { timestamp: "desc" },
      select: { timestamp: true },
    })

    return {
      novel,
      stats: {
        totalScans: novel._count.lookupLogs,
        successfulScans,
        lastScanned: lastScanned?.timestamp,
      },
    }
  }

  async create(data: NovelInput, createdBy?: string) {
    // Check for duplicates
    const existing = await prisma.novel.findFirst({
      where: {
        line1: data.line1,
        line2: data.line2,
        line3: data.line3,
        language: data.language,
      },
    })

    if (existing) {
      throw new Error("A novel with these lines already exists")
    }

    return prisma.novel.create({
      data: {
        ...data,
        pageNumber: data.pageNumber || null,
        createdBy,
      },
    })
  }

  async update(id: string, data: NovelUpdateInput) {
    // If updating lines, check for duplicates
    if (data.line1 || data.line2 || data.line3) {
      const novel = await prisma.novel.findUnique({ where: { id } })
      if (!novel) {
        throw new Error("Novel not found")
      }

      const existing = await prisma.novel.findFirst({
        where: {
          id: { not: id },
          line1: data.line1 || novel.line1,
          line2: data.line2 || novel.line2,
          line3: data.line3 || novel.line3,
          language: data.language || novel.language,
        },
      })

      if (existing) {
        throw new Error("A novel with these lines already exists")
      }
    }

    return prisma.novel.update({
      where: { id },
      data: {
        ...data,
        pageNumber: data.pageNumber !== undefined ? data.pageNumber : undefined,
      },
    })
  }

  async delete(id: string) {
    return prisma.novel.delete({
      where: { id },
    })
  }

  async bulkImport(novels: NovelInput[], options: { skipDuplicates: boolean; createdBy?: string }) {
    const results = {
      imported: 0,
      skipped: 0,
      failed: 0,
      details: [] as any[],
    }

    for (let i = 0; i < novels.length; i++) {
      const novel = novels[i]
      try {
        // Check for duplicates
        const existing = await prisma.novel.findFirst({
          where: {
            line1: novel.line1,
            line2: novel.line2,
            line3: novel.line3,
            language: novel.language,
          },
        })

        if (existing && options.skipDuplicates) {
          results.skipped++
          results.details.push({
            row: i + 1,
            status: "skipped",
            reason: "Duplicate entry",
          })
          continue
        }

        if (existing && !options.skipDuplicates) {
          results.failed++
          results.details.push({
            row: i + 1,
            status: "failed",
            reason: "Duplicate entry",
          })
          continue
        }

        const created = await this.create(novel, options.createdBy)
        results.imported++
        results.details.push({
          row: i + 1,
          status: "success",
          novelId: created.id,
        })
      } catch (error: any) {
        results.failed++
        results.details.push({
          row: i + 1,
          status: "failed",
          reason: error.message,
        })
      }
    }

    return results
  }

  async export(format: "csv" | "json" = "csv") {
    const novels = await prisma.novel.findMany({
      orderBy: { createdAt: "desc" },
    })

    if (format === "json") {
      return JSON.stringify(novels, null, 2)
    }

    // CSV format
    const headers = [
      "id",
      "title",
      "isbn",
      "line1",
      "line2",
      "line3",
      "line1_raw",
      "line2_raw",
      "line3_raw",
      "url",
      "language",
      "chapter",
      "page_number",
      "unlock_content",
      "created_at",
      "updated_at",
    ]

    const rows = novels.map((novel) => [
      novel.id,
      novel.title,
      novel.isbn || "",
      novel.line1,
      novel.line2,
      novel.line3,
      novel.line1Raw || "",
      novel.line2Raw || "",
      novel.line3Raw || "",
      novel.url,
      novel.language,
      novel.chapter || "",
      novel.pageNumber || "",
      novel.unlockContent || "",
      novel.createdAt.toISOString(),
      novel.updatedAt.toISOString(),
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n")

    return csvContent
  }
}

export const novelService = new NovelService()
