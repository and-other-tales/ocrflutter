import { ImageAnnotatorClient } from '@google-cloud/vision'
import { ocrConfig } from '../config/ocr.config'
import { OcrError, OcrErrorCodes } from '../utils/errors'
import pdfParse from 'pdf-parse'

export interface ExtractedWords {
  line1Words: string[]
  line2Words: string[]
  line3Words: string[]
  rawText: string
  confidence: number
  orientation: 'HORIZONTAL' | 'VERTICAL_TATEGAKI' | 'MIXED' | 'UNKNOWN'
  metadata: {
    detectedLanguage?: string
    totalBlocks: number
    processingTimeMs: number
  }
}

class OcrService {
  private visionClient: ImageAnnotatorClient

  constructor() {
    // Initialize Google Cloud Vision API client
    this.visionClient = new ImageAnnotatorClient({
      projectId: ocrConfig.google.projectId,
      ...(ocrConfig.google.credentials && {
        keyFilename: ocrConfig.google.credentials,
      }),
    })
  }

  /**
   * Extract text and words from a PDF buffer
   */
  async extractTextFromPdf(
    pdfBuffer: Buffer,
    orientationHint?: 'HORIZONTAL' | 'VERTICAL_TATEGAKI'
  ): Promise<ExtractedWords> {
    const startTime = Date.now()

    try {
      // First, extract first page using pdf-parse
      const pdfData = await pdfParse(pdfBuffer, {
        max: 1, // Only process first page
      })

      if (!pdfData.text || pdfData.text.trim().length === 0) {
        // PDF might be scanned image, use Vision API OCR
        return await this.extractTextWithVisionApi(pdfBuffer, orientationHint, startTime)
      }

      // PDF has extractable text, but we still use Vision API for better accuracy
      // and orientation detection
      return await this.extractTextWithVisionApi(pdfBuffer, orientationHint, startTime)
    } catch (error: any) {
      console.error('OCR extraction error:', error)
      throw new OcrError(
        `Failed to extract text: ${error.message}`,
        OcrErrorCodes.VISION_API_ERROR,
        500
      )
    }
  }

  /**
   * Use Google Cloud Vision API for text detection
   */
  private async extractTextWithVisionApi(
    pdfBuffer: Buffer,
    orientationHint?: 'HORIZONTAL' | 'VERTICAL_TATEGAKI',
    startTime?: number
  ): Promise<ExtractedWords> {
    try {
      // Convert PDF to image for Vision API (first page only)
      const [result] = await this.visionClient.documentTextDetection({
        image: { content: pdfBuffer },
      })

      const fullTextAnnotation = result.fullTextAnnotation

      if (!fullTextAnnotation || !fullTextAnnotation.text) {
        throw new OcrError(
          'No text could be extracted from the PDF',
          OcrErrorCodes.NO_TEXT_EXTRACTED,
          400
        )
      }

      const rawText = fullTextAnnotation.text
      const pages = fullTextAnnotation.pages || []

      // Detect orientation from Vision API response
      const detectedOrientation = this.detectOrientation(pages, orientationHint)

      // Extract lines based on orientation
      const lines = this.extractLines(pages, detectedOrientation)

      // Filter out headers, page numbers, and extract content lines
      const contentLines = this.filterContentLines(lines)

      if (contentLines.length < 3) {
        throw new OcrError(
          'Could not extract at least 3 lines of content',
          OcrErrorCodes.NO_TEXT_EXTRACTED,
          400
        )
      }

      // Extract first 3 words from first 3 lines
      const line1Words = this.extractWords(contentLines[0], 3)
      const line2Words = this.extractWords(contentLines[1], 3)
      const line3Words = this.extractWords(contentLines[2], 3)

      // Calculate average confidence
      const confidence = this.calculateConfidence(pages)

      // Detect language
      const detectedLanguage = this.detectLanguage(pages)

      const processingTimeMs = startTime ? Date.now() - startTime : 0

      return {
        line1Words,
        line2Words,
        line3Words,
        rawText,
        confidence,
        orientation: detectedOrientation,
        metadata: {
          detectedLanguage,
          totalBlocks: pages.reduce(
            (sum, page) => sum + (page.blocks?.length || 0),
            0
          ),
          processingTimeMs,
        },
      }
    } catch (error: any) {
      if (error instanceof OcrError) {
        throw error
      }
      console.error('Vision API error:', error)
      throw new OcrError(
        `Vision API failed: ${error.message}`,
        OcrErrorCodes.VISION_API_ERROR,
        500
      )
    }
  }

  /**
   * Detect text orientation from Vision API response
   */
  private detectOrientation(
    pages: any[],
    hint?: 'HORIZONTAL' | 'VERTICAL_TATEGAKI'
  ): 'HORIZONTAL' | 'VERTICAL_TATEGAKI' | 'MIXED' | 'UNKNOWN' {
    if (pages.length === 0) return 'UNKNOWN'

    let horizontalCount = 0
    let verticalCount = 0

    for (const page of pages) {
      const blocks = page.blocks || []

      for (const block of blocks) {
        const paragraphs = block.paragraphs || []

        for (const paragraph of paragraphs) {
          const words = paragraph.words || []

          for (const word of words) {
            // Check word orientation based on bounding box
            const vertices = word.boundingBox?.vertices || []
            if (vertices.length === 4) {
              const width = Math.abs(vertices[1].x - vertices[0].x)
              const height = Math.abs(vertices[2].y - vertices[1].y)

              // Vertical text typically has height > width
              if (height > width * 1.5) {
                verticalCount++
              } else {
                horizontalCount++
              }
            }
          }
        }
      }
    }

    // Use hint if provided and orientation is ambiguous
    if (hint && Math.abs(horizontalCount - verticalCount) < 10) {
      return hint
    }

    // Determine orientation based on counts
    const total = horizontalCount + verticalCount
    if (total === 0) return 'UNKNOWN'

    const verticalRatio = verticalCount / total

    if (verticalRatio > 0.7) {
      return 'VERTICAL_TATEGAKI'
    } else if (verticalRatio < 0.3) {
      return 'HORIZONTAL'
    } else {
      return 'MIXED'
    }
  }

  /**
   * Extract text lines from Vision API pages
   */
  private extractLines(
    pages: any[],
    orientation: 'HORIZONTAL' | 'VERTICAL_TATEGAKI' | 'MIXED' | 'UNKNOWN'
  ): string[] {
    const lines: string[] = []

    for (const page of pages) {
      const blocks = page.blocks || []

      for (const block of blocks) {
        const paragraphs = block.paragraphs || []

        for (const paragraph of paragraphs) {
          // Extract line text
          const lineText = this.extractParagraphText(paragraph)
          if (lineText.trim()) {
            lines.push(lineText.trim())
          }
        }
      }
    }

    return lines
  }

  /**
   * Extract text from a paragraph
   */
  private extractParagraphText(paragraph: any): string {
    const words = paragraph.words || []
    const wordTexts: string[] = []

    for (const word of words) {
      const symbols = word.symbols || []
      const wordText = symbols
        .map((symbol: any) => symbol.text || '')
        .join('')
      wordTexts.push(wordText)
    }

    return wordTexts.join(' ')
  }

  /**
   * Filter out headers, page numbers, and other non-content lines
   */
  private filterContentLines(lines: string[]): string[] {
    const contentLines: string[] = []

    for (const line of lines) {
      // Skip empty lines
      if (!line.trim()) continue

      // Skip lines that are just numbers (likely page numbers)
      if (/^\d+$/.test(line.trim())) continue

      // Skip very short lines (less than 3 characters)
      if (line.trim().length < 3) continue

      // Skip lines that look like headers (all caps, very short)
      if (line === line.toUpperCase() && line.length < 20) {
        // But include if it's Japanese (no uppercase concept)
        if (!/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/.test(line)) {
          continue
        }
      }

      contentLines.push(line)
    }

    return contentLines
  }

  /**
   * Extract first N words from a line
   */
  private extractWords(line: string, count: number): string[] {
    // For Japanese, we need to handle differently
    // Check if line contains Japanese characters
    const hasJapanese = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/.test(
      line
    )

    if (hasJapanese) {
      // For Japanese, split by spaces first, then by characters if needed
      const spaceSplit = line.trim().split(/\s+/)
      if (spaceSplit.length >= count) {
        return spaceSplit.slice(0, count)
      }

      // If not enough space-separated words, treat each character group as a word
      const words: string[] = []
      const chars = line.trim().replace(/\s+/g, '')

      // Group characters into words (approximation)
      // For now, we'll use a simple approach: each kanji or 2-3 kana as a word
      let currentWord = ''
      for (let i = 0; i < chars.length && words.length < count; i++) {
        const char = chars[i]
        currentWord += char

        // Kanji: treat as individual word
        if (/[\u4e00-\u9faf]/.test(char)) {
          words.push(currentWord)
          currentWord = ''
        }
        // Hiragana/Katakana: group 2-3 together
        else if (
          /[\u3040-\u309f\u30a0-\u30ff]/.test(char) &&
          currentWord.length >= 2
        ) {
          words.push(currentWord)
          currentWord = ''
        }
      }

      if (currentWord && words.length < count) {
        words.push(currentWord)
      }

      return words.slice(0, count)
    } else {
      // For non-Japanese, simple space split
      const words = line
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0)
      return words.slice(0, count).map((w) => w.toLowerCase())
    }
  }

  /**
   * Calculate average confidence from Vision API response
   */
  private calculateConfidence(pages: any[]): number {
    let totalConfidence = 0
    let wordCount = 0

    for (const page of pages) {
      const blocks = page.blocks || []

      for (const block of blocks) {
        const paragraphs = block.paragraphs || []

        for (const paragraph of paragraphs) {
          const words = paragraph.words || []

          for (const word of words) {
            if (word.confidence !== undefined && word.confidence !== null) {
              totalConfidence += word.confidence
              wordCount++
            }
          }
        }
      }
    }

    if (wordCount === 0) return 0

    // Convert to percentage (0-100)
    return Math.round((totalConfidence / wordCount) * 100)
  }

  /**
   * Detect language from Vision API response
   */
  private detectLanguage(pages: any[]): string | undefined {
    if (pages.length === 0) return undefined

    // Get language hints from first page
    const page = pages[0]
    const property = page.property

    if (property && property.detectedLanguages && property.detectedLanguages.length > 0) {
      return property.detectedLanguages[0].languageCode
    }

    return undefined
  }
}

export const ocrService = new OcrService()
