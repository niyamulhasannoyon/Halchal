/**
 * Halchal - Upstash Redis Cache Layer
 * Architecture: ADR-0002, ADR-0007, Read Path Directive
 * Key: zone:status:{h3}, TTL 60s
 */

import { Redis } from '@upstash/redis';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

// In-memory fallback cache for local dev / testing when Upstash credentials are not set
interface MemoryCacheEntry {
  data: unknown;
  expiresAt: number;
}
const inMemoryCache = new Map<string, MemoryCacheEntry>();

let redisClient: Redis | null = null;

if (redisUrl && redisToken) {
  try {
    redisClient = new Redis({
      url: redisUrl,
      token: redisToken,
    });
  } catch (err) {
    console.warn('Failed to initialize Upstash Redis client, using in-memory fallback:', err);
  }
}

export function getRedisClient(): Redis | null {
  return redisClient;
}

/**
 * Retrieves cached zone status from Upstash Redis (or in-memory fallback)
 */
export async function getCachedZoneStatus<T = unknown>(h3Index: string): Promise<T | null> {
  const cacheKey = `zone:status:${h3Index}`;

  if (redisClient) {
    try {
      const cached = await redisClient.get<T>(cacheKey);
      if (cached) return cached;
    } catch (err) {
      console.warn(`Upstash get warning for ${cacheKey}:`, err);
    }
  }

  // Check in-memory fallback
  const entry = inMemoryCache.get(cacheKey);
  if (entry) {
    if (Date.now() < entry.expiresAt) {
      return entry.data as T;
    }
    inMemoryCache.delete(cacheKey);
  }

  return null;
}

/**
 * Stores zone status in Upstash Redis with 60-second TTL
 */
export async function setCachedZoneStatus(
  h3Index: string,
  data: unknown,
  ttlSeconds = 60
): Promise<void> {
  const cacheKey = `zone:status:${h3Index}`;

  if (redisClient) {
    try {
      await redisClient.set(cacheKey, data, { ex: ttlSeconds });
      return;
    } catch (err) {
      console.warn(`Upstash set warning for ${cacheKey}:`, err);
    }
  }

  // In-memory fallback
  inMemoryCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * Invalidates cached zone status (called after report submission)
 */
export async function invalidateCachedZoneStatus(h3Index: string): Promise<void> {
  const cacheKey = `zone:status:${h3Index}`;

  if (redisClient) {
    try {
      await redisClient.del(cacheKey);
    } catch (err) {
      console.warn(`Upstash del warning for ${cacheKey}:`, err);
    }
  }

  inMemoryCache.delete(cacheKey);
}

/**
 * Retrieves cached 7-day insights from Upstash Redis (or in-memory fallback)
 */
export async function getCachedZoneInsights<T = unknown>(h3Index: string): Promise<T | null> {
  const cacheKey = `zone:insights:${h3Index}`;

  if (redisClient) {
    try {
      const cached = await redisClient.get<T>(cacheKey);
      if (cached) return cached;
    } catch (err) {
      console.warn(`Upstash get warning for ${cacheKey}:`, err);
    }
  }

  const entry = inMemoryCache.get(cacheKey);
  if (entry) {
    if (Date.now() < entry.expiresAt) {
      return entry.data as T;
    }
    inMemoryCache.delete(cacheKey);
  }

  return null;
}

/**
 * Stores 7-day insights in Upstash Redis with 300-second (5 min) TTL
 */
export async function setCachedZoneInsights(
  h3Index: string,
  data: unknown,
  ttlSeconds = 300
): Promise<void> {
  const cacheKey = `zone:insights:${h3Index}`;

  if (redisClient) {
    try {
      await redisClient.set(cacheKey, data, { ex: ttlSeconds });
      return;
    } catch (err) {
      console.warn(`Upstash set warning for ${cacheKey}:`, err);
    }
  }

  inMemoryCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}
