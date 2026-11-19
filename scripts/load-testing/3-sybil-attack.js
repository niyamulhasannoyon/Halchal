/**
 * Halchal (হালচাল) - Load Test 3: Sybil Attack Defense (100 Accounts, 1 Device)
 * Tool: Grafana k6 (https://k6.io)
 *
 * Attack Scenario (ADR-0007, ADR-0008):
 * A malicious actor creates 100 anonymous user accounts on a single rooted Android device
 * or puppeteer instance. The attacker fires 100 consecutive outage reports for Banani
 * within 60 seconds to illegally flip the neighborhood status and claim consensus.
 *
 * Defense Mechanism:
 * Server-side device pseudonymization:
 * device_id_hash = HMAC-SHA256(server_secret, device_id).
 * Upstash Redis enforces 15-minute lock on `rl:dev:{deviceIdHash}:{category}`.
 *
 * Expected Results:
 * - Request 1: MUST PASS (HTTP 200) - Initial citizen report accepted.
 * - Requests 2 to 100: MUST BE BLOCKED (HTTP 429) - Device rate limit triggered.
 * - Attack Block Rate: Exactly 99% blocked (99 / 100 rejected).
 * - Collusion Defeated: Zone consensus remains untouched because distinct_reporters = 1.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

const sybilBlocked = new Counter('sybil_requests_blocked_429');
const sybilAccepted = new Counter('sybil_requests_accepted_200');
const defenseSuccessRate = new Rate('sybil_defense_success_rate');

export const options = {
  scenarios: {
    sybil_barrage: {
      executor: 'per-vu-iterations',
      vus: 1,                 // 1 single client device
      iterations: 100,        // 100 consecutive accounts
      maxDuration: '1m',
    },
  },
  thresholds: {
    sybil_requests_accepted_200: ['count==1'],  // Exactly 1 request succeeds
    sybil_requests_blocked_429: ['count==99'],  // Exactly 99 requests blocked
    sybil_defense_success_rate: ['rate==1.0'],  // 100% adherence to policy
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3000';
// Single static device ID shared across all 100 anonymous accounts
const ATTACKER_DEVICE_ID = 'sybil-device-hardware-uuid-987654321';
const BANANI_LAT = 23.7925;
const BANANI_LNG = 90.4078;

export default function () {
  const iteration = __ITER + 1;
  // A brand new anonymous user account for each iteration
  const fakeAnonymousUserId = `sybil-anon-user-${crypto.randomUUID()}`;

  const payload = JSON.stringify({
    latitude: BANANI_LAT,
    longitude: BANANI_LNG,
    accuracy_m: 30,
    category: 'electricity',
    state: 'out',
    device_id: ATTACKER_DEVICE_ID, // SAME DEVICE ID
    client_ts: new Date().toISOString(),
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer mock-jwt-${fakeAnonymousUserId}`,
    },
  };

  const res = http.post(`${BASE_URL}/api/report`, payload, params);

  if (iteration === 1) {
    // First report from this device MUST SUCCEED
    const passed = check(res, {
      'first report accepted (200)': (r) => r.status === 200,
    });
    if (passed) {
      sybilAccepted.add(1);
      defenseSuccessRate.add(1);
    } else {
      defenseSuccessRate.add(0);
    }
  } else {
    // Subsequent 99 reports MUST BE BLOCKED BY DEVICE RATE LIMIT (429)
    const blocked = check(res, {
      'sybil clone blocked (429)': (r) => r.status === 429,
      'device rate limit error code': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.code === 'DEVICE_RATE_LIMIT' || r.body.includes('ডিভাইস');
        } catch {
          return false;
        }
      },
    });

    if (blocked) {
      sybilBlocked.add(1);
      defenseSuccessRate.add(1);
    } else {
      defenseSuccessRate.add(0);
    }
  }

  // Small pause between spam requests
  sleep(0.05);
}
