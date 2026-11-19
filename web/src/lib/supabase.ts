/**
 * Halchal - Supabase Client & RPC Interface
 * Architecture: ADR-0002, ADR-0007
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

/**
 * Ensures an anonymous Supabase user session exists in the browser
 */
export async function ensureAnonymousSession(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  try {
    const client = getSupabaseBrowserClient();
    const { data: sessionData } = await client.auth.getSession();

    if (sessionData.session?.access_token) {
      return sessionData.session.access_token;
    }

    const { data: signInData, error } = await client.auth.signInAnonymously();
    if (error) {
      console.warn('Anonymous auth sign-in warning:', error.message);
      return null;
    }

    return signInData.session?.access_token ?? null;
  } catch (err) {
    console.warn('Supabase auth initialization error:', err);
    return null;
  }
}

/**
 * Initiates Google OAuth sign-in flow
 */
export async function signInWithGoogle(redirectTo?: string) {
  const client = getSupabaseBrowserClient();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo || `${origin}/auth/callback`,
    },
  });
}

/**
 * Signs out the current user session
 */
export async function signOutUser() {
  const client = getSupabaseBrowserClient();
  return client.auth.signOut();
}

