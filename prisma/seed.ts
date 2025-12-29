import { PrismaClient, Role } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create admin user
  // Use ADMIN_PASSWORD from environment or default to 'admin123' for local development
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'

  if (!process.env.ADMIN_PASSWORD) {
    console.log('⚠️  Warning: ADMIN_PASSWORD not set, using default password for local development')
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10)
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: hashedPassword,
      role: Role.ADMIN,
    },
  })
  console.log('✅ Created admin user:', admin.email)

  // Create sample novels for "Fortunes Told"
  const novels = [
    {
      title: 'Fortunes Told',
      isbn: '979-8218374495',
      line1: 'the storm was',
      line2: 'unlike any other',
      line3: 'felix had seen',
      line1Raw: 'The storm was unlike',
      line2Raw: 'any other Felix had',
      line3Raw: 'seen in Blackridge.',
      url: 'https://app.example.com/fortunes-told/chapter-1',
      language: 'en',
      chapter: 'Chapter 1',
      pageNumber: 1,
      unlockContent: 'tarot_reading_1',
      metadata: {
        edition: 'hardcover',
        isbn13: '979-8218374495',
        publisher: 'PI & Other Tales, Inc.',
      },
      createdBy: admin.email,
    },
    {
      title: 'Fortunes Told',
      isbn: '979-8218374495',
      line1: 'blackridge had always',
      line2: 'been a place',
      line3: 'of whispered secrets',
      line1Raw: 'Blackridge had always been',
      line2Raw: 'a place of whispered',
      line3Raw: 'secrets and hidden truths.',
      url: 'https://app.example.com/fortunes-told/chapter-2',
      language: 'en',
      chapter: 'Chapter 2',
      pageNumber: 15,
      unlockContent: 'tarot_reading_2',
      metadata: {
        edition: 'hardcover',
        isbn13: '979-8218374495',
        publisher: 'PI & Other Tales, Inc.',
      },
      createdBy: admin.email,
    },
    {
      title: 'Fortunes Told (Swedish Edition)',
      isbn: '979-8218374501',
      line1: 'stormen var olik',
      line2: 'allt annat felix',
      line3: 'hade sett i',
      line1Raw: 'Stormen var olik allt',
      line2Raw: 'annat Felix hade sett',
      line3Raw: 'i Blackridge tidigare.',
      url: 'https://app.example.com/fortunes-told-sv/chapter-1',
      language: 'sv',
      chapter: 'Kapitel 1',
      pageNumber: 1,
      unlockContent: 'tarot_reading_1_sv',
      metadata: {
        edition: 'paperback',
        isbn13: '979-8218374501',
        publisher: 'PI & Other Tales, Inc.',
        translation: 'Swedish',
      },
      createdBy: admin.email,
    },
  ]

  for (const novel of novels) {
    const created = await prisma.novel.upsert({
      where: {
        id: `seed-${novel.line1}-${novel.line2}-${novel.line3}`,
      },
      update: {},
      create: {
        ...novel,
        id: `seed-${novel.line1}-${novel.line2}-${novel.line3}`,
      },
    })
    console.log(`✅ Created novel: ${created.title} (${created.language})`)
  }

  // Create sample API keys
  const apiKeys = [
    {
      key: randomBytes(32).toString('hex'),
      name: 'Production App Key',
      appName: 'Flutter OCR App',
      rateLimit: 1000,
      isActive: true,
    },
    {
      key: randomBytes(32).toString('hex'),
      name: 'Development Key',
      appName: 'Dev Environment',
      rateLimit: 100,
      isActive: true,
    },
  ]

  for (const apiKey of apiKeys) {
    const created = await prisma.apiKey.upsert({
      where: { key: apiKey.key },
      update: {},
      create: apiKey,
    })
    console.log(`✅ Created API key: ${created.name}`)
  }

  // Create sample lookup logs
  const novelIds = await prisma.novel.findMany({ select: { id: true } })

  if (novelIds.length > 0) {
    const logs = [
      {
        line1: 'the storm was',
        line2: 'unlike any other',
        line3: 'felix had seen',
        matchedNovelId: novelIds[0].id,
        success: true,
        responseTimeMs: 234,
        ipAddress: '192.168.1.100',
        userAgent: 'FlutterApp/1.0.0',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        line1: 'blackridge had always',
        line2: 'been a place',
        line3: 'of whispered secrets',
        matchedNovelId: novelIds[1]?.id || novelIds[0].id,
        success: true,
        responseTimeMs: 198,
        ipAddress: '192.168.1.101',
        userAgent: 'FlutterApp/1.0.0',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      },
      {
        line1: 'unknown book entry',
        line2: 'that does not',
        line3: 'exist in database',
        matchedNovelId: null,
        success: false,
        responseTimeMs: 89,
        ipAddress: '192.168.1.102',
        userAgent: 'FlutterApp/1.0.0',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
    ]

    for (const log of logs) {
      await prisma.lookupLog.create({
        data: log,
      })
    }
    console.log(`✅ Created ${logs.length} sample lookup logs`)
  }

  console.log('🎉 Database seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
