/**
 * Halchal (হালচাল) - Account Linking & Trust Tier Unit Tests
 */

import { assertEquals } from '@std/assert';
import {
  determineUserTier,
  TRUST_TIER_MULTIPLIERS,
  syncUserTier,
} from '../_shared/account-linking.ts';
import { User, SupabaseClient } from '@supabase/supabase-js';

Deno.test('account-linking: correctly identifies anonymous tier (x0.5)', () => {
  const anonUser: User = {
    id: 'anon-user-1',
    app_metadata: { provider: 'anonymous' },
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    is_anonymous: true,
  } as User;

  const tier = determineUserTier(anonUser);
  assertEquals(tier, 'anonymous');
  assertEquals(TRUST_TIER_MULTIPLIERS[tier], 0.5);
});

Deno.test('account-linking: correctly identifies google tier (x1.0)', () => {
  const googleUser: User = {
    id: 'google-user-1',
    app_metadata: { provider: 'google', providers: ['google'] },
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    identities: [
      {
        id: 'ident-google',
        user_id: 'google-user-1',
        identity_data: {},
        provider: 'google',
        last_sign_in_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  } as User;

  const tier = determineUserTier(googleUser);
  assertEquals(tier, 'google');
  assertEquals(TRUST_TIER_MULTIPLIERS[tier], 1.0);
});

Deno.test('account-linking: correctly identifies phone tier (x1.5)', () => {
  const phoneUser: User = {
    id: 'phone-user-1',
    phone: '+8801700000000',
    phone_confirmed_at: new Date().toISOString(),
    app_metadata: { provider: 'phone' },
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  } as User;

  const tier = determineUserTier(phoneUser);
  assertEquals(tier, 'phone');
  assertEquals(TRUST_TIER_MULTIPLIERS[tier], 1.5);
});

Deno.test('account-linking: syncUserTier updates database profile row', async () => {
  const updatedRows: Array<{ id: string; tier: string }> = [];

  const mockSupabaseAdmin = {
    from: (_table: string) => ({
      update: (fields: { tier: string }) => ({
        eq: (_col: string, val: string) => {
          updatedRows.push({ id: val, tier: fields.tier });
          return Promise.resolve({ error: null });
        },
      }),
    }),
  } as unknown as SupabaseClient;

  const googleUser: User = {
    id: 'u-sync-1',
    app_metadata: { provider: 'google' },
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    identities: [{ provider: 'google' } as unknown],
  } as User;

  const result = await syncUserTier(mockSupabaseAdmin, 'u-sync-1', googleUser);
  assertEquals(result.tier, 'google');
  assertEquals(result.multiplier, 1.0);
  assertEquals(updatedRows.length, 1);
  assertEquals(updatedRows[0], { id: 'u-sync-1', tier: 'google' });
});
