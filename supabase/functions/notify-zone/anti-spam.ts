/**
 * Halchal (হালচাল) - Notification Anti-Spam & Rate Limiting Module
 * Rules:
 * 1. Redis Lock `notif:lock:{h3}:{category}:{state}` with 30-minute cooldown.
 * 2. User gets at most 3 notifications/day.
 * 3. Quiet hours 23:00-06:00 Asia/Dhaka time (UTC+6) default (opt-in for night alerts).
 * 4. "Restored" notification goes only to users who were notified of the outage.
 */

import { IRedisClient } from '../_shared/redis.ts';
import { UtilityCategory, ZoneState } from '../_shared/types.ts';

export const COOLDOWN_SECONDS = 1800; // 30 minutes
export const MAX_DAILY_NOTIFICATIONS_PER_USER = 3;

/**
 * Checks and acquires 30-minute cooldown lock for a specific zone-category-state transition.
 * Returns true if lock was acquired, false if cooldown is currently active.
 */
export async function checkAndAcquireCooldownLock(
  redis: IRedisClient,
  h3: string,
  category: UtilityCategory,
  state: ZoneState,
  cooldownSeconds = COOLDOWN_SECONDS
): Promise<boolean> {
  const lockKey = `notif:lock:${h3}:${category}:${state}`;
  const result = await redis.set(lockKey, '1', {
    ex: cooldownSeconds,
    nx: true,
  });
  return result !== null && result !== false;
}

/**
 * Formats Asia/Dhaka date string YYYY-MM-DD for daily rate limits
 */
export function getDhakaDateString(now: Date = new Date()): string {
  // Asia/Dhaka is UTC+6
  const utcMs = now.getTime();
  const dhakaMs = utcMs + 6 * 60 * 60 * 1000;
  const dhakaDate = new Date(dhakaMs);
  return dhakaDate.toISOString().slice(0, 10);
}

/**
 * Checks whether user/subscription has exceeded their daily limit of 3 notifications.
 * Increments the counter atomically if within limit.
 */
export async function checkAndIncrementDailyCap(
  redis: IRedisClient,
  recipientId: string,
  now: Date = new Date(),
  maxDaily = MAX_DAILY_NOTIFICATIONS_PER_USER
): Promise<{ allowed: boolean; currentCount: number }> {
  const dateStr = getDhakaDateString(now);
  const capKey = `notif:daily:${recipientId}:${dateStr}`;

  const currentVal = await redis.get(capKey);
  const currentCount = currentVal ? parseInt(currentVal, 10) : 0;

  if (currentCount >= maxDaily) {
    return { allowed: false, currentCount };
  }

  const newCount = await redis.incr(capKey);
  if (newCount === 1) {
    // Expire key after 26 hours to safely clear day bucket
    await redis.expire(capKey, 26 * 3600);
  }

  return { allowed: true, currentCount: newCount };
}

/**
 * Determines whether the given time falls within Bangladesh quiet hours (23:00 - 06:00 BDT)
 */
export function isDhakaQuietHours(now: Date = new Date()): boolean {
  // Asia/Dhaka is UTC+6
  const dhakaHour = (now.getUTCHours() + 6) % 24;
  return dhakaHour >= 23 || dhakaHour < 6;
}

/**
 * Evaluates whether quiet hours policy permits sending notification to this subscription
 */
export function canDeliverDuringQuietHours(
  allowNightAlerts: boolean,
  now: Date = new Date()
): boolean {
  if (allowNightAlerts) {
    return true; // User opted in to 24/7 night alerts
  }
  return !isDhakaQuietHours(now);
}

/**
 * Records list of subscriber IDs that received an outage notification
 */
export async function recordOutageRecipients(
  redis: IRedisClient,
  h3: string,
  category: UtilityCategory,
  recipientIds: string[],
  ttlSeconds = 172800 // 48 hours retention
): Promise<void> {
  if (recipientIds.length === 0) return;
  const key = `notif:outage_recipients:${h3}:${category}`;
  await redis.sadd(key, ...recipientIds);
  await redis.expire(key, ttlSeconds);
}

/**
 * Retrieves set of subscriber IDs who received the original outage alert
 */
export async function getOutageRecipients(
  redis: IRedisClient,
  h3: string,
  category: UtilityCategory
): Promise<Set<string>> {
  const key = `notif:outage_recipients:${h3}:${category}`;
  const members = await redis.smembers(key);
  return new Set(members);
}

/**
 * Clears outage recipient record after restored notification is sent
 */
export async function clearOutageRecipients(
  redis: IRedisClient,
  h3: string,
  category: UtilityCategory
): Promise<void> {
  const key = `notif:outage_recipients:${h3}:${category}`;
  await redis.del(key);
}
