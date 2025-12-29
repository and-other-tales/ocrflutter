import { NextRequest, NextResponse } from 'next/server';
import { generateMockAnalytics } from '@/lib/mock-data';

// GET /api/admin/analytics/overview
export async function GET(request: NextRequest) {
  const analytics = generateMockAnalytics();

  return NextResponse.json({
    success: true,
    data: analytics,
  });
}
