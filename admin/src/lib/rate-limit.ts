/**
 * Halchal Admin - Rate Limiting & Progressive Delay Engine
 * Architecture: ADR-0018
 *
 * Protects login endpoints against brute-force attacks and credential stuffing:
 * - Rate limit per IP address (e.g. max 5 failed attempts per 15 mins)
 * - Rate limit per email address (e.g. max 5 failed attempts per 15 mins)
 * - Progressive sleep delay following consecutive failed attempts
 * - Primary backing: Upstash Redis (production)
 * - Resilient fallback: In-memory sliding window cache (local / test suite)
 */

import { Redis } from '@upstash/redis';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec?: number;
}

export interface RateLimitOptions {
  maxAttempts?: number;
  windowSeconds?: number;
}

// In-memory fallback storage
interface MemoryEntry {
  count: number;
  resetAt: number;
}
const memoryStore = new Map<string, MemoryEntry>();
const failureTracker = new Map<string, number>();

let redisClient: Redis | null = null;

function getRedis(): Redis | null {
  if (redisClient) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token && !url.includes('your-upstash') && !token.includes('your_upstash')) {
    try {
      redisClient = new Redis({ url, token });
      return redisClient;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Checks rate limits for a given key
 */
export async function checkRateLimit(
  key: string,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const maxAttempts = options.maxAttempts ?? 5;
  const windowSeconds = options.windowSeconds ?? 900; // 15 mins default
  const now = Math.floor(Date.now() / 1000);

  const redis = getRedis();

  if (redis) {
    try {
      const redisKey = `admin_rl:${key}`;
      const count = await redis.incr(redisKey);
      if (count === 1) {
        await redis.expire(redisKey, windowSeconds);
      }
      const ttl = await redis.ttl(redisKey);

      if (count > maxAttempts) {
        return {
          allowed: false,
          remaining: 0,
          retryAfterSec: ttl > 0 ? ttl : windowSeconds,
        };
      }

      return {
        allowed: true,
        remaining: Math.max(0, maxAttempts - count),
      };
    } catch {
      // Fallback to memory on Redis communication failure
    }
  }

  // In-memory sliding window fallback
  const entry = memoryStore.get(key);
  if (!entry || entry.resetAt <= now) {
    memoryStore.set(key, {
      count: 1,
      resetAt: now + windowSeconds,
    });
    return {
      allowed: true,
      remaining: maxAttempts - 1,
    };
  }

  if (entry.count >= maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, entry.resetAt - now),
    };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, maxAttempts - entry.count),
  };
}

/**
 * Validates login limits across both IP and Email
 */
export async function checkLoginRateLimit(
  ip: string,
  email: string
): Promise<RateLimitResult> {
  const normalizedEmail = email.toLowerCase().trim();
  const ipKey = `ip:${ip}`;
  const emailKey = `email:${normalizedEmail}`;

  const ipResult = await checkRateLimit(ipKey, { maxAttempts: 5, windowSeconds: 900 });
  if (!ipResult.allowed) {
    return ipResult;
  }

  const emailResult = await checkRateLimit(emailKey, { maxAttempts: 5, windowSeconds: 900 });
  if (!emailResult.allowed) {
    return emailResult;
  }

  return {
    allowed: true,
    remaining: Math.min(ipResult.remaining, emailResult.remaining),
  };
}

/**
 * Calculates and executes progressive delay after failed attempts
 * Delay = min(consecutive_failures * 500ms, 4000ms)
 */
export async function recordLoginFailure(ip: string, email: string): Promise<number> {
  const key = `${ip}:${email.toLowerCase().trim()}`;
  const failures = (failureTracker.get(key) || 0) + 1;
  failureTracker.set(key, failures);

  const delayMs = Math.min(failures * 500, 4000);
  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return delayMs;
}

/**
 * Clears consecutive failure count on successful login
 */
export async function clearLoginFailures(ip: string, email: string): Promise<void> {
  const key = `${ip}:${email.toLowerCase().trim()}`;
  failureTracker.delete(key);
}

/**
 * Resets memory store for test environments
 */
export function resetRateLimitStoreForTesting(): void {
  memoryStore.clear();
  failureTracker.clear();
}
