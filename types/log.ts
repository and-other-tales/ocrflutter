export interface LookupLog {
  id: string
  line1: string
  line2: string
  line3: string
  matchedNovelId?: string | null
  matchedNovelTitle?: string
  success: boolean
  responseTimeMs: number
  ipAddress?: string | null
  userAgent?: string | null
  apiKeyId?: string | null
  timestamp: Date | string
}

export interface LogFilters {
  startDate?: string
  endDate?: string
  success?: boolean
  novelId?: string
  ipAddress?: string
}
