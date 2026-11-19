/**
 * Halchal (হালচাল) - Load Test 4: Replayed Requests and Expired Action Tokens
 * Tool: Grafana k6 (https://k6.io)
 *
 * Scenarios Tested (ADR-0008, ADR-0011):
 * 1. User Replay Attack: Same user submits report A (accepted), then immediately replays
 *    identical report within 15 min. (MUST FAIL with 429 USER_RATE_LIMIT).
 * 2. Notification Action Token Replay: User receives 1-tap lockscreen restoration vote
 *    token. Clicks "হ্যাঁ, ফিরেছে" (accepted 200). Attacker intercepts and replays token.
 *    (MUST FAIL with 400 TOKEN_ALREADY_USED via Redis atomic SET NX).
 * 3. Expired Action Token Attack: Token generated with expiration > 15 minutes ago.
 *    (MUST FAIL with 400 TOKEN_EXPIRED).
 *
 * Expected Results:
 * - 100% of replayed reports rejected (429).
 * - 100% of replayed action tokens rejected (400).
 * - 100% of expired action tokens rejected (400).
 */

import http from 'k6/http';
import { check, group } from 'k6';
import { Counter, Rate } from 'k6/metrics';

const userReplaysBlocked = new Counter('user_replays_blocked_429');
const tokenReplaysBlocked = new Counter('token_replays_blocked_400');
const expiredTokensBlocked = new Counter('expired_tokens_blocked_400');
const totalSecurityChecksPassed = new Rate('security_checks_passed_rate');

export const options = {
  vus: 5,
  iterations: 20, // Run 20 iteration cycles across scenarios
  thresholds: {
    security_checks_passed_rate: ['rate==1.0'], // 100% security checks must pass
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3000';
const BANANI_LAT = 23.7925;
const BANANI_LNG = 90.4078;

// Helper to construct mock HMAC-SHA256 test tokens
function createTestToken(payloadObj) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const b64Payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  // For test simulation, signature is verified against test harness secret
  const sig = 'simulated-signature-hash';
  return `${b64Header}.${b64Payload}.${sig}`;
}

export default function () {
  const testUserId = `user-replay-test-${crypto.randomUUID()}`;
  const testDeviceId = `dev-replay-test-${crypto.randomUUID()}`;

  // ---------------------------------------------------------------------------
  // Scenario 1: User Report Replay within 15 minutes
  // ---------------------------------------------------------------------------
  group('Scenario 1: User Report Replay (429)', function () {
    const reportPayload = JSON.stringify({
      latitude: BANANI_LAT,
      longitude: BANANI_LNG,
      accuracy_m: 20,
      category: 'electricity',
      state: 'out',
      device_id: testDeviceId,
      client_ts: new Date().toISOString(),
    });

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer mock-jwt-${testUserId}`,
    };

    // 1st Attempt: Legitimate initial report -> MUST SUCCEED (200)
    const res1 = http.post(`${BASE_URL}/api/report`, reportPayload, { headers });
    const check1 = check(res1, {
      'initial report succeeds (200)': (r) => r.status === 200,
    });
    totalSecurityChecksPassed.add(check1);

    // 2nd Attempt: Immediate replay with same user & category -> MUST FAIL (429)
    const res2 = http.post(`${BASE_URL}/api/report`, reportPayload, { headers });
    const check2 = check(res2, {
      'replayed report rejected (429)': (r) => r.status === 429,
      'user rate limit error message': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.code === 'USER_RATE_LIMIT' || r.body.includes('১৫ মিনিট');
        } catch {
          return false;
        }
      },
    });

    if (check2) userReplaysBlocked.add(1);
    totalSecurityChecksPassed.add(check2);
  });

  // ---------------------------------------------------------------------------
  // Scenario 2: Single-Use Action Token Replay (400)
  // ---------------------------------------------------------------------------
  group('Scenario 2: One-Tap Action Token Replay (400)', function () {
    const validVoteNonce = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const validPayload = {
      sub: testUserId,
      dev: testDeviceId,
      h3: '883cf13b25fffff',
      cat: 'electricity',
      vid: validVoteNonce,
      iat: now,
      exp: now + 900, // Valid for 15 min
    };
    const validToken = createTestToken(validPayload);

    const votePayload = JSON.stringify({
      token: validToken,
      vote: 'ok',
    });

    const voteHeaders = { 'Content-Type': 'application/json' };

    // 1st Vote: First consumption -> MUST SUCCEED (200)
    const voteRes1 = http.post(`${BASE_URL}/api/restore-vote`, votePayload, { headers: voteHeaders });
    const voteCheck1 = check(voteRes1, {
      'first vote consumption succeeds (200)': (r) => r.status === 200,
    });
    totalSecurityChecksPassed.add(voteCheck1);

    // 2nd Vote: Replay attack with same token & nonce -> MUST BE REJECTED (400)
    const voteRes2 = http.post(`${BASE_URL}/api/restore-vote`, votePayload, { headers: voteHeaders });
    const voteCheck2 = check(voteRes2, {
      'replayed token rejected (400)': (r) => r.status === 400,
      'token already used error code': (r) => {
        try {
          const b = JSON.parse(r.body);
          return b.code === 'TOKEN_ALREADY_USED' || r.body.includes('ইতিমধ্যে ব্যবহার');
        } catch {
          return false;
        }
      },
    });

    if (voteCheck2) tokenReplaysBlocked.add(1);
    totalSecurityChecksPassed.add(voteCheck2);
  });

  // ---------------------------------------------------------------------------
  // Scenario 3: Expired Action Token (> 15 min old) (400)
  // ---------------------------------------------------------------------------
  group('Scenario 3: Expired Action Token (400)', function () {
    const expiredNonce = crypto.randomUUID();
    const pastTime = Math.floor(Date.now() / 1000) - 1000; // 16+ minutes in the past

    const expiredPayload = {
      sub: testUserId,
      dev: testDeviceId,
      h3: '883cf13b25fffff',
      cat: 'electricity',
      vid: expiredNonce,
      iat: pastTime - 900,
      exp: pastTime, // Already expired
    };
    const expiredToken = createTestToken(expiredPayload);

    const reqPayload = JSON.stringify({
      token: expiredToken,
      vote: 'ok',
    });

    const res = http.post(`${BASE_URL}/api/restore-vote`, reqPayload, {
      headers: { 'Content-Type': 'application/json' },
    });

    const checkExpired = check(res, {
      'expired token rejected (400)': (r) => r.status === 400,
      'token expired error message': (r) => {
        try {
          const b = JSON.parse(r.body);
          return b.code === 'TOKEN_EXPIRED' || r.body.includes('মেয়াদ উত্তীর্ণ');
        } catch {
          return false;
        }
      },
    });

    if (checkExpired) expiredTokensBlocked.add(1);
    totalSecurityChecksPassed.add(checkExpired);
  });
}
