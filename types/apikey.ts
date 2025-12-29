export interface ApiKey {
  id: string
  key: string
  name: string
  userId?: string | null
  appName?: string | null
  rateLimit: number
  usageCount: number
  lastUsedAt?: Date | string | null
  createdAt: Date | string
  expiresAt?: Date | string | null
  isActive: boolean
}

export interface ApiKeyFormData {
  name: string
  appName?: string
  rateLimit: number
  expiresAt?: Date
}

export interface ApiKeyUsage {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  rateLimitHits: number
  avgResponseTimeMs: number
  timeline: {
    date: string
    requests: number
    successful: number
    failed: number
  }[]
}
