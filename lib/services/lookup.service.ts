import { prisma } from "@/lib/prisma"

export class LookupService {
  async lookup(lines: string[][]) {
    const startTime = Date.now()

    // Normalize input
    const [line1Words, line2Words, line3Words] = lines
    const line1 = line1Words.join(" ").toLowerCase().trim()
    const line2 = line2Words.join(" ").toLowerCase().trim()
    const line3 = line3Words.join(" ").toLowerCase().trim()

    // Try exact match first
    let novel = await prisma.novel.findFirst({
      where: {
        line1,
        line2,
        line3,
      },
    })

    const responseTime = Date.now() - startTime

    if (novel) {
      // Log successful lookup
      await prisma.lookupLog.create({
        data: {
          line1,
          line2,
          line3,
          matchedNovelId: novel.id,
          success: true,
          responseTimeMs: responseTime,
        },
      })

      return {
        match: true,
        novel: {
          id: novel.id,
          title: novel.title,
          url: novel.url,
          unlockContent: novel.unlockContent,
        },
        matchingStrategy: "exact",
        responseTimeMs: responseTime,
      }
    }

    // No match found - log failed lookup
    await prisma.lookupLog.create({
      data: {
        line1,
        line2,
        line3,
        matchedNovelId: null,
        success: false,
        responseTimeMs: responseTime,
      },
    })

    // Try to find similar novels for suggestions
    const suggestions = await prisma.novel.findMany({
      where: {
        OR: [
          { line1 },
          { line2 },
          { line3 },
        ],
      },
      take: 3,
      select: {
        id: true,
        title: true,
        line1: true,
        line2: true,
        line3: true,
      },
    })

    return {
      match: false,
      message: "No matching novel found",
      responseTimeMs: responseTime,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    }
  }

  async testLookup(line1: string[], line2: string[], line3: string[]) {
    const result = await this.lookup([line1, line2, line3])

    // Add debug info
    const line1Str = line1.join(" ").toLowerCase()
    const line2Str = line2.join(" ").toLowerCase()
    const line3Str = line3.join(" ").toLowerCase()

    const line1Matches = await prisma.novel.count({
      where: { line1: line1Str },
    })
    const line2Matches = await prisma.novel.count({
      where: { line2: line2Str },
    })
    const line3Matches = await prisma.novel.count({
      where: { line3: line3Str },
    })

    return {
      ...result,
      debugInfo: {
        line1Matches,
        line2Matches,
        line3Matches,
        searchedFor: {
          line1: line1Str,
          line2: line2Str,
          line3: line3Str,
        },
      },
    }
  }
}

export const lookupService = new LookupService()
