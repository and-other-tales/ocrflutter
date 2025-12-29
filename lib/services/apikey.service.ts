import { prisma } from "@/lib/prisma"
import { randomBytes } from "crypto"

export class ApiKeyService {
  generateKey(): string {
    return "sk_" + randomBytes(32).toString("hex")
  }

  async list() {
    const apiKeys = await prisma.apiKey.findMany({
      orderBy: { createdAt: "desc" },
    })

    // Mask the keys for security
    return apiKeys.map((key) => ({
      ...key,
      key: this.maskKey(key.key),
    }))
  }

  async getById(id: string, revealKey: boolean = false) {
    const apiKey = await prisma.apiKey.findUnique({
      where: { id },
    })

    if (!apiKey) return null

    return {
      ...apiKey,
      key: revealKey ? apiKey.key : this.maskKey(apiKey.key),
    }
  }

  async create(data: {
    name: string
    appName?: string
    rateLimit?: number
    expiresAt?: Date
  }) {
    const key = this.generateKey()

    return prisma.apiKey.create({
      data: {
        key,
        name: data.name,
        appName: data.appName,
        rateLimit: data.rateLimit || 1000,
        expiresAt: data.expiresAt,
        isActive: true,
      },
    })
  }

  async update(
    id: string,
    data: {
      name?: string
      appName?: string
      rateLimit?: number
      isActive?: boolean
      expiresAt?: Date
    }
  ) {
    return prisma.apiKey.update({
      where: { id },
      data,
    })
  }

  async delete(id: string) {
    return prisma.apiKey.delete({
      where: { id },
    })
  }

  async incrementUsage(key: string) {
    return prisma.apiKey.update({
      where: { key },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    })
  }

  async getUsageStats(id: string, startDate?: Date, endDate?: Date) {
    const apiKey = await prisma.apiKey.findUnique({
      where: { id },
    })

    if (!apiKey) return null

    // For now, return basic stats
    // In production, you'd track detailed usage in a separate table
    return {
      totalRequests: apiKey.usageCount,
      rateLimit: apiKey.rateLimit,
      lastUsedAt: apiKey.lastUsedAt,
      isActive: apiKey.isActive,
    }
  }

  maskKey(key: string): string {
    if (key.length < 12) return key
    return key.substring(0, 8) + "*".repeat(key.length - 12) + key.substring(key.length - 4)
  }

  async validateKey(key: string): Promise<{ valid: boolean; apiKey?: any }> {
    const apiKey = await prisma.apiKey.findUnique({
      where: { key },
    })

    if (!apiKey) {
      return { valid: false }
    }

    if (!apiKey.isActive) {
      return { valid: false }
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return { valid: false }
    }

    return { valid: true, apiKey }
  }
}

export const apiKeyService = new ApiKeyService()
