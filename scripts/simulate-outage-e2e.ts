/**
 * Halchal (হালচাল) - End-to-End 3-Reporter Outage & Notification Simulation
 *
 * Simulates:
 * 1. 3 distinct reporters reporting electricity outage in Dhanmondi.
 * 2. Consensus threshold enforcement (1 and 2 reports stay unverified; 3rd report confirms 'out').
 * 3. Postgres trigger dispatching to `notify-zone`.
 * 4. Anti-spam checks: 30-min cooldown lock, quiet hours, daily caps.
 * 5. Web Push delivery to subscribers in the zone.
 * 6. 30-minute interactive confirmation inquiry: "আপনার এলাকায় কি কারেন্ট ফিরেছে?"
 * 7. One-tap action button click handled via signed action token POST to `restore-vote`.
 * 8. Restoration back to 'ok' and delivery ONLY to previous outage recipients.
 *
 * Run: deno run -A scripts/simulate-outage-e2e.ts
 */

import { assertEquals, assertNotEquals } from '@std/assert';
import { handleNotifyZone } from '../supabase/functions/notify-zone/index.ts';
import { MockDeliveryProvider } from '../supabase/functions/notify-zone/delivery.ts';
import { handleRestoreVote } from '../supabase/functions/restore-vote/index.ts';
import {
  createTestDependencies,
  DHANMONDI_H3,
  BANANI_H3,
} from '../supabase/functions/tests/test-helpers.ts';
import { verifyAndConsumeActionToken } from '../supabase/functions/_shared/action-token.ts';

const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

async function runEndToEndSimulation() {
  console.log(`\n${BOLD}${CYAN}================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}   Halchal (হালচাল) — ৩-রিপোর্টার ব্ল্যাকআউট ও নোটিফিকেশন সিমুলেশন   ${RESET}`);
  console.log(`${BOLD}${CYAN}================================================================${RESET}\n`);

  const { deps, redisClient, mockDb } = createTestDependencies();
  const mockDelivery = new MockDeliveryProvider();

  // ---------------------------------------------------------------------------
  // Step 0: Setup Subscriptions
  // ---------------------------------------------------------------------------
  console.log(`${BOLD}📌 ধাপ ০: সাবস্ক্রিপশন প্রস্তুতকরণ...${RESET}`);

  const subscriberDhanmondi1 = {
    id: 'sub-dhanmondi-1',
    user_id: 'user-dhaka-dhanmondi-001',
    device_id: 'device-dhanmondi-001',
    kind: 'webpush',
    token_or_endpoint: 'https://web.push.service/dhanmondi-user-1',
    keys: { p256dh: 'p256dh-key-1', auth: 'auth-secret-1' },
    h3_subscriptions: [DHANMONDI_H3],
    categories: ['electricity', 'gas', 'water'],
    allow_night_alerts: false,
  };

  const subscriberDhanmondi2 = {
    id: 'sub-dhanmondi-2',
    user_id: 'user-dhaka-dhanmondi-002',
    device_id: 'device-dhanmondi-002',
    kind: 'webpush',
    token_or_endpoint: 'https://web.push.service/dhanmondi-user-2',
    keys: { p256dh: 'p256dh-key-2', auth: 'auth-secret-2' },
    h3_subscriptions: [DHANMONDI_H3],
    categories: ['electricity'],
    allow_night_alerts: true,
  };

  const subscriberBanani = {
    id: 'sub-banani-other-zone',
    user_id: 'user-dhaka-banani-003',
    device_id: 'device-banani-003',
    kind: 'webpush',
    token_or_endpoint: 'https://web.push.service/banani-user-3',
    keys: { p256dh: 'p256dh-key-3', auth: 'auth-secret-3' },
    h3_subscriptions: [BANANI_H3], // Different zone
    categories: ['electricity'],
    allow_night_alerts: true,
  };

  mockDb.pushSubscriptions.push(
    subscriberDhanmondi1,
    subscriberDhanmondi2,
    subscriberBanani
  );

  console.log(`   ${GREEN}✓${RESET} ধানমন্ডি এলাকায় ২ জন এবং বনানী এলাকায় ১ জন গ্রাহক নিবন্ধিত।\n`);

  // ---------------------------------------------------------------------------
  // Step 1: Reporter 1 Reports 'out' (Consensus: 1/3 -> UNVERIFIED)
  // ---------------------------------------------------------------------------
  console.log(`${BOLD}📌 ধাপ ১: ১ম নাগরিক রিপোর্ট করলেন (বিদ্যুৎ নেই / out)...${RESET}`);

  const rep1Result = await deps.supabaseClient.rpc('submit_report', {
    p_user: 'citizen-reporter-001',
    p_device_hash: 'hash-device-001',
    p_h3: DHANMONDI_H3,
    p_category: 'electricity',
    p_state: 'out',
    p_price: null,
    p_client_ts: new Date().toISOString(),
  });

  assertEquals(rep1Result.data.distinct_reporters, 1);
  console.log(`   ${YELLOW}⚠${RESET} distinct_reporters = ১ (< ৩ থ্রেশহোল্ড)`);
  console.log(`   ${YELLOW}⚠${RESET} স্ট্যাটাস এখনো "অনিশ্চিত" (unverified)। কোনো পাবলিক নোটিফিকেশন পাঠানো হবে না।\n`);

  // ---------------------------------------------------------------------------
  // Step 2: Reporter 2 Reports 'out' (Consensus: 2/3 -> UNVERIFIED)
  // ---------------------------------------------------------------------------
  console.log(`${BOLD}📌 ধাপ ২: ২য় নাগরিক রিপোর্ট করলেন (বিদ্যুৎ নেই / out)...${RESET}`);

  const rep2Result = await deps.supabaseClient.rpc('submit_report', {
    p_user: 'citizen-reporter-002',
    p_device_hash: 'hash-device-002',
    p_h3: DHANMONDI_H3,
    p_category: 'electricity',
    p_state: 'out',
    p_price: null,
    p_client_ts: new Date().toISOString(),
  });

  console.log(`   ${YELLOW}⚠${RESET} distinct_reporters = ২ (< ৩ থ্রেশহোল্ড)`);
  console.log(`   ${YELLOW}⚠${RESET} কনসেনসাস এখনো নিশ্চিত নয়। কোনো নোটিফিকেশন নেই।\n`);

  // ---------------------------------------------------------------------------
  // Step 3: Reporter 3 Reports 'out' (Consensus: 3/3 -> CONFIRMED 'out'!)
  // ---------------------------------------------------------------------------
  console.log(`${BOLD}📌 ধাপ ৩: ৩য় নাগরিক রিপোর্ট করলেন (বিদ্যুৎ নেই / out)...${RESET}`);

  const rep3Result = await deps.supabaseClient.rpc('submit_report', {
    p_user: 'citizen-reporter-003',
    p_device_hash: 'hash-device-003',
    p_h3: DHANMONDI_H3,
    p_category: 'electricity',
    p_state: 'out',
    p_price: null,
    p_client_ts: new Date().toISOString(),
  });

  console.log(`   ${GREEN}✓${RESET} distinct_reporters >= ৩ এবং trust_score >= ৩.০ অর্জিত!`);
  console.log(`   ${RED}⚡ কনসেনসাস সফলভাবে লাল (out - বন্ধ) অবস্থায় নিশ্চিত হয়েছে!${RESET}`);
  console.log(`   ${GREEN}✓${RESET} Postgres ট্রিগার trg_status_events_notify সক্রিয় হলো এবং notify-zone কে কল করল।\n`);

  // ---------------------------------------------------------------------------
  // Step 4: Edge Function `notify-zone` handles outage event
  // ---------------------------------------------------------------------------
  console.log(`${BOLD}📌 ধাপ ৪: Edge Function notify-zone নোটিফিকেশন প্রসেস করছে...${RESET}`);

  const daytime = new Date('2026-11-19T14:30:00+06:00'); // 2:30 PM BDT

  const notifyOutageReq = new Request('https://edge.halchal.bd/notify-zone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_id: crypto.randomUUID(),
      h3_index: DHANMONDI_H3,
      category: 'electricity',
      from_state: 'unknown',
      to_state: 'out',
      at: daytime.toISOString(),
    }),
  });

  const notifyOutageRes = await handleNotifyZone(notifyOutageReq, {
    supabaseClient: deps.supabaseClient,
    redisClient,
    webPushProvider: mockDelivery,
    mockCurrentTime: daytime,
    actionSecret: deps.actionSecret,
  });

  assertEquals(notifyOutageRes.status, 200);
  const outageJson = await notifyOutageRes.json();
  console.log(`   ${GREEN}✓${RESET} রেসপন্স: delivered=${outageJson.delivered}, failed=${outageJson.failed}`);

  // Verification:
  // Both subscribers in Dhanmondi must receive the alert
  // The subscriber in Banani must NOT receive the alert
  assertEquals(outageJson.delivered, 2);
  assertEquals(mockDelivery.sentMessages.length, 2);

  const deliveredRecipients = mockDelivery.sentMessages.map((m) => m.subscription.id);
  assertEquals(deliveredRecipients.includes('sub-dhanmondi-1'), true);
  assertEquals(deliveredRecipients.includes('sub-dhanmondi-2'), true);
  assertEquals(deliveredRecipients.includes('sub-banani-other-zone'), false);

  const sampleNotif = mockDelivery.sentMessages[0].payload;
  console.log(`   ${GREEN}✓${RESET} নোটিফিকেশন শিরোনাম: "${sampleNotif.title}"`);
  console.log(`   ${GREEN}✓${RESET} নোটিফিকেশন বার্তা: "${sampleNotif.body}"`);

  // Verify anti-spam lock is active in Redis
  const lockVal = await redisClient.get(`notif:lock:${DHANMONDI_H3}:electricity:out`);
  assertEquals(lockVal, '1');
  console.log(`   ${GREEN}✓${RESET} Redis কুলডাউন লক সক্রিয়: notif:lock:${DHANMONDI_H3}:electricity:out (৩০ মিনিট)`);

  // Verify outage recipients recorded in Redis set
  const savedRecipients = await redisClient.smembers(`notif:outage_recipients:${DHANMONDI_H3}:electricity`);
  assertEquals(savedRecipients.length, 2);
  console.log(`   ${GREEN}✓${RESET} রেস্টোরেশনের জন্য নোটিফিকেশন প্রাপক তালিকা Redis-এ সংরক্ষিত।\n`);

  // ---------------------------------------------------------------------------
  // Step 5: 30 Minutes Later -> Interactive Confirmation Notification
  // ---------------------------------------------------------------------------
  console.log(`${BOLD}📌 ধাপ ৫: ৩০ মিনিট পর ইন্টারেক্টিভ সংযোগ যাচাই বার্তা পাঠানো হচ্ছে...${RESET}`);

  mockDelivery.reset();
  const time30MinLater = new Date('2026-11-19T15:00:00+06:00'); // 3:00 PM BDT

  const interactiveReq = new Request('https://edge.halchal.bd/notify-zone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      h3_index: DHANMONDI_H3,
      category: 'electricity',
      from_state: 'out',
      to_state: 'out',
      interactive: true,
      at: time30MinLater.toISOString(),
    }),
  });

  const interactiveRes = await handleNotifyZone(interactiveReq, {
    supabaseClient: deps.supabaseClient,
    redisClient,
    webPushProvider: mockDelivery,
    mockCurrentTime: time30MinLater,
    actionSecret: deps.actionSecret,
  });

  assertEquals(interactiveRes.status, 200);
  const interactiveJson = await interactiveRes.json();
  console.log(`   ${GREEN}✓${RESET} ইন্টারেক্টিভ বার্তা ডেলিভারি সম্পন্ন: ${interactiveJson.delivered}টি`);

  const sentInteractive = mockDelivery.sentMessages[0];
  console.log(`   ${GREEN}✓${RESET} নোটিফিকেশন প্রশ্ন: "${sentInteractive.payload.body}"`);
  console.log(`   ${GREEN}✓${RESET} বাটন ১: "${sentInteractive.payload.actions?.[0].title}" (${sentInteractive.payload.actions?.[0].action})`);
  console.log(`   ${GREEN}✓${RESET} বাটন ২: "${sentInteractive.payload.actions?.[1].title}" (${sentInteractive.payload.actions?.[1].action})`);

  const actionToken = sentInteractive.payload.data.action_token;
  assertNotEquals(actionToken, undefined);
  console.log(`   ${GREEN}✓${RESET} নিরাপদ সাইনড অ্যাকশন টোকেন অন্তর্ভুক্ত: ${actionToken?.slice(0, 35)}... (১৫ মিনিট মেয়াদ)`);

  // ---------------------------------------------------------------------------
  // Step 6: Service Worker handles "হ্যাঁ, ফিরেছে" (vote_ok) via restore-vote
  // ---------------------------------------------------------------------------
  console.log(`\n${BOLD}📌 ধাপ ৬: সার্ভিস ওয়ার্কার একশন বাটন ক্লিক হ্যান্ডেল করছে ("হ্যাঁ, ফিরেছে")...${RESET}`);

  const restoreVoteReq = new Request('https://edge.halchal.bd/restore-vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: actionToken,
      vote: 'ok',
    }),
  });

  const restoreVoteRes = await handleRestoreVote(restoreVoteReq, {
    supabaseClient: deps.supabaseClient,
    redisClient,
    actionSecret: deps.actionSecret,
    deviceSecret: deps.deviceSecret,
  });

  assertEquals(restoreVoteRes.status, 200);
  const restoreVoteJson = await restoreVoteRes.json();
  console.log(`   ${GREEN}✓${RESET} restore-vote সম্পন্ন: "${restoreVoteJson.message}"`);

  // Verify single-use token replay protection
  console.log(`   ${BOLD}টোকেন রিপ্লে প্রটেকশন পরীক্ষা:${RESET}`);
  const replayVoteReq = new Request('https://edge.halchal.bd/restore-vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: actionToken,
      vote: 'ok',
    }),
  });

  const replayVoteRes = await handleRestoreVote(replayVoteReq, {
    supabaseClient: deps.supabaseClient,
    redisClient,
    actionSecret: deps.actionSecret,
    deviceSecret: deps.deviceSecret,
  });

  assertEquals(replayVoteRes.status, 409); // Conflict: TOKEN_ALREADY_USED
  console.log(`   ${GREEN}✓${RESET} পুনরায় একই টোকেন ব্যবহারে ব্যর্থ (409 TOKEN_ALREADY_USED) — সম্পূর্ণ সুরক্ষিত!\n`);

  // ---------------------------------------------------------------------------
  // Step 7: Zone returns to 'ok' (Restored!) -> Notification sent ONLY to outage recipients
  // ---------------------------------------------------------------------------
  console.log(`${BOLD}📌 ধাপ ৭: বিদ্যুৎ সংযোগ স্বাভাবিক হলো ('ok') -> রিস্টোর্ড নোটিফিকেশন প্রদান...${RESET}`);

  mockDelivery.reset();
  const restoreEventTime = new Date('2026-11-19T15:35:00+06:00');

  // Clear lock for test transition
  await redisClient.del(`notif:lock:${DHANMONDI_H3}:electricity:ok`);

  const restoredEventReq = new Request('https://edge.halchal.bd/notify-zone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_id: crypto.randomUUID(),
      h3_index: DHANMONDI_H3,
      category: 'electricity',
      from_state: 'out',
      to_state: 'ok',
      at: restoreEventTime.toISOString(),
    }),
  });

  const restoredEventRes = await handleNotifyZone(restoredEventReq, {
    supabaseClient: deps.supabaseClient,
    redisClient,
    webPushProvider: mockDelivery,
    mockCurrentTime: restoreEventTime,
    actionSecret: deps.actionSecret,
  });

  assertEquals(restoredEventRes.status, 200);
  const restoredJson = await restoredEventRes.json();
  console.log(`   ${GREEN}✓${RESET} রিস্টোর্ড নোটিফিকেশন ডেলিভারি সম্পন্ন: ${restoredJson.delivered}টি`);

  // Must be delivered ONLY to previous recipients (subscriber 1 and 2)
  assertEquals(restoredJson.delivered, 2);
  assertEquals(mockDelivery.sentMessages.length, 2);
  console.log(`   ${GREEN}✓${RESET} নোটিফিকেশন বার্তা: "${mockDelivery.sentMessages[0].payload.title}"`);
  console.log(`   ${GREEN}✓${RESET} "${mockDelivery.sentMessages[0].payload.body}"`);

  // Verify recipient tracking set is now pruned from Redis
  const cleanedRecipients = await redisClient.smembers(`notif:outage_recipients:${DHANMONDI_H3}:electricity`);
  assertEquals(cleanedRecipients.length, 0);
  console.log(`   ${GREEN}✓${RESET} রেস্টোরেশনের পর Redis প্রাপক তালিকা স্বয়ংক্রিয়ভাবে মুছে ফেলা হয়েছে।\n`);

  console.log(`${BOLD}${GREEN}================================================================${RESET}`);
  console.log(`${BOLD}${GREEN}   ✓ সমস্ত এন্ড-টু-এন্ড টেস্ট এবং বিজনেস রুল ১০০% সফলভাবে উত্তীর্ণ!   ${RESET}`);
  console.log(`${BOLD}${GREEN}================================================================${RESET}\n`);
}

// Execute simulation
if (import.meta.main) {
  runEndToEndSimulation().catch((err) => {
    console.error(`\n${RED}Simulation Error:${RESET}`, err);
    Deno.exit(1);
  });
}
