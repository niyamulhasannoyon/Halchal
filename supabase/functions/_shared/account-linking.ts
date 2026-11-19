/**
 * Halchal (হালচাল) - Auth Flow & Account-Linking Module
 *
 * Auth Lifecycle & Trust Tiers (ADR-0007 / CLAUDE.md):
 * 1. First Open (Anonymous):
 *    - Client calls `supabase.auth.signInAnonymously({ options: { captchaToken } })`
 *    - Public reading is 100% free and requires zero login.
 *    - Reports are accepted from anonymous sessions at weight multiplier 0.5.
 *
 * 2. Account Upgrade 1 (Google Sign-In):
 *    - Client calls `supabase.auth.linkIdentity({ provider: 'google', options: { redirectTo } })`
 *    - Upgrades trust tier to 'google' (multiplier 1.0).
 *
 * 3. Account Upgrade 2 (Phone OTP / SMS):
 *    - Client calls `supabase.auth.updateUser({ phone })` followed by `supabase.auth.verifyOtp({ phone, token, type: 'phone_change' })`
 *    - Upgrades trust tier to 'phone' (multiplier 1.5).
 *
 * Anti-Collusion Formula:
 * weight = LEAST(trust_score * tier_multiplier, 2.0)
 * Note: Even a phone user with maximum trust score (3.0 * 1.5 = 4.5) is hard-capped at 2.0.
 * A single user can NEVER reach the 3.0 consensus threshold alone (distinct_reporters >= 3 strictly enforced).
 */

import { SupabaseClient, User } from '@supabase/supabase-js';
import { TrustTier } from './types.ts';
import { Errors } from './errors.ts';

export const TRUST_TIER_MULTIPLIERS: Record<TrustTier, number> = {
  anonymous: 0.5,
  google: 1.0,
  phone: 1.5,
};

/**
 * Determines the appropriate trust tier based on user auth metadata and identities.
 */
export function determineUserTier(user: User): TrustTier {
  // 1. Phone tier (Highest trust: x1.5)
  if (user.phone && user.phone_confirmed_at) {
    return 'phone';
  }

  // 2. Google tier (Verified OAuth identity: x1.0)
  const identities = user.identities || [];
  const hasGoogle = identities.some((id) => id.provider === 'google');
  const appProvider = user.app_metadata?.provider;
  const appProviders = (user.app_metadata?.providers as string[]) || [];

  if (hasGoogle || appProvider === 'google' || appProviders.includes('google')) {
    return 'google';
  }

  // 3. Anonymous tier (Default: x0.5)
  return 'anonymous';
}

/**
 * Synchronizes the user profile's tier with Supabase Auth state.
 * Called automatically during report processing or after account-linking operations.
 */
export async function syncUserTier(
  supabaseAdmin: SupabaseClient,
  userId: string,
  user?: User
): Promise<{ tier: TrustTier; multiplier: number }> {
  let authUser = user;

  if (!authUser) {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error || !data.user) {
      console.error('Failed to load user for tier synchronization:', error);
      throw Errors.INTERNAL_ERROR('ইউজারের তথ্য লোড করতে সমস্যা হয়েছে');
    }
    authUser = data.user;
  }

  const newTier = determineUserTier(authUser);

  // Update profiles table with new tier
  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({
      tier: newTier,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (updateError) {
    console.error('Failed to update profile tier:', updateError);
  }

  return {
    tier: newTier,
    multiplier: TRUST_TIER_MULTIPLIERS[newTier],
  };
}

/**
 * Client-Side Auth Flow Helper 1: Anonymous sign-in with Captcha
 * Invoked on first app open. Reads remain completely public without login,
 * but reporting requires an anonymous or upgraded session with attestation.
 */
export async function signInAnonymouslyWithCaptcha(
  client: SupabaseClient,
  captchaToken: string
) {
  return await client.auth.signInAnonymously({
    options: {
      captchaToken,
    },
  });
}

/**
 * Client-Side Auth Flow Helper 2: Link Google Identity
 * Upgrades anonymous session to verified Google identity (tier: 'google', weight multiplier: 1.0).
 */
export async function linkGoogleIdentity(
  client: SupabaseClient,
  redirectTo?: string
) {
  return await client.auth.linkIdentity({
    provider: 'google',
    options: {
      redirectTo,
    },
  });
}

/**
 * Client-Side Auth Flow Helper 3: Initiate Phone Number Linking (SMS OTP)
 * Sends an OTP SMS to verify citizen phone number.
 */
export async function sendPhoneOtp(
  client: SupabaseClient,
  phone: string
) {
  return await client.auth.updateUser({ phone });
}

/**
 * Client-Side Auth Flow Helper 4: Verify Phone OTP and Link
 * Completes phone verification (tier: 'phone', weight multiplier: 1.5).
 */
export async function verifyAndLinkPhoneOtp(
  client: SupabaseClient,
  phone: string,
  token: string
) {
  return await client.auth.verifyOtp({
    phone,
    token,
    type: 'phone_change',
  });
}
