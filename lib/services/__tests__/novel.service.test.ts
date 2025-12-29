// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    novel: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    lookupLog: {
      count: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}))

import { novelService } from '../novel.service'
import { prisma } from '@/lib/prisma'

describe('NovelService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('list', () => {
    it('should list novels with pagination', async () => {
      const mockNovels = [
        {
          id: '1',
          title: 'Novel 1',
          _count: { lookupLogs: 5 },
        },
        {
          id: '2',
          title: 'Novel 2',
          _count: { lookupLogs: 3 },
        },
      ]

      ;(prisma.novel.findMany as jest.Mock).mockResolvedValue(mockNovels)
      ;(prisma.novel.count as jest.Mock).mockResolvedValue(10)

      const result = await novelService.list({ page: 1, limit: 2 })

      expect(result.novels).toHaveLength(2)
      expect(result.novels[0].scanCount).toBe(5)
      expect(result.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 10,
        totalPages: 5,
        hasNext: true,
        hasPrev: false,
      })
    })

    it('should search novels by query', async () => {
      ;(prisma.novel.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.novel.count as jest.Mock).mockResolvedValue(0)

      await novelService.list({ search: 'test query' })

      expect(prisma.novel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { title: { contains: 'test query', mode: 'insensitive' } },
              { isbn: { contains: 'test query', mode: 'insensitive' } },
              { line1: { contains: 'test query', mode: 'insensitive' } },
              { line2: { contains: 'test query', mode: 'insensitive' } },
              { line3: { contains: 'test query', mode: 'insensitive' } },
            ],
          },
        })
      )
    })

    it('should filter novels by language', async () => {
      ;(prisma.novel.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.novel.count as jest.Mock).mockResolvedValue(0)

      await novelService.list({ language: 'ja' })

      expect(prisma.novel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { language: 'ja' },
        })
      )
    })

    it('should sort novels by specified field', async () => {
      ;(prisma.novel.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.novel.count as jest.Mock).mockResolvedValue(0)

      await novelService.list({ sort: 'title', order: 'asc' })

      expect(prisma.novel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { title: 'asc' },
        })
      )
    })

    it('should default to sorting by createdAt desc', async () => {
      ;(prisma.novel.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.novel.count as jest.Mock).mockResolvedValue(0)

      await novelService.list({})

      expect(prisma.novel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      )
    })
  })

  describe('getById', () => {
    it('should return novel with stats', async () => {
      const mockNovel = {
        id: 'novel-123',
        title: 'Test Novel',
        _count: { lookupLogs: 10 },
      }

      ;(prisma.novel.findUnique as jest.Mock).mockResolvedValue(mockNovel)
      ;(prisma.lookupLog.count as jest.Mock).mockResolvedValue(7)
      ;(prisma.lookupLog.findFirst as jest.Mock).mockResolvedValue({
        timestamp: new Date('2024-01-15'),
      })

      const result = await novelService.getById('novel-123')

      expect(result).toEqual({
        novel: mockNovel,
        stats: {
          totalScans: 10,
          successfulScans: 7,
          lastScanned: new Date('2024-01-15'),
        },
      })
    })

    it('should return null if novel not found', async () => {
      ;(prisma.novel.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await novelService.getById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('should create a novel', async () => {
      const novelData = {
        title: 'New Novel',
        line1: 'the quick brown',
        line2: 'fox jumps over',
        line3: 'the lazy dog',
        url: 'https://example.com/novel',
        language: 'en',
      }

      const mockCreated = { id: 'novel-456', ...novelData }

      ;(prisma.novel.findFirst as jest.Mock).mockResolvedValue(null) // No duplicate
      ;(prisma.novel.create as jest.Mock).mockResolvedValue(mockCreated)

      const result = await novelService.create(novelData, 'admin@example.com')

      expect(prisma.novel.create).toHaveBeenCalledWith({
        data: {
          ...novelData,
          pageNumber: null,
          createdBy: 'admin@example.com',
        },
      })

      expect(result).toEqual(mockCreated)
    })

    it('should throw error if duplicate exists', async () => {
      const novelData = {
        title: 'Duplicate Novel',
        line1: 'same line 1',
        line2: 'same line 2',
        line3: 'same line 3',
        url: 'https://example.com/novel',
        language: 'en',
      }

      ;(prisma.novel.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing-novel',
      })

      await expect(novelService.create(novelData)).rejects.toThrow(
        'A novel with these lines already exists'
      )

      expect(prisma.novel.create).not.toHaveBeenCalled()
    })

    it('should set pageNumber to null if not provided', async () => {
      const novelData = {
        title: 'Test',
        line1: 'test',
        line2: 'test',
        line3: 'test',
        url: 'https://example.com',
        language: 'en',
      }

      ;(prisma.novel.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.novel.create as jest.Mock).mockResolvedValue({ id: 'new' })

      await novelService.create(novelData)

      expect(prisma.novel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pageNumber: null,
          }),
        })
      )
    })
  })

  describe('update', () => {
    it('should update novel', async () => {
      const updateData = {
        title: 'Updated Title',
        chapter: 'Chapter 2',
      }

      const mockUpdated = { id: 'novel-123', ...updateData }

      ;(prisma.novel.update as jest.Mock).mockResolvedValue(mockUpdated)

      const result = await novelService.update('novel-123', updateData)

      expect(prisma.novel.update).toHaveBeenCalledWith({
        where: { id: 'novel-123' },
        data: {
          ...updateData,
          pageNumber: undefined,
        },
      })

      expect(result).toEqual(mockUpdated)
    })

    it('should check for duplicates when updating lines', async () => {
      const mockExisting = {
        id: 'novel-123',
        line1: 'original line 1',
        line2: 'original line 2',
        line3: 'original line 3',
        language: 'en',
      }

      ;(prisma.novel.findUnique as jest.Mock).mockResolvedValue(mockExisting)
      ;(prisma.novel.findFirst as jest.Mock).mockResolvedValue(null) // No duplicate
      ;(prisma.novel.update as jest.Mock).mockResolvedValue({})

      await novelService.update('novel-123', {
        line1: 'new line 1',
      })

      expect(prisma.novel.findFirst).toHaveBeenCalledWith({
        where: {
          id: { not: 'novel-123' },
          line1: 'new line 1',
          line2: 'original line 2',
          line3: 'original line 3',
          language: 'en',
        },
      })
    })

    it('should throw error if novel not found during line update', async () => {
      ;(prisma.novel.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(
        novelService.update('non-existent', { line1: 'new' })
      ).rejects.toThrow('Novel not found')
    })

    it('should throw error if duplicate exists during update', async () => {
      const mockExisting = {
        id: 'novel-123',
        line1: 'old',
        line2: 'old',
        line3: 'old',
        language: 'en',
      }

      ;(prisma.novel.findUnique as jest.Mock).mockResolvedValue(mockExisting)
      ;(prisma.novel.findFirst as jest.Mock).mockResolvedValue({
        id: 'other-novel',
      }) // Duplicate found

      await expect(
        novelService.update('novel-123', { line1: 'duplicate' })
      ).rejects.toThrow('A novel with these lines already exists')
    })
  })

  describe('delete', () => {
    it('should delete novel', async () => {
      ;(prisma.novel.delete as jest.Mock).mockResolvedValue({ id: 'novel-123' })

      await novelService.delete('novel-123')

      expect(prisma.novel.delete).toHaveBeenCalledWith({
        where: { id: 'novel-123' },
      })
    })
  })

  describe('bulkImport', () => {
    it('should import multiple novels', async () => {
      const novels = [
        {
          title: 'Novel 1',
          line1: 'line1',
          line2: 'line2',
          line3: 'line3',
          url: 'https://example.com/1',
          language: 'en',
        },
        {
          title: 'Novel 2',
          line1: 'line4',
          line2: 'line5',
          line3: 'line6',
          url: 'https://example.com/2',
          language: 'en',
        },
      ]

      ;(prisma.novel.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.novel.create as jest.Mock).mockResolvedValue({ id: 'new' })

      const result = await novelService.bulkImport(novels, {
        skipDuplicates: true,
      })

      expect(result.imported).toBe(2)
      expect(result.skipped).toBe(0)
      expect(result.failed).toBe(0)
    })

    it('should skip duplicates when skipDuplicates is true', async () => {
      const novels = [
        {
          title: 'Novel 1',
          line1: 'dup',
          line2: 'dup',
          line3: 'dup',
          url: 'https://example.com/1',
          language: 'en',
        },
      ]

      ;(prisma.novel.findFirst as jest.Mock).mockResolvedValue({ id: 'existing' })

      const result = await novelService.bulkImport(novels, {
        skipDuplicates: true,
      })

      expect(result.imported).toBe(0)
      expect(result.skipped).toBe(1)
      expect(result.failed).toBe(0)
      expect(result.details[0].status).toBe('skipped')
    })

    it('should fail duplicates when skipDuplicates is false', async () => {
      const novels = [
        {
          title: 'Novel 1',
          line1: 'dup',
          line2: 'dup',
          line3: 'dup',
          url: 'https://example.com/1',
          language: 'en',
        },
      ]

      ;(prisma.novel.findFirst as jest.Mock).mockResolvedValue({ id: 'existing' })

      const result = await novelService.bulkImport(novels, {
        skipDuplicates: false,
      })

      expect(result.imported).toBe(0)
      expect(result.skipped).toBe(0)
      expect(result.failed).toBe(1)
      expect(result.details[0].status).toBe('failed')
      expect(result.details[0].reason).toContain('Duplicate')
    })

    it('should handle errors during import', async () => {
      const novels = [
        {
          title: 'Novel 1',
          line1: 'test',
          line2: 'test',
          line3: 'test',
          url: 'https://example.com/1',
          language: 'en',
        },
      ]

      ;(prisma.novel.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.novel.create as jest.Mock).mockRejectedValue(new Error('Database error'))

      const result = await novelService.bulkImport(novels, {
        skipDuplicates: true,
      })

      expect(result.imported).toBe(0)
      expect(result.failed).toBe(1)
      expect(result.details[0].reason).toContain('Database error')
    })
  })

  describe('export', () => {
    it('should export novels as JSON', async () => {
      const mockNovels = [
        {
          id: '1',
          title: 'Novel 1',
          isbn: null,
          line1: 'test1',
          line2: 'test2',
          line3: 'test3',
          url: 'https://example.com/1',
          language: 'en',
          chapter: null,
          pageNumber: null,
          unlockContent: null,
          metadata: null,
          line1Raw: null,
          line2Raw: null,
          line3Raw: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ]

      ;(prisma.novel.findMany as jest.Mock).mockResolvedValue(mockNovels)

      const result = await novelService.export('json')

      expect(result).toBe(JSON.stringify(mockNovels, null, 2))
    })

    it('should export novels as CSV', async () => {
      const mockNovels = [
        {
          id: '1',
          title: 'Novel 1',
          isbn: '978-123',
          line1: 'line one',
          line2: 'line two',
          line3: 'line three',
          line1Raw: 'Line One',
          line2Raw: 'Line Two',
          line3Raw: 'Line Three',
          url: 'https://example.com/1',
          language: 'en',
          chapter: 'Chapter 1',
          pageNumber: 5,
          unlockContent: 'premium',
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date('2024-01-02T00:00:00.000Z'),
        },
      ]

      ;(prisma.novel.findMany as jest.Mock).mockResolvedValue(mockNovels)

      const result = await novelService.export('csv')

      expect(result).toContain('id,title,isbn,line1,line2,line3')
      expect(result).toContain('"1","Novel 1","978-123"')
      expect(result).toContain('"line one","line two","line three"')
    })

    it('should handle novels with null fields in CSV', async () => {
      const mockNovels = [
        {
          id: '1',
          title: 'Minimal Novel',
          isbn: null,
          line1: 'test',
          line2: 'test',
          line3: 'test',
          line1Raw: null,
          line2Raw: null,
          line3Raw: null,
          url: 'https://example.com',
          language: 'en',
          chapter: null,
          pageNumber: null,
          unlockContent: null,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        },
      ]

      ;(prisma.novel.findMany as jest.Mock).mockResolvedValue(mockNovels)

      const result = await novelService.export('csv')

      expect(result).toContain('""') // Empty fields for null values
    })

    it('should escape quotes in CSV', async () => {
      const mockNovels = [
        {
          id: '1',
          title: 'Novel with "quotes"',
          isbn: null,
          line1: 'test',
          line2: 'test',
          line3: 'test',
          line1Raw: null,
          line2Raw: null,
          line3Raw: null,
          url: 'https://example.com',
          language: 'en',
          chapter: null,
          pageNumber: null,
          unlockContent: null,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        },
      ]

      ;(prisma.novel.findMany as jest.Mock).mockResolvedValue(mockNovels)

      const result = await novelService.export('csv')

      expect(result).toContain('Novel with ""quotes""')
    })
  })
})
