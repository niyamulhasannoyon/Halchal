import { NextResponse, type NextRequest } from 'next/server';
import { requireAdminSession } from '@/lib/supabase/service';
import { logAdminMutation } from '@/lib/audit/logger';

/**
 * POST /api/admins/reset-mfa - Reset / Unenroll MFA factors for an administrator
 * Accessible strictly to: owner
 */
export async function POST(request: NextRequest) {
  try {
    const { user, serviceClient } = await requireAdminSession(['owner']);
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const body = await request.json();
    const { userId, reason } = body;

    if (!userId || !reason) {
      return NextResponse.json(
        { error: 'User ID and a non-empty reason are required.' },
        { status: 400 }
      );
    }

    if (reason.trim().length < 5) {
      return NextResponse.json(
        { error: 'Audit reason must be at least 5 characters long.' },
        { status: 400 }
      );
    }

    // List and unenroll factors for target user
    const { data: factors, error: listError } = await serviceClient.auth.admin.mfa.listFactors({
      userId,
    });

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 400 });
    }

    let unenrolledCount = 0;
    if (factors?.factors) {
      for (const factor of factors.factors) {
        await serviceClient.auth.admin.mfa.deleteFactor({
          id: factor.id,
          userId,
        });
        unenrolledCount++;
      }
    }

    // Set requires_mfa to true so they are prompted to re-enroll on next sign-in
    await serviceClient.auth.admin.updateUserById(userId, {
      user_metadata: { requires_mfa: true },
    });

    // Audit log
    await logAdminMutation(serviceClient, {
      adminId: user.id,
      action: 'ADMIN_MFA_RESET',
      entityType: 'admin_user',
      entityId: userId,
      reason: reason.trim(),
      after: { unenrolled_factors: unenrolledCount, requires_mfa: true },
      ip,
      userAgent,
    });

    return NextResponse.json({ success: true, unenrolledCount });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    const status = message.includes('UNAUTHORIZED') ? 401 : message.includes('FORBIDDEN') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
