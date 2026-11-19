/**
 * Halchal (হালচাল) - `notify-zone` Unit Tests
 * Covers:
 * 1. Redis Lock `notif:lock:{h3}:{category}:{state}` with 30-minute cooldown
 * 2. Daily caps (at most 3 notifications/day per user)
 * 3. Restored notification targeting (only to users notified of the outage)
 * 4. Quiet hours policy (23:00 - 06:00 BDT default, opt-in night alerts)
 * 5. Automatic removal of expired/410 subscriptions
 * 6. Interactive 30-min confirmation with signed action token
 */

import { assertEquals, assertNotEquals } from '@std/assert';
import { handleNotifyZone } from '../notify-zone/index.ts';
import { MockDeliveryProvider } from '../notify-zone/delivery.ts';
import { createTestDependencies, DHANMONDI_H3 } from './test-helpers.ts';
import { PushSubscriptionRecord } from '../_shared/types.ts';
import { verifyAndConsumeActionToken } from '../_shared/action-token.ts';

Deno.test('notify-zone: enforces 30-minute cooldown lock per zone/category/state', async () => {
  const { deps, redisClient, mockDb } = createTestDependencies();
  const mockDelivery = new MockDeliveryProvider();

  // Seed 1 active subscriber
  const subId = crypto.randomUUID();
  mockDb.pushSubscriptions.push({
    id: subId,
    user_id: crypto.randomUUID(),
    kind: 'webpush',
    token_or_endpoint: 'https://push.example.com/sub-1',
    keys: { p256dh: 'test-p256dh', auth: 'test-auth' },
    h3_subscriptions: [DHANMONDI_H3],
    categories: ['electricity'],
    allow_night_alerts: true,
  });

  const payload = {
    h3_index: DHANMONDI_H3,
    category: 'electricity',
    from_state: 'unknown',
    to_state: 'out',
  };

  // 1. First event: acquires cooldown lock and delivers
  const req1 = new Request('https://edge.halchal.bd/notify-zone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const res1 = await handleNotifyZone(req1, {
    supabaseClient: deps.supabaseClient,
    redisClient,
    webPushProvider: mockDelivery,
    mockCurrentTime: new Date('2026-11-19T14:00:00+06:00'),
  });

  assertEquals(res1.status, 200);
  const json1 = await res1.json();
  assertEquals(json1.success, true);
  assertEquals(json1.delivered, 1);
  assertEquals(mockDelivery.sentMessages.length, 1);

  // 2. Second event within 30 min cooldown: MUST BE SKIPPED
  const req2 = new Request('https://edge.halchal.bd/notify-zone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const res2 = await handleNotifyZone(req2, {
    supabaseClient: deps.supabaseClient,
    redisClient,
    webPushProvider: mockDelivery,
    mockCurrentTime: new Date('2026-11-19T14:10:00+06:00'),
  });

  assertEquals(res2.status, 200);
  const json2 = await res2.json();
  assertEquals(json2.success, true);
  assertEquals(json2.skipped, true);
  assertEquals(json2.reason, 'COOLDOWN_ACTIVE_30M');
  assertEquals(mockDelivery.sentMessages.length, 1); // No new message sent

  // 3. After 30 minutes cooldown expires: lock can be re-acquired
  await redisClient.del(`notif:lock:${DHANMONDI_H3}:electricity:out`);

  const req3 = new Request('https://edge.halchal.bd/notify-zone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const res3 = await handleNotifyZone(req3, {
    supabaseClient: deps.supabaseClient,
    redisClient,
    webPushProvider: mockDelivery,
    mockCurrentTime: new Date('2026-11-19T14:35:00+06:00'),
  });

  assertEquals(res3.status, 200);
  const json3 = await res3.json();
  assertEquals(json3.success, true);
  assertEquals(json3.delivered, 1);
  assertEquals(mockDelivery.sentMessages.length, 2);
});

Deno.test('notify-zone: caps user notifications at maximum 3 per day', async () => {
  const { deps, redisClient, mockDb } = createTestDependencies();
  const mockDelivery = new MockDeliveryProvider();

  const userId = crypto.randomUUID();
  mockDb.pushSubscriptions.push({
    id: crypto.randomUUID(),
    user_id: userId,
    kind: 'webpush',
    token_or_endpoint: 'https://push.example.com/user-cap',
    keys: { p256dh: 'test-p256dh', auth: 'test-auth' },
    h3_subscriptions: [DHANMONDI_H3],
    categories: ['electricity', 'gas', 'water'],
    allow_night_alerts: true,
  });

  const timeDay1 = new Date('2026-11-19T10:00:00+06:00');

  // Helper to send an event
  const sendEvent = async (cat: string, time: Date) => {
    // Clear lock for test iteration
    await redisClient.del(`notif:lock:${DHANMONDI_H3}:${cat}:out`);
    const req = new Request('https://edge.halchal.bd/notify-zone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        h3_index: DHANMONDI_H3,
        category: cat,
        from_state: 'unknown',
        to_state: 'out',
      }),
    });
    return await handleNotifyZone(req, {
      supabaseClient: deps.supabaseClient,
      redisClient,
      webPushProvider: mockDelivery,
      mockCurrentTime: time,
    });
  };

  // 1st Notification of the day -> Allowed (1/3)
  const res1 = await sendEvent('electricity', timeDay1);
  assertEquals((await res1.json()).delivered, 1);

  // 2nd Notification of the day -> Allowed (2/3)
  const res2 = await sendEvent('gas', timeDay1);
  assertEquals((await res2.json()).delivered, 1);

  // 3rd Notification of the day -> Allowed (3/3)
  const res3 = await sendEvent('water', timeDay1);
  assertEquals((await res3.json()).delivered, 1);

  // 4th Notification of the same day -> MUST BE FILTERED OUT (Daily Cap Exceeded)
  const res4 = await sendEvent('electricity', timeDay1);
  const json4 = await res4.json();
  assertEquals(json4.delivered, 0);
  assertEquals(json4.reason, 'ALL_RECIPIENTS_FILTERED_BY_QUIET_HOURS_OR_DAILY_CAP');

  assertEquals(mockDelivery.sentMessages.length, 3);

  // Next Day -> Counter resets, user receives notifications again!
  const timeDay2 = new Date('2026-11-20T10:00:00+06:00');
  const res5 = await sendEvent('electricity', timeDay2);
  assertEquals((await res5.json()).delivered, 1);
  assertEquals(mockDelivery.sentMessages.length, 4);
});

Deno.test('notify-zone: delivers "restored" notification ONLY to users who received outage alert', async () => {
  const { deps, redisClient, mockDb } = createTestDependencies();
  const mockDelivery = new MockDeliveryProvider();

  const userAId = crypto.randomUUID();
  const userBId = crypto.randomUUID();

  // User A was subscribed during outage
  mockDb.pushSubscriptions.push({
    id: 'sub-user-a',
    user_id: userAId,
    kind: 'webpush',
    token_or_endpoint: 'https://push.example.com/user-a',
    keys: { p256dh: 'p256dh-a', auth: 'auth-a' },
    h3_subscriptions: [DHANMONDI_H3],
    categories: ['electricity'],
    allow_night_alerts: true,
  });

  // Step 1: Outage occurs in Dhanmondi
  const outageReq = new Request('https://edge.halchal.bd/notify-zone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      h3_index: DHANMONDI_H3,
      category: 'electricity',
      from_state: 'unknown',
      to_state: 'out',
    }),
  });

  const outageRes = await handleNotifyZone(outageReq, {
    supabaseClient: deps.supabaseClient,
    redisClient,
    webPushProvider: mockDelivery,
    mockCurrentTime: new Date('2026-11-19T15:00:00+06:00'),
  });

  assertEquals(outageRes.status, 200);
  assertEquals(mockDelivery.sentMessages.length, 1);
  assertEquals(mockDelivery.sentMessages[0].subscription.id, 'sub-user-a');

  // Step 2: User B subscribes AFTER the outage alert was already sent
  mockDb.pushSubscriptions.push({
    id: 'sub-user-b',
    user_id: userBId,
    kind: 'webpush',
    token_or_endpoint: 'https://push.example.com/user-b',
    keys: { p256dh: 'p256dh-b', auth: 'auth-b' },
    h3_subscriptions: [DHANMONDI_H3],
    categories: ['electricity'],
    allow_night_alerts: true,
  });

  mockDelivery.reset();

  // Step 3: Power is restored (returns from 'out' to 'ok')
  const restoreReq = new Request('https://edge.halchal.bd/notify-zone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      h3_index: DHANMONDI_H3,
      category: 'electricity',
      from_state: 'out',
      to_state: 'ok',
    }),
  });

  const restoreRes = await handleNotifyZone(restoreReq, {
    supabaseClient: deps.supabaseClient,
    redisClient,
    webPushProvider: mockDelivery,
    mockCurrentTime: new Date('2026-11-19T16:00:00+06:00'),
  });

  assertEquals(restoreRes.status, 200);
  const restoreJson = await restoreRes.json();
  assertEquals(restoreJson.delivered, 1);

  // User A MUST receive the restored alert
  assertEquals(mockDelivery.sentMessages.length, 1);
  assertEquals(mockDelivery.sentMessages[0].subscription.id, 'sub-user-a');
  // Check message Bengali title
  assertEquals(mockDelivery.sentMessages[0].payload.title.includes('ফিরেছে'), true);
});

Deno.test('notify-zone: respects quiet hours 23:00 - 06:00 BDT default with opt-in for night alerts', async () => {
  const { deps, redisClient, mockDb } = createTestDependencies();
  const mockDelivery = new MockDeliveryProvider();

  // Sub 1: Default quiet hours (allow_night_alerts: false)
  mockDb.pushSubscriptions.push({
    id: 'sub-quiet-default',
    user_id: crypto.randomUUID(),
    kind: 'webpush',
    token_or_endpoint: 'https://push.example.com/quiet-default',
    keys: { p256dh: 'key1', auth: 'auth1' },
    h3_subscriptions: [DHANMONDI_H3],
    categories: ['electricity'],
    allow_night_alerts: false, // DEFAULT
  });

  // Sub 2: Opted in to night alerts (allow_night_alerts: true)
  mockDb.pushSubscriptions.push({
    id: 'sub-night-optin',
    user_id: crypto.randomUUID(),
    kind: 'webpush',
    token_or_endpoint: 'https://push.example.com/night-optin',
    keys: { p256dh: 'key2', auth: 'auth2' },
    h3_subscriptions: [DHANMONDI_H3],
    categories: ['electricity'],
    allow_night_alerts: true, // OPT-IN
  });

  // Test at 02:30 AM Bangladesh Time (20:30 UTC previous day)
  const middleOfNight = new Date('2026-11-19T02:30:00+06:00');

  const req = new Request('https://edge.halchal.bd/notify-zone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      h3_index: DHANMONDI_H3,
      category: 'electricity',
      from_state: 'unknown',
      to_state: 'out',
    }),
  });

  const res = await handleNotifyZone(req, {
    supabaseClient: deps.supabaseClient,
    redisClient,
    webPushProvider: mockDelivery,
    mockCurrentTime: middleOfNight,
  });

  assertEquals(res.status, 200);
  const json = await res.json();
  // Only the opted-in user should receive the alert during quiet hours!
  assertEquals(json.delivered, 1);
  assertEquals(mockDelivery.sentMessages.length, 1);
  assertEquals(mockDelivery.sentMessages[0].subscription.id, 'sub-night-optin');
});

Deno.test('notify-zone: prunes expired / 410 Gone subscriptions automatically', async () => {
  const { deps, redisClient, mockDb } = createTestDependencies();
  const mockDelivery = new MockDeliveryProvider();

  const expiredToken = 'https://push.example.com/expired-410';
  const activeToken = 'https://push.example.com/active-200';

  mockDb.pushSubscriptions.push(
    {
      id: 'sub-expired',
      user_id: crypto.randomUUID(),
      kind: 'webpush',
      token_or_endpoint: expiredToken,
      keys: { p256dh: 'p1', auth: 'a1' },
      h3_subscriptions: [DHANMONDI_H3],
      categories: ['electricity'],
      allow_night_alerts: true,
    },
    {
      id: 'sub-active',
      user_id: crypto.randomUUID(),
      kind: 'webpush',
      token_or_endpoint: activeToken,
      keys: { p256dh: 'p2', auth: 'a2' },
      h3_subscriptions: [DHANMONDI_H3],
      categories: ['electricity'],
      allow_night_alerts: true,
    }
  );

  // Tell mock delivery provider that expiredToken returns 410 Gone
  mockDelivery.expiredTokenSet.add(expiredToken);

  const req = new Request('https://edge.halchal.bd/notify-zone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      h3_index: DHANMONDI_H3,
      category: 'electricity',
      from_state: 'unknown',
      to_state: 'out',
    }),
  });

  const res = await handleNotifyZone(req, {
    supabaseClient: deps.supabaseClient,
    redisClient,
    webPushProvider: mockDelivery,
    mockCurrentTime: new Date('2026-11-19T14:00:00+06:00'),
  });

  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.delivered, 1);
  assertEquals(json.failed, 1);
  assertEquals(json.expired_removed, 1);

  // Database verification: the expired subscription MUST be deleted from table
  assertEquals(
    mockDb.pushSubscriptions.some((s) => s.id === 'sub-expired'),
    false
  );
  assertEquals(
    mockDb.pushSubscriptions.some((s) => s.id === 'sub-active'),
    true
  );
});

Deno.test('notify-zone: dispatches 30-min interactive confirmation with signed action token', async () => {
  const { deps, redisClient, mockDb } = createTestDependencies();
  const mockDelivery = new MockDeliveryProvider();

  const userId = crypto.randomUUID();
  const deviceId = crypto.randomUUID();

  mockDb.pushSubscriptions.push({
    id: 'sub-interactive',
    user_id: userId,
    device_id: deviceId,
    kind: 'webpush',
    token_or_endpoint: 'https://push.example.com/interactive-sub',
    keys: { p256dh: 'p1', auth: 'a1' },
    h3_subscriptions: [DHANMONDI_H3],
    categories: ['electricity'],
    allow_night_alerts: true,
  });

  const req = new Request('https://edge.halchal.bd/notify-zone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      h3_index: DHANMONDI_H3,
      category: 'electricity',
      from_state: 'out',
      to_state: 'out',
      interactive: true, // 30-min restoration inquiry
    }),
  });

  const res = await handleNotifyZone(req, {
    supabaseClient: deps.supabaseClient,
    redisClient,
    webPushProvider: mockDelivery,
    actionSecret: deps.actionSecret,
    mockCurrentTime: new Date('2026-11-19T15:30:00+06:00'),
  });

  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.delivered, 1);

  const sentMessage = mockDelivery.sentMessages[0];
  assertEquals(sentMessage.payload.body, 'আপনার এলাকায় কি কারেন্ট ফিরেছে?');
  assertEquals(sentMessage.payload.actions?.length, 2);
  assertEquals(sentMessage.payload.actions![0].action, 'vote_ok');
  assertEquals(sentMessage.payload.actions![0].title, 'হ্যাঁ, ফিরেছে');
  assertEquals(sentMessage.payload.actions![1].action, 'vote_out');
  assertEquals(sentMessage.payload.actions![1].title, 'না, এখনো নেই');

  // Verify that the action token embedded in payload is cryptographically valid
  const actionToken = sentMessage.payload.data.action_token;
  assertNotEquals(actionToken, undefined);

  const verifiedPayload = await verifyAndConsumeActionToken(
    actionToken!,
    redisClient,
    deps.actionSecret
  );

  assertEquals(verifiedPayload.sub, userId);
  assertEquals(verifiedPayload.dev, deviceId);
  assertEquals(verifiedPayload.h3, DHANMONDI_H3);
  assertEquals(verifiedPayload.cat, 'electricity');
});
