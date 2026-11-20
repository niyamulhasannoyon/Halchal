import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { determineTrustTier } from './supabase';
import type { User } from '@supabase/supabase-js';

describe('determineTrustTier', () => {
  it('identifies anonymous user as anonymous tier with 0.5x multiplier', () => {
    const user = {
      id: 'u-anon-1',
      is_anonymous: true,
      app_metadata: { provider: 'anonymous' },
    } as unknown as User;

    const res = determineTrustTier(user);
    assert.equal(res.tier, 'anonymous');
    assert.equal(res.multiplier, 0.5);
    assert.equal(res.isVerified, false);
    assert.equal(res.labelBn, 'বেনামী নাগরিক');
  });

  it('identifies null or undefined user as anonymous tier', () => {
    assert.equal(determineTrustTier(null).tier, 'anonymous');
    assert.equal(determineTrustTier(undefined).tier, 'anonymous');
  });

  it('identifies phone-verified user as phone tier with 1.5x multiplier', () => {
    const user = {
      id: 'u-phone-1',
      is_anonymous: false,
      phone: '+8801700000000',
      phone_confirmed_at: '2026-11-20T00:00:00Z',
      app_metadata: { provider: 'phone' },
    } as unknown as User;

    const res = determineTrustTier(user);
    assert.equal(res.tier, 'phone');
    assert.equal(res.multiplier, 1.5);
    assert.equal(res.isVerified, true);
    assert.equal(res.labelBn, 'মোবাইল যাচাইকৃত');
  });

  it('identifies google-verified user as google tier with 1.0x multiplier', () => {
    const user = {
      id: 'u-google-1',
      is_anonymous: false,
      email: 'citizen@example.com',
      app_metadata: { provider: 'google', providers: ['google'] },
    } as unknown as User;

    const res = determineTrustTier(user);
    assert.equal(res.tier, 'google');
    assert.equal(res.multiplier, 1.0);
    assert.equal(res.isVerified, true);
    assert.equal(res.labelBn, 'নাগরিক যাচাইকৃত');
  });
});
