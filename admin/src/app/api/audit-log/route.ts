import { NextResponse, type NextRequest } from 'next/server';
import { requireAdminSession } from '@/lib/supabase/service';
import { hasPermission } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  try {
    const { adminUser, serviceClient } = await requireAdminSession([
      'owner',
      'moderator',
      'content_editor',
      'analyst',
    ]);

    const { searchParams } = request.nextUrl;
    const adminId = searchParams.get('adminId');
    const action = searchParams.get('action');
    const entityType = searchParams.get('entityType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 1000);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // CSV Export authorization guard: strictly owner or analyst
    if (format === 'csv') {
      if (!hasPermission(adminUser.role, 'audit_log:export')) {
        return NextResponse.json(
          { error: 'FORBIDDEN: Audit log export is restricted to owners and analysts.' },
          { status: 403 }
        );
      }
    }

    let query = serviceClient
      .from('admin_audit_log')
      .select('id, at, admin_id, action, entity_type, entity_id, before, after, reason, ip_hash, user_agent', {
        count: 'exact',
      })
      .order('at', { ascending: false });

    if (adminId) query = query.eq('admin_id', adminId);
    if (action) query = query.eq('action', action);
    if (entityType) query = query.eq('entity_type', entityType);
    if (startDate) query = query.gte('at', startDate);
    if (endDate) query = query.lte('at', endDate);

    if (format !== 'csv') {
      query = query.range(offset, offset + limit - 1);
    } else {
      query = query.limit(5000);
    }

    const { data: logs, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (format === 'csv') {
      const csvHeader = ['Timestamp', 'Admin ID', 'Action', 'Entity Type', 'Entity ID', 'Reason', 'IP Hash', 'User Agent'];
      const csvRows = (logs || []).map((l) => [
        `"${l.at}"`,
        `"${l.admin_id}"`,
        `"${l.action}"`,
        `"${l.entity_type}"`,
        `"${l.entity_id || ''}"`,
        `"${(l.reason || '').replace(/"/g, '""')}"`,
        `"${l.ip_hash || ''}"`,
        `"${(l.user_agent || '').replace(/"/g, '""')}"`,
      ]);

      const csvContent = [csvHeader.join(','), ...csvRows.map((r) => r.join(','))].join('\n');

      return new Response(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="halchal-admin-audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
          'X-Robots-Tag': 'noindex, nofollow',
        },
      });
    }

    return NextResponse.json({
      logs: logs || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    const status = message.includes('UNAUTHORIZED') ? 401 : message.includes('FORBIDDEN') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
