/**
 * Halchal (হালচাল) - Upstash Rate Limiting Module
 *
 * Directives:
 * 1. User Rate Limit: 1 report per category per 15 minutes (900 seconds).
 * 2. Device Rate Limit: 1 report per category per 15 minutes (900 seconds).
 * 3. IP Coarse Burst Limit: 120 requests/minute.
 *
 * CRITICAL BANGLADESH NETWORK CONTEXT:
 * Bangladeshi mobile operators (Grameenphone, Robi, Banglalink, Teletalk) utilize
 * Carrier-Grade NAT (CGNAT). An entire neighborhood or apartment cluster may share
 * a single public IP. Strict per-IP report limits would cause massive denial of service
 * during actual blackouts. Coarse burst protection (120 req/min) prevents DDoS while
 * allowing independent users to report freely.
 */

import { IRedisClient } from './redis.ts';
import { Errors } from './errors.ts';

export const USER_CATEGORY_WINDOW_SECONDS = 15 * 60; // 900 seconds (15 min)
export const DEVICE_CATEGORY_WINDOW_SECONDS = 15 * 60; // 900 seconds (15 min)
export const IP_BURST_WINDOW_SECONDS = 60; // 1 minute
export const IP_BURST_LIMIT = 120; // 120 requests / min

export interface RateLimitCheckResult {
  allowed: boolean;
  type?: 'ip' | 'user' | 'device';
  retryAfterSeconds?: number;
}

export class HalchalRateLimiter {
  constructor(private redis: IRedisClient) {}

  /**
   * Coarse IP Burst Rate Limit (120 req/min).
   * Does NOT block different users sharing a CGNAT IP during an outage.
   */
  async checkIpBurst(clientIp: string): Promise<void> {
    const minuteBucket = Math.floor(Date.now() / (IP_BURST_WINDOW_SECONDS * 1000));
    const key = `rl:ip:${clientIp}:${minuteBucket}`;

    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, IP_BURST_WINDOW_SECONDS + 5);
    }

    if (count > IP_BURST_LIMIT) {
      throw Errors.IP_BURST_LIMITED();
    }
  }

  /**
   * Pre-check rate limits for user and device before running database queries.
   */
  async checkUserAndDeviceLimits(
    userId: string,
    deviceIdHash: string,
    category: string
  ): Promise<void> {
    const userKey = `rl:user:${userId}:${category}`;
    const deviceKey = `rl:device:${deviceIdHash}:${category}`;

    const [userVal, deviceVal] = await Promise.all([
      this.redis.get(userKey),
      this.redis.get(deviceKey),
    ]);

    if (userVal !== null) {
      throw Errors.RATE_LIMITED_USER_15M();
    }

    if (deviceVal !== null) {
      throw Errors.RATE_LIMITED_DEVICE_15M();
    }
  }

  /**
   * Atomically locks user and device category limits for 15 minutes after a report is accepted.
   */
  async recordSuccessfulReport(
    userId: string,
    deviceIdHash: string,
    category: string
  ): Promise<void> {
    const userKey = `rl:user:${userId}:${category}`;
    const deviceKey = `rl:device:${deviceIdHash}:${category}`;

    await Promise.all([
      this.redis.set(userKey, '1', { ex: USER_CATEGORY_WINDOW_SECONDS }),
      this.redis.set(deviceKey, '1', { ex: DEVICE_CATEGORY_WINDOW_SECONDS }),
    ]);
  }

  /**
   * Invalidates cached zone status so next read fetches fresh data.
   */
  async invalidateZoneStatus(h3Index: string): Promise<void> {
    const cacheKey = `zone:status:${h3Index}`;
    await this.redis.del(cacheKey);
  }
}
