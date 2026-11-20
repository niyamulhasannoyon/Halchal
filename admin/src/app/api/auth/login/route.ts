/**
 * Halchal Admin - Authentication Login Endpoint
 * Architecture: ADR-0018
 *
 * Implements:
 * 1. Brute-force rate limiting per IP and per Email via Upstash / In-Memory
 * 2. Generic error responses (anti-enumeration)
 * 3. Progressive backoff delay on consecutive failures
 * 4. Active admin verification in public.admin_users
 * 5. Session timeout tracking cookies
 * 6. Audit logging of authentication events
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getServiceRoleClient } from '@/lib/supabase/service';
import { checkLoginRateLimit, recordLoginFailure, clearLoginFailures } from '@/lib/rate-limit';
import { logAdminMutation, hashIp } from '@/lib/audit/logger';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  // 1. Check Rate Limit per IP and per Email
  const rateLimit = await checkLoginRateLimit(ip, email);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: 'Too many authentication attempts. Please try again later.',
        retryAfter: rateLimit.retryAfterSec,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfterSec || 900),
        },
      }
    );
  }

  const serverClient = await createSupabaseServerClient();
  const serviceClient = getServiceRoleClient();

  // 2. Perform authentication against Supabase Auth
  const { data: authData, error: authError } = await serverClient.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    // Progressive backoff delay
    await recordLoginFailure(ip, email);

    // Uniform generic error prevents account enumeration
    return NextResponse.json(
      { error: 'Invalid email or password.' },
      { status: 401 }
    );
  }

  const userId = authData.user.id;

  // 3. Verify user exists and is active in admin_users
  const { data: adminRecord, error: adminQueryError } = await serviceClient
    .from('admin_users')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (adminQueryError || !adminRecord || !adminRecord.is_active) {
    // Sign out unauthorized user
    await serverClient.auth.signOut();
    await recordLoginFailure(ip, email);

    return NextResponse.json(
      { error: 'Invalid email or password.' },
      { status: 401 }
    );
  }

  // 4. Reset failure tracker on successful credential validation
  await clearLoginFailures(ip, email);

  // 5. Update last_login_at in admin_users
  const nowIso = new Date().toISOString();
  await serviceClient
    .from('admin_users')
    .update({ last_login_at: nowIso })
    .eq('user_id', userId);

  // 6. Record audit log
  await logAdminMutation(serviceClient, {
    adminId: userId,
    action: 'ADMIN_LOGIN_SUCCESS',
    entityType: 'auth_session',
    entityId: userId,
    reason: 'Successful administrative login',
    ip,
    userAgent,
  });

  // 7. Check MFA Status & AAL
  const { data: aalData } = await serverClient.auth.mfa.getAuthenticatorAssuranceLevel();
  const { data: factorsData } = await serverClient.auth.mfa.listFactors();

  const totpFactors = factorsData?.totp || [];
  const hasEnrolledMfa = totpFactors.some((f) => f.status === 'verified');
  const isAal2 = aalData?.currentLevel === 'aal2';

  const nowSec = Math.floor(Date.now() / 1000);
  const response = NextResponse.json({
    success: true,
    requiresMfa: !isAal2,
    hasEnrolledMfa,
    redirect: !isAal2 ? '/auth/mfa' : '/',
  });

  // Set session lifetime tracking cookies
  response.cookies.set('halchal_admin_session_start', String(nowSec), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  response.cookies.set('halchal_admin_last_active', String(nowSec), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  return response;
}
