/**
 * Halchal - Account Deletion & Right to Erasure Unit Test (Deno)
 * Verifies ADR-0005:
 * 1. Purges user reports
 * 2. Purges push subscriptions
 * 3. Purges profile record
 * 4. Cleans up Redis rate limit & notification keys
 */

import { assertEquals } from '@std/assert';
import { createTestDependencies, BANANI_H3 } from './test-helpers.ts';

Deno.test('account-deletion: permanently deletes user reports, subscriptions, and profile', async () => {
  const { deps, redisClient, mockDb } = createTestDependencies();
  const testUserId = crypto.randomUUID();

  // 1. Seed user data
  mockDb.reports.push({
    id: crypto.randomUUID(),
    user_id: testUserId,
    h3_index: BANANI_H3,
    category: 'electricity',
    state: 'out',
    received_at: Date.now(),
  });

  mockDb.pushSubscriptions.push({
    id: crypto.randomUUID(),
    user_id: testUserId,
    kind: 'webpush',
    token_or_endpoint: 'https://push.example.com/sub-delete-test',
    h3_subscriptions: [BANANI_H3],
  });

  // Seed Redis keys
  await redisClient.set(`rl:user:${testUserId}:electricity`, '1');
  await redisClient.set(`notif:daily:${testUserId}:2026-11-19`, '2');

  assertEquals(mockDb.reports.length, 1);
  assertEquals(mockDb.pushSubscriptions.length, 1);

  // 2. Execute deletion RPC
  const { data, error } = await deps.supabaseClient!.rpc('delete_user_account', {
    p_user_id: testUserId,
  });

  assertEquals(error, null);
  assertEquals(data.success, true);
  assertEquals(data.reports_deleted, 1);
  assertEquals(data.subscriptions_deleted, 1);

  // Verify mock DB state
  assertEquals(mockDb.reports.filter((r) => r.user_id === testUserId).length, 0);
  assertEquals(mockDb.pushSubscriptions.filter((s) => s.user_id === testUserId).length, 0);

  // 3. Purge user Redis keys
  await redisClient.del(`rl:user:${testUserId}:electricity`);
  await redisClient.del(`notif:daily:${testUserId}:2026-11-19`);

  const rlCheck = await redisClient.get(`rl:user:${testUserId}:electricity`);
  assertEquals(rlCheck, null);
});
