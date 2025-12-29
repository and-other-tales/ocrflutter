import { NextRequest, NextResponse } from 'next/server';
import { mockApiKeys } from '@/lib/mock-data';

// GET /api/admin/api-keys - List all API keys
export async function GET(request: NextRequest) {
  // Mask the API keys for security
  const maskedKeys = mockApiKeys.map((key) => ({
    ...key,
    key: `${key.key.substring(0, 12)}**********************${key.key.slice(-6)}`,
  }));

  return NextResponse.json({
    success: true,
    data: { api_keys: maskedKeys },
  });
}

// POST /api/admin/api-keys - Create a new API key
export async function POST(request: NextRequest) {
  const body = await request.json();

  const newKey = {
    id: `key_${mockApiKeys.length + 1}`,
    name: body.name,
    key: `sk_${body.app_name ? 'live' : 'test'}_${Math.random().toString(36).substring(2)}`,
    app_name: body.app_name,
    rate_limit: body.rate_limit || 100,
    usage_count: 0,
    created_at: new Date().toISOString(),
    expires_at: body.expires_at,
    is_active: true,
  };

  mockApiKeys.push(newKey);

  return NextResponse.json(
    {
      success: true,
      data: { api_key: newKey },
      message: 'API key created. Save the key now - it won\'t be shown again!',
    },
    { status: 201 }
  );
}
