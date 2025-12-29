import {
  novelSchema,
  novelUpdateSchema,
  novelQuerySchema,
} from '../novel'

describe('Novel Validation Schemas', () => {
  describe('novelSchema', () => {
    it('should validate complete novel data', () => {
      const validData = {
        title: 'Test Novel',
        isbn: '978-3-16-148410-0',
        line1: 'the quick brown',
        line2: 'fox jumps over',
        line3: 'the lazy dog',
        line1Raw: 'The Quick Brown',
        line2Raw: 'Fox Jumps Over',
        line3Raw: 'The Lazy Dog',
        url: 'https://example.com/novel',
        language: 'en',
        chapter: 'Chapter 1',
        pageNumber: 1,
        unlockContent: 'premium-unlock',
        metadata: { source: 'import' },
      }

      const result = novelSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        // Lines should be transformed to lowercase and trimmed
        expect(result.data.line1).toBe('the quick brown')
        expect(result.data.line2).toBe('fox jumps over')
        expect(result.data.line3).toBe('the lazy dog')
      }
    })

    it('should validate minimal novel data', () => {
      const validData = {
        title: 'Minimal Novel',
        line1: 'line one',
        line2: 'line two',
        line3: 'line three',
        url: 'https://example.com/novel',
        language: 'en',
      }

      const result = novelSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should transform lines to lowercase and trim', () => {
      const data = {
        title: 'Test',
        line1: '  UPPER CASE  ',
        line2: '  Mixed Case  ',
        line3: '  lower case  ',
        url: 'https://example.com/novel',
        language: 'en',
      }

      const result = novelSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.line1).toBe('upper case')
        expect(result.data.line2).toBe('mixed case')
        expect(result.data.line3).toBe('lower case')
      }
    })

    it('should reject empty title', () => {
      const result = novelSchema.safeParse({
        title: '',
        line1: 'test',
        line2: 'test',
        line3: 'test',
        url: 'https://example.com/novel',
        language: 'en',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Title is required')
      }
    })

    it('should reject title over 255 characters', () => {
      const result = novelSchema.safeParse({
        title: 'a'.repeat(256),
        line1: 'test',
        line2: 'test',
        line3: 'test',
        url: 'https://example.com/novel',
        language: 'en',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('too long')
      }
    })

    it('should reject empty lines', () => {
      const result = novelSchema.safeParse({
        title: 'Test',
        line1: '',
        line2: 'test',
        line3: 'test',
        url: 'https://example.com/novel',
        language: 'en',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Line 1 is required')
      }
    })

    it('should reject invalid URL', () => {
      const result = novelSchema.safeParse({
        title: 'Test',
        line1: 'test',
        line2: 'test',
        line3: 'test',
        url: 'not-a-url',
        language: 'en',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('valid URL')
      }
    })

    it('should reject invalid language code', () => {
      const result = novelSchema.safeParse({
        title: 'Test',
        line1: 'test',
        line2: 'test',
        line3: 'test',
        url: 'https://example.com/novel',
        language: 'e', // Too short
      })

      expect(result.success).toBe(false)
    })

    it('should reject language code over 10 characters', () => {
      const result = novelSchema.safeParse({
        title: 'Test',
        line1: 'test',
        line2: 'test',
        line3: 'test',
        url: 'https://example.com/novel',
        language: 'a'.repeat(11),
      })

      expect(result.success).toBe(false)
    })

    it('should transform pageNumber from string to number', () => {
      const result = novelSchema.safeParse({
        title: 'Test',
        line1: 'test',
        line2: 'test',
        line3: 'test',
        url: 'https://example.com/novel',
        language: 'en',
        pageNumber: '42',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.pageNumber).toBe(42)
        expect(typeof result.data.pageNumber).toBe('number')
      }
    })

    it('should reject negative page number', () => {
      const result = novelSchema.safeParse({
        title: 'Test',
        line1: 'test',
        line2: 'test',
        line3: 'test',
        url: 'https://example.com/novel',
        language: 'en',
        pageNumber: -1,
      })

      expect(result.success).toBe(false)
    })

    it('should accept metadata object', () => {
      const result = novelSchema.safeParse({
        title: 'Test',
        line1: 'test',
        line2: 'test',
        line3: 'test',
        url: 'https://example.com/novel',
        language: 'en',
        metadata: {
          source: 'import',
          notes: 'test notes',
          tags: ['fiction', 'romance'],
        },
      })

      expect(result.success).toBe(true)
    })
  })

  describe('novelUpdateSchema', () => {
    it('should allow partial updates', () => {
      const result = novelUpdateSchema.safeParse({
        title: 'Updated Title',
      })

      expect(result.success).toBe(true)
    })

    it('should allow updating just URL', () => {
      const result = novelUpdateSchema.safeParse({
        url: 'https://newdomain.com/novel',
      })

      expect(result.success).toBe(true)
    })

    it('should allow updating just one line', () => {
      const result = novelUpdateSchema.safeParse({
        line1: 'new first line',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.line1).toBe('new first line')
      }
    })

    it('should still validate updated fields', () => {
      const result = novelUpdateSchema.safeParse({
        url: 'invalid-url',
      })

      expect(result.success).toBe(false)
    })

    it('should allow empty update', () => {
      const result = novelUpdateSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })

  describe('novelQuerySchema', () => {
    it('should parse query parameters', () => {
      const result = novelQuerySchema.safeParse({
        page: '2',
        limit: '50',
        search: 'test novel',
        language: 'ja',
        sort: 'title',
        order: 'asc',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(2)
        expect(result.data.limit).toBe(50)
        expect(result.data.search).toBe('test novel')
        expect(result.data.language).toBe('ja')
        expect(result.data.sort).toBe('title')
        expect(result.data.order).toBe('asc')
      }
    })

    it('should default page to 1', () => {
      const result = novelQuerySchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
      }
    })

    it('should default limit to 20', () => {
      const result = novelQuerySchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(20)
      }
    })

    it('should enforce maximum limit of 100', () => {
      const result = novelQuerySchema.safeParse({
        limit: '200',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(100)
      }
    })

    it('should accept valid sort values', () => {
      const validSorts = ['title', 'createdAt', 'updatedAt']

      validSorts.forEach((sort) => {
        const result = novelQuerySchema.safeParse({ sort })
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid sort values', () => {
      const result = novelQuerySchema.safeParse({
        sort: 'invalid',
      })

      expect(result.success).toBe(false)
    })

    it('should accept valid order values', () => {
      const validOrders = ['asc', 'desc']

      validOrders.forEach((order) => {
        const result = novelQuerySchema.safeParse({ order })
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid order values', () => {
      const result = novelQuerySchema.safeParse({
        order: 'invalid',
      })

      expect(result.success).toBe(false)
    })

    it('should handle invalid page numbers gracefully', () => {
      const result = novelQuerySchema.safeParse({
        page: 'abc',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1) // NaN becomes 1
      }
    })
  })
})
