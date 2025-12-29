import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET /api/admin/novels/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await pool.query('SELECT * FROM novels WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Novel not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    const statsResult = await pool.query(
      'SELECT COUNT(*) as total_scans, COUNT(*) FILTER (WHERE success = true) as successful_scans, MAX(timestamp) as last_scanned, MIN(timestamp) as first_scanned FROM lookup_logs WHERE matched_novel_id = $1',
      [id]
    );

    return NextResponse.json({
      success: true,
      data: {
        novel: result.rows[0],
        stats: {
          total_scans: parseInt(statsResult.rows[0].total_scans) || 0,
          successful_scans: parseInt(statsResult.rows[0].successful_scans) || 0,
          last_scanned: statsResult.rows[0].last_scanned,
          first_scanned: statsResult.rows[0].first_scanned,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching novel:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch novel', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

// PUT /api/admin/novels/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = ['title', 'isbn', 'line1', 'line2', 'line3', 'line1_raw', 'line2_raw', 'line3_raw', 'url', 'language', 'chapter', 'page_number', 'unlock_content', 'metadata'];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        fields.push(field + ' = $' + paramCount);
        values.push(body[field]);
        paramCount++;
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update', code: 'VALIDATION_ERROR' }, { status: 400 });
    }

    values.push(id);
    const updateQuery = 'UPDATE novels SET ' + fields.join(', ') + ', updated_at = CURRENT_TIMESTAMP WHERE id = $' + paramCount + ' RETURNING *';

    const result = await pool.query(updateQuery, values);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Novel not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { novel: result.rows[0] }, message: 'Novel updated successfully' });
  } catch (error) {
    console.error('Error updating novel:', error);
    return NextResponse.json({ success: false, error: 'Failed to update novel', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

// DELETE /api/admin/novels/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await pool.query('DELETE FROM novels WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Novel not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Novel deleted successfully' });
  } catch (error) {
    console.error('Error deleting novel:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete novel', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
