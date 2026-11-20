/**
 * Halchal Admin - Google OAuth Callback Route Handler
 * Architecture: ADR-0018
 *
 * Enforces:
 * 1. Code exchange for session cookies via Supabase SSR
 * 2. Strict whitelist verification against public.admin_users
 * 3. Immediate sign-out and rejection of non-authorized Google accounts
 * 4. Automatic user_id binding on initial Google sign-in
 * 5. Session timeout tracking cookies
 * 6. Audit logging of authentication events
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getServiceRoleClient } from '@/lib/supabase/service';
import { logAdminMutation } from '@/lib/audit/logger';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const errorParam = requestUrl.searchParams.get('error') || requestUrl.searchParams.get('error_description');

  if (errorParam) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorParam)}`, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_oauth_code', request.url));
  }

  const supabase = await createSupabaseServerClient();
  const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !sessionData.user) {
    return NextResponse.redirect(new URL('/login?error=oauth_exchange_failed', request.url));
  }

  const user = sessionData.user;
  const email = user.email?.toLowerCase().trim();

  if (!email) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/login?error=missing_email', request.url));
  }

  // Verify email against public.admin_users directory
  const serviceClient = getServiceRoleClient();
  const { data: adminRecord, error: adminQueryError } = await serviceClient
    .from('admin_users')
    .select('*')
    .ilike('email', email)
    .single();

  if (adminQueryError || !adminRecord || !adminRecord.is_active) {
    // Unauthorized Google account - terminate session immediately
    await supabase.auth.signOut();

    const rejectResponse = NextResponse.redirect(
      new URL('/login?error=unauthorized_email', request.url)
    );
    rejectResponse.cookies.delete('halchal_admin_session_start');
    rejectResponse.cookies.delete('halchal_admin_last_active');
    return rejectResponse;
  }

  // Bind auth.users(id) to admin_users record if not already linked
  const updates: Record<string, unknown> = {
    last_login_at: new Date().toISOString(),
  };

  if (adminRecord.user_id !== user.id) {
    updates.user_id = user.id;
  }

  await serviceClient
    .from('admin_users')
    .update(updates)
    .eq('id', adminRecord.id);

  // Record audit log
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  await logAdminMutation(serviceClient, {
    adminId: user.id,
    action: 'ADMIN_LOGIN_SUCCESS',
    entityType: 'google_oauth_session',
    entityId: user.id,
    reason: `Successful Google OAuth authentication as ${adminRecord.role}`,
    ip,
    userAgent,
  });

  // Check MFA status
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const { data: factorsData } = await supabase.auth.mfa.listFactors();

  const hasEnrolledMfa = factorsData?.totp?.some((f) => f.status === 'verified');
  const isAal2 = aalData?.currentLevel === 'aal2';

  const targetPath = hasEnrolledMfa && !isAal2 ? '/auth/mfa' : '/';
  const response = NextResponse.redirect(new URL(targetPath, request.url));

  // Set session lifetime cookies
  const nowSec = Math.floor(Date.now() / 1000);
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
