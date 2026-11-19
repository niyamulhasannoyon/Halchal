/**
 * Halchal (হালচাল) - Security & Abuse Test Suite
 *
 * Scenarios tested:
 * 1. Sybil accounts from one device: Attacker creates multiple user accounts on one phone;
 *    device-level rate limiting (HMAC-SHA256) strictly blocks them.
 * 2. Replayed requests: Immediate re-submissions, stale timestamps, future timestamps,
 *    and replayed one-tap action tokens are rejected.
 * 3. Spoofed far-away location: User locked to home cell cannot report outside gridDisk(k=1)
 *    within 7 days; accuracy > 200m is rejected; coordinates outside Bangladesh bounds rejected.
 * 4. Mass reports from one NAT IP across different users (MUST SUCCEED):
 *    Bangladeshi mobile ISPs use Carrier-Grade NAT (CGNAT). Multiple distinct citizens sharing
 *    one public IP must all report successfully during mass blackout conditions.
 */

import { assertEquals, assert } from '@std/assert';
import { handleReportSubmission } from '../submit-report/index.ts';
import { handleRestoreVote } from '../restore-vote/index.ts';
import { createActionToken } from '../_shared/action-token.ts';
import {
  createTestDependencies,
  BANANI_LAT,
  BANANI_LNG,
  BANANI_H3,
  DHANMONDI_LAT,
  DHANMONDI_LNG,
  DHANMONDI_H3,
} from './test-helpers.ts';

// -----------------------------------------------------------------------------
// Scenario 1: Sybil Accounts from One Device
// -----------------------------------------------------------------------------
Deno.test('ABUSE TEST: Sybil accounts from one device are blocked by device rate limit', async () => {
  const { deps, authVerifier, attestationVerifier, mockDb } = createTestDependencies();
  const sharedDeviceId = 'd1111111-1111-1111-1111-111111111111';

  // Attacker creates 5 sybil user accounts on the same device
  const sybilUsers = [
    { token: 'jwt-sybil-1', userId: 'u0000000-0000-0000-0000-000000000001' },
    { token: 'jwt-sybil-2', userId: 'u0000000-0000-0000-0000-000000000002' },
    { token: 'jwt-sybil-3', userId: 'u0000000-0000-0000-0000-000000000003' },
    { token: 'jwt-sybil-4', userId: 'u0000000-0000-0000-0000-000000000004' },
    { token: 'jwt-sybil-5', userId: 'u0000000-0000-0000-0000-000000000005' },
  ];

  for (const u of sybilUsers) {
    authVerifier.registerUser(u.token, { userId: u.userId });
  }
  attestationVerifier.addAllowedToken('valid-attestation-token');

  // Sybil 1 submits report for electricity -> MUST SUCCEED
  const req1 = new Request('http://localhost/submit-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sybilUsers[0].token}` },
    body: JSON.stringify({
      category: 'electricity',
      state: 'out',
      lat: BANANI_LAT,
      lng: BANANI_LNG,
      accuracy_m: 20,
      client_ts: new Date().toISOString(),
      device_id: sharedDeviceId,
      attestation: 'valid-attestation-token',
    }),
  });
  const res1 = await handleReportSubmission(req1, deps);
  assertEquals(res1.status, 200);
  const data1 = await res1.json();
  assertEquals(data1.success, true);
  assertEquals(mockDb.reports.length, 1);

  // Sybils 2 through 5 attempt to report electricity from the SAME device within 15 min
  // -> ALL MUST BE REJECTED with HTTP 429
  for (let i = 1; i < sybilUsers.length; i++) {
    const req = new Request('http://localhost/submit-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sybilUsers[i].token}` },
      body: JSON.stringify({
        category: 'electricity',
        state: 'out',
        lat: BANANI_LAT,
        lng: BANANI_LNG,
        accuracy_m: 20,
        client_ts: new Date().toISOString(),
        device_id: sharedDeviceId, // Same phone hardware!
        attestation: 'valid-attestation-token',
      }),
    });
    const res = await handleReportSubmission(req, deps);
    assertEquals(res.status, 429, `Sybil user ${i + 1} should be blocked by device rate limit`);
    const data = await res.json();
    assertEquals(data.code, 'RATE_LIMITED_DEVICE_15M');
    assertEquals(data.error, '১৫ মিনিটে একবারই রিপোর্ট করা যাবে');
  }

  // Database must still contain only the single legitimate report
  assertEquals(mockDb.reports.length, 1);
});

// -----------------------------------------------------------------------------
// Scenario 2: Replayed Requests & Replay Attacks
// -----------------------------------------------------------------------------
Deno.test('ABUSE TEST: Replayed report within 15 min is rejected by user rate limit', async () => {
  const { deps, authVerifier, attestationVerifier } = createTestDependencies();
  const userId = 'u1111111-1111-1111-1111-111111111111';
  authVerifier.registerUser('jwt-user-1', { userId });
  attestationVerifier.addAllowedToken('valid-token-1');

  const payload = {
    category: 'electricity',
    state: 'out',
    lat: BANANI_LAT,
    lng: BANANI_LNG,
    accuracy_m: 20,
    client_ts: new Date().toISOString(),
    device_id: 'd1111111-1111-1111-1111-111111111111',
    attestation: 'valid-token-1',
  };

  // 1st request -> SUCCEEDS
  const req1 = new Request('http://localhost/submit-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer jwt-user-1' },
    body: JSON.stringify(payload),
  });
  const res1 = await handleReportSubmission(req1, deps);
  assertEquals(res1.status, 200);

  // Replayed duplicate request -> REJECTED with 429
  const req2 = new Request('http://localhost/submit-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer jwt-user-1' },
    body: JSON.stringify(payload),
  });
  const res2 = await handleReportSubmission(req2, deps);
  assertEquals(res2.status, 429);
  const data2 = await res2.json();
  assertEquals(data2.code, 'RATE_LIMITED_USER_15M');
  assertEquals(data2.error, '১৫ মিনিটে একবারই রিপোর্ট করা যাবে');
});

Deno.test('ABUSE TEST: Replaying one-tap action token is blocked by single-use guarantee', async () => {
  const { deps } = createTestDependencies();

  const token = await createActionToken(
    {
      userId: 'u1111111-1111-1111-1111-111111111111',
      deviceId: 'd1111111-1111-1111-1111-111111111111',
      h3Index: BANANI_H3,
      category: 'electricity',
    },
    deps.actionSecret
  );

  // First click from notification -> SUCCEEDS
  const req1 = new Request('http://localhost/restore-vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, vote: 'ok' }),
  });
  const res1 = await handleRestoreVote(req1, deps);
  assertEquals(res1.status, 200);

  // Intercepted / replayed link click -> REJECTED with 409
  const req2 = new Request('http://localhost/restore-vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, vote: 'ok' }),
  });
  const res2 = await handleRestoreVote(req2, deps);
  assertEquals(res2.status, 409);
  const data2 = await res2.json();
  assertEquals(data2.code, 'TOKEN_ALREADY_USED');
  assertEquals(data2.error, 'এই ভোটের লিংকটি ইতিমধ্যে ব্যবহার করা হয়েছে।');
});

Deno.test('ABUSE TEST: Stale and future timestamps are rejected', async () => {
  const { deps, authVerifier, attestationVerifier } = createTestDependencies();
  authVerifier.registerUser('jwt-user-1', { userId: 'u1111111-1111-1111-1111-111111111111' });
  attestationVerifier.addAllowedToken('valid-token-1');

  // Stale timestamp: 35 minutes in the past
  const staleTs = new Date(Date.now() - 35 * 60 * 1000).toISOString();
  const req1 = new Request('http://localhost/submit-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer jwt-user-1' },
    body: JSON.stringify({
      category: 'electricity',
      state: 'out',
      lat: BANANI_LAT,
      lng: BANANI_LNG,
      accuracy_m: 20,
      client_ts: staleTs,
      device_id: 'd1111111-1111-1111-1111-111111111111',
      attestation: 'valid-token-1',
    }),
  });
  const res1 = await handleReportSubmission(req1, deps);
  assertEquals(res1.status, 400);
  const data1 = await res1.json();
  assertEquals(data1.code, 'TIMESTAMP_TOO_OLD');
  assertEquals(data1.error, 'রিপোর্টের সময় ৩০ মিনিটের বেশি পুরোনো');

  // Future timestamp: 10 minutes in the future
  const futureTs = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const req2 = new Request('http://localhost/submit-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer jwt-user-1' },
    body: JSON.stringify({
      category: 'electricity',
      state: 'out',
      lat: BANANI_LAT,
      lng: BANANI_LNG,
      accuracy_m: 20,
      client_ts: futureTs,
      device_id: 'd1111111-1111-1111-1111-111111111111',
      attestation: 'valid-token-1',
    }),
  });
  const res2 = await handleReportSubmission(req2, deps);
  assertEquals(res2.status, 400);
  const data2 = await res2.json();
  assertEquals(data2.code, 'TIMESTAMP_IN_FUTURE');
  assertEquals(data2.error, 'ভবিষ্যতের সময় দিয়ে রিপোর্ট করা যাবে না');
});

// -----------------------------------------------------------------------------
// Scenario 3: Spoofed Far-Away Location & GPS Tampering
// -----------------------------------------------------------------------------
Deno.test('ABUSE TEST: Home-zone gate blocks user from reporting outside gridDisk(k=1) within 7 days', async () => {
  const { deps, authVerifier, attestationVerifier, profileStore } = createTestDependencies();
  const userId = 'u1111111-1111-1111-1111-111111111111';
  authVerifier.registerUser('jwt-user-1', { userId });
  attestationVerifier.addAllowedToken('valid-token-1');

  // Establish user home in Banani (changed 2 days ago)
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  profileStore.setInitialProfile(userId, BANANI_H3, twoDaysAgo);

  // User attempts to report for Dhanmondi (> 5km away, NOT in Banani's 7-cell cluster)
  const req = new Request('http://localhost/submit-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer jwt-user-1' },
    body: JSON.stringify({
      category: 'electricity',
      state: 'out',
      lat: DHANMONDI_LAT,
      lng: DHANMONDI_LNG,
      accuracy_m: 20,
      client_ts: new Date().toISOString(),
      device_id: 'd1111111-1111-1111-1111-111111111111',
      attestation: 'valid-token-1',
    }),
  });
  const res = await handleReportSubmission(req, deps);
  assertEquals(res.status, 403);
  const data = await res.json();
  assertEquals(data.code, 'HOME_ZONE_LOCKED');
  assert(data.error.includes('৭ দিনের মধ্যে এলাকা পরিবর্তন করা যাবে না'));
  assertEquals(data.details.days_remaining, 5); // 7 - 2 = 5 days left
});

Deno.test('ABUSE TEST: GPS coordinates outside Bangladesh bounds are rejected', async () => {
  const { deps, authVerifier, attestationVerifier } = createTestDependencies();
  authVerifier.registerUser('jwt-user-1', { userId: 'u1111111-1111-1111-1111-111111111111' });
  attestationVerifier.addAllowedToken('valid-token-1');

  // Spoofed coordinates in London (UK)
  const req = new Request('http://localhost/submit-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer jwt-user-1' },
    body: JSON.stringify({
      category: 'electricity',
      state: 'out',
      lat: 51.5074, // London
      lng: -0.1278,
      accuracy_m: 10,
      client_ts: new Date().toISOString(),
      device_id: 'd1111111-1111-1111-1111-111111111111',
      attestation: 'valid-token-1',
    }),
  });
  const res = await handleReportSubmission(req, deps);
  assertEquals(res.status, 400);
  const data = await res.json();
  assertEquals(data.code, 'COORDINATES_OUT_OF_BOUNDS');
  assert(data.error.includes('বাংলাদেশের ভৌগোলিক সীমার বাইরে'));
});

// -----------------------------------------------------------------------------
// Scenario 4: Mass Reports from ONE NAT IP Across Different Users (MUST SUCCEED)
// -----------------------------------------------------------------------------
Deno.test('ABUSE TEST: Mass reports from one Bangladeshi CGNAT IP across distinct users MUST SUCCEED', async () => {
  const { deps, authVerifier, attestationVerifier, mockDb } = createTestDependencies();
  attestationVerifier.addAllowedToken('valid-attestation-token');

  // Bangladeshi mobile ISP Carrier-Grade NAT (CGNAT) IP shared by 25 neighbors
  const sharedMobileIspNatIp = '103.25.120.14';
  const numberOfNeighbors = 25;

  // Register 25 distinct users and devices in the same neighborhood (Banani)
  for (let i = 1; i <= numberOfNeighbors; i++) {
    const userId = `u0000000-0000-0000-0000-${String(i).padStart(12, '0')}`;
    const token = `jwt-neighbor-${i}`;
    authVerifier.registerUser(token, { userId });
  }

  // All 25 neighbors submit blackout reports simultaneously from the SAME NAT IP
  const submissionPromises = [];
  for (let i = 1; i <= numberOfNeighbors; i++) {
    const userId = `u0000000-0000-0000-0000-${String(i).padStart(12, '0')}`;
    const token = `jwt-neighbor-${i}`;
    const deviceId = `d0000000-0000-0000-0000-${String(i).padStart(12, '0')}`; // Each neighbor has their own phone

    const req = new Request('http://localhost/submit-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'cf-connecting-ip': sharedMobileIspNatIp, // Shared CGNAT IP!
      },
      body: JSON.stringify({
        category: 'electricity',
        state: 'out',
        lat: BANANI_LAT,
        lng: BANANI_LNG,
        accuracy_m: 15,
        client_ts: new Date().toISOString(),
        device_id: deviceId,
        attestation: 'valid-attestation-token',
      }),
    });

    submissionPromises.push(handleReportSubmission(req, deps));
  }

  const responses = await Promise.all(submissionPromises);

  // ALL 25 reports MUST SUCCEED with HTTP 200
  for (let i = 0; i < responses.length; i++) {
    assertEquals(
      responses[i].status,
      200,
      `Neighbor ${i + 1} on shared CGNAT IP ${sharedMobileIspNatIp} should have succeeded`
    );
    const body = await responses[i].json();
    assertEquals(body.success, true);
  }

  // Verify that all 25 distinct reports were accepted and persisted in database
  assertEquals(mockDb.reports.length, numberOfNeighbors);
});
