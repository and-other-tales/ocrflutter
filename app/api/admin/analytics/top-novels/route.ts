import { NextRequest, NextResponse } from 'next/server';
import { generateMockTopNovels } from '@/lib/mock-data';

// GET /api/admin/analytics/top-novels
export async function GET(request: NextRequest) {
  const novels = generateMockTopNovels();

  return NextResponse.json({
    success: true,
    data: { novels },
  });
}
