#!/usr/bin/env tsx

import { startWorker } from '../lib/workers/ocr-worker'
import { validateOcrConfig } from '../lib/config/ocr.config'

console.log('='.repeat(50))
console.log('OCR Background Worker')
console.log('='.repeat(50))

// Validate configuration
console.log('\n[Startup] Validating configuration...')
const configValid = validateOcrConfig()

if (!configValid) {
  console.warn('[Startup] Configuration validation failed, but continuing anyway')
  console.warn('[Startup] Some features may not work correctly')
}

// Start worker
console.log('[Startup] Starting OCR worker...')

try {
  const worker = startWorker()
  console.log('[Startup] Worker started successfully')
  console.log('[Startup] Waiting for OCR jobs...')
} catch (error) {
  console.error('[Startup] Failed to start worker:', error)
  process.exit(1)
}

// Keep process alive
process.stdin.resume()
