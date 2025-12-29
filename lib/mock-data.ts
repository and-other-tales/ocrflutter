import { Novel } from '@/types/novel';
import { LookupLog } from '@/types/log';
import { ApiKey } from '@/types/api-key';

// Mock novels database
export const mockNovels: Novel[] = [
  {
    id: '1',
    title: 'Fortunes Told',
    isbn: '979-8218374495',
    line1: 'the storm was',
    line2: 'unlike any other',
    line3: 'felix had seen',
    line1_raw: 'The storm was unlike',
    line2_raw: 'any other Felix had',
    line3_raw: 'seen in Blackridge.',
    url: 'https://app.example.com/fortunes-told',
    language: 'en',
    chapter: 'Chapter 1',
    page_number: 1,
    unlock_content: 'tarot_reading_1',
    metadata: {
      edition: 'hardcover',
      isbn13: '979-8218374495',
    },
    created_at: new Date('2024-01-15T10:30:00Z'),
    updated_at: new Date('2024-01-15T10:30:00Z'),
    created_by: 'admin@example.com',
    scan_count: 142,
  },
  {
    id: '2',
    title: 'Fortunes Told (Swedish Edition)',
    isbn: '979-8218374501',
    line1: 'stormen var',
    line2: 'olik alla andra',
    line3: 'felix hade sett',
    line1_raw: 'Stormen var olik',
    line2_raw: 'alla andra Felix hade',
    line3_raw: 'sett i Blackridge.',
    url: 'https://app.example.com/fortunes-told-sv',
    language: 'sv',
    chapter: 'Kapitel 1',
    page_number: 1,
    unlock_content: 'tarot_reading_1_sv',
    metadata: {
      edition: 'paperback',
      isbn13: '979-8218374501',
    },
    created_at: new Date('2024-01-20T14:00:00Z'),
    updated_at: new Date('2024-01-20T14:00:00Z'),
    created_by: 'admin@example.com',
    scan_count: 89,
  },
  {
    id: '3',
    title: 'Mystery of the Lost Key',
    isbn: '978-1234567890',
    line1: 'sarah stood before',
    line2: 'the old mansion',
    line3: 'her heart racing',
    line1_raw: 'Sarah stood before the',
    line2_raw: 'old mansion, its windows',
    line3_raw: 'dark, her heart racing.',
    url: 'https://app.example.com/lost-key',
    language: 'en',
    chapter: 'Prologue',
    page_number: 3,
    unlock_content: 'mystery_clue_1',
    metadata: {
      edition: 'digital',
      genre: 'mystery',
    },
    created_at: new Date('2024-02-01T09:00:00Z'),
    updated_at: new Date('2024-02-01T09:00:00Z'),
    created_by: 'admin@example.com',
    scan_count: 56,
  },
];

// Mock lookup logs
export const mockLogs: LookupLog[] = [
  {
    id: '1',
    timestamp: new Date('2024-01-20T15:30:00Z').toISOString(),
    line1: 'the storm was',
    line2: 'unlike any other',
    line3: 'felix had seen',
    matched_novel_id: '1',
    matched_novel_title: 'Fortunes Told',
    success: true,
    response_time_ms: 234,
    ip_address: '192.168.1.1',
    user_agent: 'FlutterApp/1.0',
    request_id: 'req_789',
  },
  {
    id: '2',
    timestamp: new Date('2024-01-20T15:25:00Z').toISOString(),
    line1: 'stormen var',
    line2: 'olik alla andra',
    line3: 'felix hade sett',
    matched_novel_id: '2',
    matched_novel_title: 'Fortunes Told (Swedish Edition)',
    success: true,
    response_time_ms: 198,
    ip_address: '192.168.1.2',
    user_agent: 'FlutterApp/1.0',
    request_id: 'req_790',
  },
  {
    id: '3',
    timestamp: new Date('2024-01-20T15:20:00Z').toISOString(),
    line1: 'the storm was',
    line2: 'unlike any othe',
    line3: 'felix had seen',
    success: false,
    response_time_ms: 245,
    ip_address: '192.168.1.1',
    user_agent: 'FlutterApp/1.0',
    request_id: 'req_791',
  },
];

// Mock API keys
export const mockApiKeys: ApiKey[] = [
  {
    id: 'key_1',
    name: 'Production App',
    key: 'mock_live_abc123def456ghi789jkl012',
    rate_limit: 1000,
    usage_count: 456,
    last_used_at: new Date('2024-01-20T14:30:00Z').toISOString(),
    created_at: new Date('2024-01-01T10:00:00Z').toISOString(),
    is_active: true,
    user_id: 'user_1',
    app_name: 'FlutterApp',
  },
  {
    id: 'key_2',
    name: 'Development App',
    key: 'mock_test_xyz789abc456def123ghi890',
    rate_limit: 100,
    usage_count: 52,
    last_used_at: new Date('2024-01-19T16:00:00Z').toISOString(),
    created_at: new Date('2024-01-10T12:00:00Z').toISOString(),
    is_active: true,
    user_id: 'user_1',
    app_name: 'DevApp',
  },
];

// Helper functions to generate mock analytics data
export function generateMockAnalytics() {
  return {
    metrics: {
      total_novels: mockNovels.length,
      total_lookups: 1250,
      total_lookups_today: 85,
      successful_lookups: 1180,
      failed_lookups: 70,
      success_rate: 94.4,
      avg_response_time_ms: 245,
      unique_novels_scanned: mockNovels.length - 1,
    },
    trends: {
      lookups_change_percent: 15.3,
      success_rate_change_percent: -2.1,
      response_time_change_percent: -8.5,
    },
  };
}

export function generateMockTimeline() {
  const timeline = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    timeline.push({
      timestamp: date.toISOString(),
      lookups: Math.floor(Math.random() * 100) + 50,
      successful: Math.floor(Math.random() * 90) + 45,
      failed: Math.floor(Math.random() * 10) + 2,
      avg_response_time: Math.floor(Math.random() * 100) + 200,
    });
  }
  return timeline;
}

export function generateMockTopNovels() {
  return mockNovels
    .sort((a, b) => (b.scan_count || 0) - (a.scan_count || 0))
    .slice(0, 10)
    .map((novel) => ({
      novel_id: novel.id,
      title: novel.title,
      language: novel.language,
      scan_count: novel.scan_count || 0,
      success_count: Math.floor((novel.scan_count || 0) * 0.95),
      success_rate: 95 + Math.random() * 5,
    }));
}
