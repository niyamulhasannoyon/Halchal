import { NextResponse, type NextRequest } from 'next/server';
import { requireAdminSession } from '@/lib/supabase/service';
import { logAdminMutation } from '@/lib/audit/logger';
import { ADMIN_ROLES, type AdminRole } from '@/lib/auth/permissions';

/**
 * GET /api/admins - List all administrator accounts
 * Accessible to: owner, analyst
 */
export async function GET() {
  try {
    const { serviceClient } = await requireAdminSession(['owner', 'analyst']);

    const { data: admins, error } = await serviceClient
      .from('admin_users')
      .select('user_id, email, role, is_active, created_by, created_at, last_login_at')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ admins });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unauthorized';
    const status = message.includes('UNAUTHORIZED') ? 401 : message.includes('FORBIDDEN') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST /api/admins - Invite / Provision a new administrator
 * Accessible strictly to: owner
 */
export async function POST(request: NextRequest) {
  try {
    const { user, serviceClient } = await requireAdminSession(['owner']);
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const body = await request.json();
    const { email, role, reason } = body;

    if (!email || !role || !reason) {
      return NextResponse.json(
        { error: 'Email, role, and a non-empty reason are required.' },
        { status: 400 }
      );
    }

    if (!ADMIN_ROLES.includes(role as AdminRole)) {
      return NextResponse.json({ error: `Invalid role. Allowed roles: ${ADMIN_ROLES.join(', ')}` }, { status: 400 });
    }

    if (reason.trim().length < 5) {
      return NextResponse.json({ error: 'Audit reason must be at least 5 characters long.' }, { status: 400 });
    }

    // Check if user already exists in auth.users
    const { data: existingUsers } = await serviceClient.auth.admin.listUsers();
    let authUser = existingUsers?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

    if (!authUser) {
      // Create user with mandatory MFA flag
      const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          requires_mfa: true,
          role,
        },
      });

      if (createError) {
        return NextResponse.json({ error: `Failed to create auth identity: ${createError.message}` }, { status: 400 });
      }
      authUser = created.user;
    }

    // Insert into admin_users
    const { error: insertError } = await serviceClient.from('admin_users').insert({
      user_id: authUser.id,
      email: authUser.email,
      role,
      is_active: true,
      created_by: user.id,
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      return NextResponse.json({ error: `Failed to insert admin record: ${insertError.message}` }, { status: 400 });
    }

    // Audit log entry
    await logAdminMutation(serviceClient, {
      adminId: user.id,
      action: 'ADMIN_INVITE',
      entityType: 'admin_user',
      entityId: authUser.id,
      before: null,
      after: { email, role, is_active: true },
      reason: reason.trim(),
      ip,
      userAgent,
    });

    return NextResponse.json({ success: true, userId: authUser.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    const status = message.includes('UNAUTHORIZED') ? 401 : message.includes('FORBIDDEN') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * PATCH /api/admins - Modify administrator role or active state
 * Accessible strictly to: owner
 */
export async function PATCH(request: NextRequest) {
  try {
    const { user, serviceClient } = await requireAdminSession(['owner']);
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const body = await request.json();
    const { userId, role, isActive, reason } = body;

    if (!userId || !reason) {
      return NextResponse.json(
        { error: 'User ID and a non-empty reason are required.' },
        { status: 400 }
      );
    }

    if (reason.trim().length < 5) {
      return NextResponse.json({ error: 'Audit reason must be at least 5 characters long.' }, { status: 400 });
    }

    // Fetch existing admin record
    const { data: existingAdmin, error: fetchError } = await serviceClient
      .from('admin_users')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingAdmin) {
      return NextResponse.json({ error: 'Administrator not found.' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    let action = 'ADMIN_UPDATE';

    if (role !== undefined) {
      if (!ADMIN_ROLES.includes(role as AdminRole)) {
        return NextResponse.json({ error: `Invalid role: ${role}` }, { status: 400 });
      }
      updates.role = role;
      action = 'ADMIN_ROLE_CHANGE';
    }

    if (isActive !== undefined) {
      updates.is_active = Boolean(isActive);
      action = isActive ? 'ADMIN_REACTIVATE' : 'ADMIN_DEACTIVATE';
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
    }

    // Execute update (PostgreSQL trigger will automatically block if last active owner is affected)
    const { error: updateError } = await serviceClient
      .from('admin_users')
      .update(updates)
      .eq('user_id', userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Audit log entry
    await logAdminMutation(serviceClient, {
      adminId: user.id,
      action,
      entityType: 'admin_user',
      entityId: userId,
      before: { role: existingAdmin.role, is_active: existingAdmin.is_active },
      after: updates,
      reason: reason.trim(),
      ip,
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    const status = message.includes('UNAUTHORIZED') ? 401 : message.includes('FORBIDDEN') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
