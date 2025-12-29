import { NextRequest, NextResponse } from 'next/server';
import { mockNovels } from '@/lib/mock-data';

// POST /api/admin/test-lookup - Test the lookup functionality
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { line1, line2, line3 } = body;

  const startTime = Date.now();

  // Convert array format to string if needed
  const l1 = Array.isArray(line1) ? line1.join(' ').toLowerCase() : line1.toLowerCase();
  const l2 = Array.isArray(line2) ? line2.join(' ').toLowerCase() : line2.toLowerCase();
  const l3 = Array.isArray(line3) ? line3.join(' ').toLowerCase() : line3.toLowerCase();

  // Search for matching novel
  const match = mockNovels.find(
    (novel) =>
      novel.line1 === l1 &&
      novel.line2 === l2 &&
      novel.line3 === l3
  );

  const responseTime = Date.now() - startTime;

  if (match) {
    return NextResponse.json({
      success: true,
      data: {
        match: true,
        novel: {
          id: match.id,
          title: match.title,
          url: match.url,
        },
        matching_strategy: 'exact',
        response_time_ms: responseTime,
        debug_info: {
          line1_matches: 1,
          line2_matches: 1,
          line3_matches: 1,
        },
      },
    });
  }

  // Find similar matches
  const suggestions = mockNovels
    .filter((novel) => {
      const matches = [
        novel.line1 === l1,
        novel.line2 === l2,
        novel.line3 === l3,
      ].filter(Boolean).length;
      return matches >= 2;
    })
    .map((novel) => ({
      novel_id: novel.id,
      title: novel.title,
      similarity_score: 0.85,
    }));

  return NextResponse.json({
    success: false,
    data: {
      match: false,
      message: 'No matching novel found',
      debug_info: {
        line1_matches: 0,
        suggestions,
      },
    },
  });
}
