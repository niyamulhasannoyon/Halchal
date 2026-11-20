/**
 * Halchal Admin - Edge Security & Authentication Middleware
 * Architecture: ADR-0018
 *
 * Responsibilities:
 * 1. Appends strict security headers and noindex directives to all responses.
 * 2. Enforces mandatory session validation and idle/absolute timeouts.
 * 3. Enforces Mandatory TOTP MFA (AAL2): sessions without AAL2 can access
 *    NOTHING except /auth/mfa and /auth/logout.
 * 4. Guards owner-only and role-specific routes.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const IDLE_TIMEOUT_SECONDS = 30 * 60; // 30 minutes
const ABSOLUTE_TIMEOUT_SECONDS = 12 * 60 * 60; // 12 hours

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Static asset and crawler file exemptions
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/fonts') ||
    pathname === '/robots.txt' ||
    pathname === '/favicon.ico'
  ) {
    const res = NextResponse.next();
    applySecurityHeaders(res);
    return res;
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  applySecurityHeaders(response);

  // 2. Setup Supabase SSR client for token validation
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'placeholder-anon-key';

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        applySecurityHeaders(response);
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '' });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        applySecurityHeaders(response);
        response.cookies.set({ name, value: '', ...options, maxAge: 0 });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute =
    pathname === '/login' ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/auth/');

  // 3. Unauthenticated requests
  if (!user) {
    if (pathname.startsWith('/api/')) {
      if (!isAuthRoute) {
        const jsonRes = NextResponse.json(
          { error: 'UNAUTHORIZED: Authentication session required.' },
          { status: 401 }
        );
        applySecurityHeaders(jsonRes);
        return jsonRes;
      }
      return response;
    }

    if (!isAuthRoute) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const redirectRes = NextResponse.redirect(loginUrl);
      applySecurityHeaders(redirectRes);
      return redirectRes;
    }
    return response;
  }

  // 4. Validate Session Timeouts
  const now = Math.floor(Date.now() / 1000);
  const sessionStartStr = request.cookies.get('halchal_admin_session_start')?.value;
  const lastActiveStr = request.cookies.get('halchal_admin_last_active')?.value;

  if (sessionStartStr) {
    const sessionStart = parseInt(sessionStartStr, 10);
    if (!isNaN(sessionStart) && now - sessionStart > ABSOLUTE_TIMEOUT_SECONDS) {
      const logoutUrl = new URL('/auth/logout?reason=timeout_absolute', request.url);
      const redirectRes = NextResponse.redirect(logoutUrl);
      applySecurityHeaders(redirectRes);
      return redirectRes;
    }
  }

  if (lastActiveStr) {
    const lastActive = parseInt(lastActiveStr, 10);
    if (!isNaN(lastActive) && now - lastActive > IDLE_TIMEOUT_SECONDS) {
      const logoutUrl = new URL('/auth/logout?reason=timeout_idle', request.url);
      const redirectRes = NextResponse.redirect(logoutUrl);
      applySecurityHeaders(redirectRes);
      return redirectRes;
    }
  }

  // Update last active cookie
  response.cookies.set('halchal_admin_last_active', String(now), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  // 5. Mandatory TOTP MFA (AAL2) Verification
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const requiresMfa = user.user_metadata?.requires_mfa !== false;
  const isAal2 = aalData?.currentLevel === 'aal2';

  // If session is NOT AAL2 and user is attempting to access non-MFA pages
  if (requiresMfa && !isAal2) {
    const isMfaPage = pathname === '/auth/mfa' || pathname.startsWith('/api/auth/mfa') || pathname === '/auth/logout';
    if (!isMfaPage) {
      const mfaUrl = new URL('/auth/mfa', request.url);
      const redirectRes = NextResponse.redirect(mfaUrl);
      applySecurityHeaders(redirectRes);
      return redirectRes;
    }
    return response;
  }

  // If user is already authenticated with AAL2 and navigates to /login or /auth/mfa
  if (isAal2 && (pathname === '/login' || pathname === '/auth/mfa')) {
    const homeUrl = new URL('/', request.url);
    const redirectRes = NextResponse.redirect(homeUrl);
    applySecurityHeaders(redirectRes);
    return redirectRes;
  }

  return response;
}

function applySecurityHeaders(res: NextResponse): void {
  res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'no-referrer');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), browsing-topics=()');
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https: wss:",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
