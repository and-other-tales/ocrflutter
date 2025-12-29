export interface Novel {
  id: string
  title: string
  isbn?: string | null
  line1: string
  line2: string
  line3: string
  line1Raw?: string | null
  line2Raw?: string | null
  line3Raw?: string | null
  url: string
  language: string
  chapter?: string | null
  pageNumber?: number | null
  unlockContent?: string | null
  metadata?: any
  createdAt: Date | string
  updatedAt: Date | string
  createdBy?: string | null
}

export interface NovelFormData {
  title: string
  isbn?: string
  line1: string
  line2: string
  line3: string
  line1Raw?: string
  line2Raw?: string
  line3Raw?: string
  url: string
  language: string
  chapter?: string
  pageNumber?: number
  unlockContent?: string
  metadata?: Record<string, any>
}

export interface NovelWithStats extends Novel {
  scanCount?: number
  successCount?: number
  lastScanned?: Date | string
}
