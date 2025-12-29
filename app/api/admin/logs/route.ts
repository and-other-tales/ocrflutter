import { NextRequest, NextResponse } from 'next/server';
import { mockLogs } from '@/lib/mock-data';

// GET /api/admin/logs - List all logs
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const status = searchParams.get('status');

  let filtered = [...mockLogs];

  // Apply status filter
  if (status) {
    filtered = filtered.filter((log) =>
      status === 'success' ? log.success : !log.success
    );
  }

  // Sort by timestamp desc
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Apply pagination
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginated = filtered.slice(start, end);

  return NextResponse.json({
    success: true,
    data: {
      logs: paginated,
      pagination: {
        page,
        limit,
        total: filtered.length,
        total_pages: Math.ceil(filtered.length / limit),
        has_next: end < filtered.length,
        has_prev: page > 1,
      },
    },
  });
}
