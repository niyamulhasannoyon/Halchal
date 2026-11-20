import { describe, it, expect, beforeEach } from 'vitest';
import {
  getIndexNowKey,
  getIndexNowKeyLocation,
  isMeaningfulZoneChange,
  checkIndexNowRateLimit,
  pingIndexNow,
  resetRateLimitCache,
  INDEXNOW_COOLDOWN_MS,
  MAX_DAILY_INDEXNOW_PINGS,
} from './indexnow';

describe('Halchal IndexNow Integration & Rate-Limiting Guardrails', () => {
  beforeEach(() => {
    resetRateLimitCache();
  });

  describe('1. Key & Location Configuration', () => {
    it('provides a valid 32-character hex key by default', () => {
      const key = getIndexNowKey();
      expect(key).toBe('c7e19d3f8a4b2e650123456789abcdef');
      expect(key.length).toBeGreaterThanOrEqual(8);
    });

    it('generates an absolute keyLocation URL ending with .txt', () => {
      const loc = getIndexNowKeyLocation('https://halchal.bd');
      expect(loc).toBe('https://halchal.bd/c7e19d3f8a4b2e650123456789abcdef.txt');
    });
  });

  describe('2. Meaningful Change Discrimination (Anti-Spam Filter)', () => {
    it('strictly REJECTS non-indexable zone changes (failing shouldIndexZone)', () => {
      const check = isMeaningfulZoneChange({
        url: 'https://halchal.bd/dhaka/badda',
        previousIndexable: false,
        newIndexable: false, // Low activity zone
        previousState: 'ok',
        newState: 'out',
        distinctReporters: 1,
      });

      expect(check.shouldPing).toBe(false);
      expect(check.reason).toContain('fails indexability criteria');
    });

    it('ACCEPTS indexability milestones (transition from non-indexable to indexable)', () => {
      const check = isMeaningfulZoneChange({
        url: 'https://halchal.bd/dhaka/mirpur-10',
        previousIndexable: false,
        newIndexable: true,
      });

      expect(check.shouldPing).toBe(true);
      expect(check.reason).toContain('newly indexable');
    });

    it('strictly REJECTS minor unverified single-user status flips', () => {
      const check = isMeaningfulZoneChange({
        url: 'https://halchal.bd/dhaka/dhanmondi',
        previousIndexable: true,
        newIndexable: true,
        previousState: 'ok',
        newState: 'low',
        distinctReporters: 1, // Only 1 reporter (threshold requires 3)
        weightedTrustScore: 1.0, // Trust 1.0 (threshold requires 3.0)
      });

      expect(check.shouldPing).toBe(false);
      expect(check.reason).toContain('Consensus not met');
    });

    it('ACCEPTS confirmed macro outage transitions backed by community consensus', () => {
      const check = isMeaningfulZoneChange({
        url: 'https://halchal.bd/dhaka/mohammadpur',
        previousIndexable: true,
        newIndexable: true,
        previousState: 'ok',
        newState: 'out', // Major blackout confirmed
        distinctReporters: 5, // Meets threshold (>= 3)
        weightedTrustScore: 4.5, // Meets threshold (>= 3.0)
      });

      expect(check.shouldPing).toBe(true);
      expect(check.reason).toContain('Confirmed macro outage transition');
    });

    it('ACCEPTS monthly BERC regulatory LPG rate updates and citizen guides', () => {
      const checkLpg = isMeaningfulZoneChange({
        url: 'https://halchal.bd/lpg-price',
        newIndexable: true,
        reason: 'regulatory_benchmark',
      });
      expect(checkLpg.shouldPing).toBe(true);

      const checkGuide = isMeaningfulZoneChange({
        url: 'https://halchal.bd/guides/low-gas-pressure-safety',
        newIndexable: true,
        reason: 'guide_publication',
      });
      expect(checkGuide.shouldPing).toBe(true);
    });
  });

  describe('3. Rate Limiting & Cooldown Engine', () => {
    it('allows initial ping for a new URL', () => {
      const check = checkIndexNowRateLimit('https://halchal.bd/dhaka/banani');
      expect(check.allowed).toBe(true);
    });

    it('rejects subsequent pings for the same URL within the 24-hour cooldown window', async () => {
      const url = 'https://halchal.bd/dhaka/banani';

      // First ping
      const res1 = await pingIndexNow({ urls: [url], dryRun: true });
      expect(res1.submittedCount).toBe(1);

      // Immediate second ping
      const res2 = await pingIndexNow({ urls: [url], dryRun: true });
      expect(res2.submittedCount).toBe(0);
      expect(res2.skippedUrls[0]).toContain('24h cooldown');
    });

    it('allows submission after the 24-hour cooldown expires', async () => {
      const url = 'https://halchal.bd/dhaka/gulshan-2';
      const now = Date.now();

      await pingIndexNow({ urls: [url], dryRun: true });

      // Simulate 25 hours later
      const futureTime = now + INDEXNOW_COOLDOWN_MS + 1000 * 60 * 60;
      const check = checkIndexNowRateLimit(url, futureTime);
      expect(check.allowed).toBe(true);
    });

    it('enforces maximum daily site quota (100 URLs/day)', async () => {
      const now = Date.now();

      // Submit 100 distinct URLs
      const urls = Array.from({ length: MAX_DAILY_INDEXNOW_PINGS }, (_, i) => `https://halchal.bd/page-${i}`);
      const res = await pingIndexNow({ urls, dryRun: true });
      expect(res.submittedCount).toBe(100);

      // Attempt 101st URL
      const check101 = checkIndexNowRateLimit('https://halchal.bd/page-101', now);
      expect(check101.allowed).toBe(false);
      expect(check101.reason).toContain('Daily IndexNow quota reached');
    });
  });

  describe('4. Dry Run & Safety Isolation', () => {
    it('simulates IndexNow dispatch in dry-run mode without external network requests', async () => {
      const res = await pingIndexNow({
        urls: [
          'https://halchal.bd/dhaka/mohammadpur',
          'https://halchal.bd/dhaka/dhanmondi',
        ],
        host: 'halchal.bd',
        dryRun: true,
      });

      expect(res.success).toBe(true);
      expect(res.dryRun).toBe(true);
      expect(res.submittedCount).toBe(2);
      expect(res.urlsSubmitted).toEqual([
        'https://halchal.bd/dhaka/mohammadpur',
        'https://halchal.bd/dhaka/dhanmondi',
      ]);
    });
  });
});
