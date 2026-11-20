/**
 * Halchal - Supabase Client & RPC Interface
 * Architecture: ADR-0002, ADR-0007
 */

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

export type TrustTier = 'anonymous' | 'google' | 'phone';

export interface UserTrustInfo {
  tier: TrustTier;
  multiplier: number;
  labelBn: string;
  badgeClass: string;
  isVerified: boolean;
}

/**
 * Evaluates citizen trust tier and multiplier according to Halchal Consensus Architecture
 * - Anonymous: 0.5x
 * - Google OAuth: 1.0x
 * - Phone OTP: 1.5x
 */
export function determineTrustTier(user: User | null | undefined): UserTrustInfo {
  if (!user || user.is_anonymous || user.app_metadata?.provider === 'anonymous') {
    return {
      tier: 'anonymous',
      multiplier: 0.5,
      labelBn: 'বেনামী নাগরিক',
      badgeClass: 'bg-zinc-800 text-zinc-400 border-zinc-700',
      isVerified: false,
    };
  }

  // Phone tier has highest trust multiplier
  if (user.phone && (user.phone_confirmed_at || user.confirmed_at)) {
    return {
      tier: 'phone',
      multiplier: 1.5,
      labelBn: 'মোবাইল যাচাইকৃত',
      badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      isVerified: true,
    };
  }

  // Google or other verified identity
  return {
    tier: 'google',
    multiplier: 1.0,
    labelBn: 'নাগরিক যাচাইকৃত',
    badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    isVerified: true,
  };
}

// Environment variable retrieval with fallbacks for local dev / testing
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'http://127.0.0.1:54321';

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'placeholder-anon-key-for-local-development';

const supabaseServiceKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

let browserClient: SupabaseClient | null = null;

/**
 * Returns a singleton client-side Supabase client with anonymous auth persistence
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (typeof window === 'undefined') {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });
  }

  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return browserClient;
}

/**
 * Returns a server-side Supabase client for Route Handlers and Server Components
 */
export function getSupabaseServerClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });
}

/**
 * Returns an administrative service-role client for trusted backend execution
 */
export function getSupabaseServiceClient(): SupabaseClient | null {
  if (!supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

let isAnonymousDisabled = false;

/**
 * Ensures an anonymous Supabase user session exists in the browser
 */
export async function ensureAnonymousSession(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (isAnonymousDisabled || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('halchal_anon_disabled') === 'true')) {
    return null;
  }

  try {
    const client = getSupabaseBrowserClient();
    const { data: sessionData } = await client.auth.getSession();

    if (sessionData.session?.access_token) {
      return sessionData.session.access_token;
    }

    const { data: signInData, error } = await client.auth.signInAnonymously();
    if (error) {
      if (error.message?.includes('anonymous_provider_disabled') || (error as { status?: number }).status === 422) {
        isAnonymousDisabled = true;
        try {
          sessionStorage.setItem('halchal_anon_disabled', 'true');
        } catch {}
      }
      return null;
    }

    return signInData.session?.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * Retrieves the current valid Bearer auth token for API calls.
 * If no session exists, transparently provisions an anonymous session.
 */
export async function getBrowserAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    const client = getSupabaseBrowserClient();
    const { data } = await client.auth.getSession();
    if (data.session?.access_token) {
      return data.session.access_token;
    }
    return await ensureAnonymousSession();
  } catch {
    return null;
  }
}

/**
 * Initiates Google OAuth sign-in flow.
 * If an anonymous user is logged in, links the identity to preserve user records.
 */
export async function signInWithGoogle(redirectTo?: string) {
  const client = getSupabaseBrowserClient();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const targetRedirect = redirectTo || `${origin}/auth/callback`;

  try {
    const { data: sessionData } = await client.auth.getSession();
    const isAnonymous = sessionData.session?.user?.is_anonymous;

    // If anonymous, attempt linking identity to avoid orphan session
    if (isAnonymous && typeof client.auth.linkIdentity === 'function') {
      const linkRes = await client.auth.linkIdentity({
        provider: 'google',
        options: {
          redirectTo: targetRedirect,
        },
      });
      if (!linkRes.error) {
        return linkRes;
      }
    }
  } catch {
    // Fall back to standard OAuth on linking failure
  }

  return client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: targetRedirect,
    },
  });
}

/**
 * Initiates Phone OTP verification (SMS).
 * Supports both standalone login and upgrading an existing account.
 */
export async function sendPhoneOtp(phone: string) {
  const client = getSupabaseBrowserClient();
  try {
    const { data: sessionData } = await client.auth.getSession();
    const user = sessionData.session?.user;

    // If already authenticated with a permanent account, link the phone number
    if (user && !user.is_anonymous) {
      return await client.auth.updateUser({ phone });
    }

    // Otherwise sign in with phone OTP
    return await client.auth.signInWithOtp({
      phone,
      options: {
        channel: 'sms',
      },
    });
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Verifies Phone OTP token (SMS or Phone Change).
 */
export async function verifyPhoneOtp(phone: string, token: string) {
  const client = getSupabaseBrowserClient();
  try {
    // First try SMS verification
    const smsRes = await client.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    if (!smsRes.error) {
      return smsRes;
    }

    // If that fails, try phone_change verification (when linking to existing account)
    return await client.auth.verifyOtp({
      phone,
      token,
      type: 'phone_change',
    });
  } catch (err: unknown) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Initiates Email OTP or Magic Link login.
 */
export async function sendEmailOtp(email: string, redirectTo?: string) {
  const client = getSupabaseBrowserClient();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo || `${origin}/auth/callback`,
    },
  });
}

/**
 * Verifies 6-digit Email OTP token.
 */
export async function verifyEmailOtp(email: string, token: string) {
  const client = getSupabaseBrowserClient();
  return client.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });
}

/**
 * Signs out the current user session and re-provisions an anonymous session.
 */
export async function signOutUser() {
  const client = getSupabaseBrowserClient();
  try {
    await client.auth.signOut();
  } finally {
    // Re-provision anonymous session so citizen can continue using app seamlessly
    await ensureAnonymousSession();
  }
}

