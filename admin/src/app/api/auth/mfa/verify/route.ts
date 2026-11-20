import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getServiceRoleClient } from '@/lib/supabase/service';
import { logAdminMutation } from '@/lib/audit/logger';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  let body: { factorId?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
  }

  const { factorId, code } = body;
  if (!factorId || !code) {
    return NextResponse.json({ error: 'Factor ID and 6-digit TOTP code are required.' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Create MFA challenge
  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId,
  });

  if (challengeError) {
    return NextResponse.json({ error: challengeError.message }, { status: 400 });
  }

  // 2. Verify challenge with TOTP code
  const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code: code.trim(),
  });

  if (verifyError) {
    return NextResponse.json(
      { error: 'Invalid or expired TOTP verification code. Please try again.' },
      { status: 400 }
    );
  }

  // 3. Log audit event
  const serviceClient = getServiceRoleClient();
  await logAdminMutation(serviceClient, {
    adminId: user.id,
    action: 'ADMIN_MFA_VERIFY',
    entityType: 'auth_mfa',
    entityId: factorId,
    reason: 'TOTP MFA verification completed, upgraded session to AAL2',
    ip,
    userAgent,
  });

  return NextResponse.json({
    success: true,
    currentLevel: 'aal2',
    redirect: '/',
  });
}
