/**
 * Halchal Admin - Client-side Supabase Singleton
 * Architecture: ADR-0018
 *
 * Exposes ONLY the public anonymous / publishable key.
 * Never references SUPABASE_SERVICE_ROLE_KEY.
 */

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (typeof window === 'undefined') {
    throw new Error('getSupabaseBrowserClient must only be invoked in browser environments.');
  }

  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'placeholder-anon-key';

    client = createBrowserClient(url, anonKey);
  }

  return client;
}
