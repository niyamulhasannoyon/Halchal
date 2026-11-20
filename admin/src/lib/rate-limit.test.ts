import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkLoginRateLimit,
  checkRateLimit,
  recordLoginFailure,
  clearLoginFailures,
  resetRateLimitStoreForTesting,
} from './rate-limit';

describe('Admin Rate Limiter & Progressive Delay', () => {
  beforeEach(() => {
    resetRateLimitStoreForTesting();
  });

  it('allows initial login attempts within quota', async () => {
    const res = await checkLoginRateLimit('127.0.0.1', 'admin@halchal.test');
    expect(res.allowed).toBe(true);
    expect(res.remaining).toBe(4);
  });

  it('blocks requests once maximum attempts (5) are exhausted per IP', async () => {
    const ip = '192.168.1.100';
    for (let i = 0; i < 5; i++) {
      const res = await checkLoginRateLimit(ip, `user${i}@halchal.test`);
      expect(res.allowed).toBe(true);
    }

    // 6th attempt from same IP should be blocked
    const blockedRes = await checkLoginRateLimit(ip, 'newuser@halchal.test');
    expect(blockedRes.allowed).toBe(false);
    expect(blockedRes.remaining).toBe(0);
    expect(blockedRes.retryAfterSec).toBeGreaterThan(0);
  });

  it('blocks requests once maximum attempts (5) are exhausted per Email across multiple IPs', async () => {
    const email = 'target@halchal.test';
    for (let i = 0; i < 5; i++) {
      const res = await checkLoginRateLimit(`10.0.0.${i}`, email);
      expect(res.allowed).toBe(true);
    }

    // 6th attempt on same email from different IP should be blocked
    const blockedRes = await checkLoginRateLimit('10.0.0.99', email);
    expect(blockedRes.allowed).toBe(false);
    expect(blockedRes.remaining).toBe(0);
  });

  it('calculates progressive delay on consecutive login failures', async () => {
    const ip = '127.0.0.1';
    const email = 'fail@halchal.test';

    const d1 = await recordLoginFailure(ip, email);
    expect(d1).toBe(500);

    const d2 = await recordLoginFailure(ip, email);
    expect(d2).toBe(1000);

    await clearLoginFailures(ip, email);
    const dReset = await recordLoginFailure(ip, email);
    expect(dReset).toBe(500);
  });
});
