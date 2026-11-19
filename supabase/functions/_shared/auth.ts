/**
 * Supabase JWT Authentication & Verification Module
 * Verifies anonymous and upgraded JWTs.
 */

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { Errors } from './errors.ts';

export interface VerifiedAuthUser {
  userId: string;
  user: User;
  isAnonymous: boolean;
  providers: string[];
}

export interface IAuthVerifier {
  verifyToken(authHeader: string | null): Promise<VerifiedAuthUser>;
}

export class SupabaseAuthVerifier implements IAuthVerifier {
  private client: SupabaseClient;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    const url = supabaseUrl || Deno.env.get('SUPABASE_URL') || '';
    const key = supabaseKey || Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    this.client = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  async verifyToken(authHeader: string | null): Promise<VerifiedAuthUser> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw Errors.UNAUTHORIZED();
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      throw Errors.UNAUTHORIZED();
    }

    const { data, error } = await this.client.auth.getUser(token);
    if (error || !data.user) {
      throw Errors.UNAUTHORIZED();
    }

    const user = data.user;
    const providers = (user.app_metadata?.providers as string[]) || [user.app_metadata?.provider].filter(Boolean) as string[];
    const isAnonymous = user.is_anonymous === true || user.app_metadata?.provider === 'anonymous';

    return {
      userId: user.id,
      user,
      isAnonymous,
      providers,
    };
  }
}

/**
 * Mock Auth Verifier for unit and abuse tests without requiring a live Supabase server
 */
export class MockAuthVerifier implements IAuthVerifier {
  private validUsers = new Map<string, VerifiedAuthUser>();

  constructor(users?: Record<string, Partial<VerifiedAuthUser>>) {
    if (users) {
      for (const [token, user] of Object.entries(users)) {
        this.registerUser(token, user);
      }
    }
  }

  registerUser(token: string, partial: Partial<VerifiedAuthUser>): void {
    const userId = partial.userId || '00000000-0000-0000-0000-000000000001';
    const mockUser: User = {
      id: userId,
      app_metadata: { provider: partial.isAnonymous ? 'anonymous' : 'google' },
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      ...(partial.user || {}),
    } as User;

    this.validUsers.set(token, {
      userId,
      user: mockUser,
      isAnonymous: partial.isAnonymous ?? true,
      providers: partial.providers || (partial.isAnonymous ? ['anonymous'] : ['google']),
    });
  }

  async verifyToken(authHeader: string | null): Promise<VerifiedAuthUser> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw Errors.UNAUTHORIZED();
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const verified = this.validUsers.get(token);

    if (!verified) {
      throw Errors.UNAUTHORIZED();
    }

    return verified;
  }
}

let defaultVerifier: IAuthVerifier | null = null;

export function getAuthVerifier(custom?: IAuthVerifier): IAuthVerifier {
  if (custom) return custom;
  if (!defaultVerifier) {
    defaultVerifier = new SupabaseAuthVerifier();
  }
  return defaultVerifier;
}

export function setGlobalAuthVerifier(verifier: IAuthVerifier | null): void {
  defaultVerifier = verifier;
}
