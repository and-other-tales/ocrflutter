import { NextRequest, NextResponse } from 'next/server';
import { generateMockTimeline } from '@/lib/mock-data';

// GET /api/admin/analytics/timeline
export async function GET(request: NextRequest) {
  const timeline = generateMockTimeline();

  return NextResponse.json({
    success: true,
    data: { timeline },
  });
}
