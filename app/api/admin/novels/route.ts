import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { novelSchema } from '@/lib/validations/novel';

// GET /api/admin/novels - List all novels
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const language = searchParams.get('language') || '';
    const sort = searchParams.get('sort') || 'created_at';
    const order = searchParams.get('order') || 'desc';

    let query = 'SELECT *, (SELECT COUNT(*) FROM lookup_logs WHERE matched_novel_id = novels.id) as scan_count FROM novels WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    // Apply search filter
    if (search) {
      query += ` AND (title ILIKE $${paramCount} OR isbn ILIKE $${paramCount} OR line1 ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Apply language filter
    if (language) {
      query += ` AND language = $${paramCount}`;
      params.push(language);
      paramCount++;
    }

    // Get total count
    const countQuery = query.replace('SELECT *, (SELECT COUNT(*) FROM lookup_logs WHERE matched_novel_id = novels.id) as scan_count FROM novels', 'SELECT COUNT(*) FROM novels');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Apply sorting
    const validSortColumns = ['title', 'created_at', 'updated_at', 'language'];
    const sortColumn = validSortColumns.includes(sort) ? sort : 'created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortColumn} ${sortOrder}`;

    // Apply pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      data: {
        novels: result.rows,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit),
          has_next: offset + limit < total,
          has_prev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching novels:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch novels',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

// POST /api/admin/novels - Create a new novel
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = novelSchema.parse(body);

    // Check for duplicates
    const duplicateCheck = await pool.query(
      'SELECT id, title FROM novels WHERE line1 = $1 AND line2 = $2 AND line3 = $3',
      [validated.line1, validated.line2, validated.line3]
    );

    if (duplicateCheck.rows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'A novel with these lines already exists',
          code: 'DUPLICATE_ENTRY',
          existing_novel: {
            id: duplicateCheck.rows[0].id,
            title: duplicateCheck.rows[0].title,
          },
        },
        { status: 409 }
      );
    }

    // Insert new novel
    const insertQuery = `
      INSERT INTO novels (
        title, isbn, line1, line2, line3, line1_raw, line2_raw, line3_raw,
        url, language, chapter, page_number, unlock_content, metadata, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      validated.title,
      validated.isbn || null,
      validated.line1,
      validated.line2,
      validated.line3,
      validated.line1_raw || null,
      validated.line2_raw || null,
      validated.line3_raw || null,
      validated.url,
      validated.language,
      validated.chapter || null,
      validated.page_number || null,
      validated.unlock_content || null,
      validated.metadata ? JSON.stringify(validated.metadata) : null,
      'admin@example.com',
    ]);

    return NextResponse.json(
      {
        success: true,
        data: { novel: result.rows[0] },
        message: 'Novel created successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating novel:', error);

    if (error.errors) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors.map((e: any) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An error occurred',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
