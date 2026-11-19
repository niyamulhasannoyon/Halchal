/**
 * Halchal (হালচাল) - Load Test 2: CGNAT Mass Outage Reporting (Carrier NAT Simulation)
 * Tool: Grafana k6 (https://k6.io)
 *
 * Problem Statement (ADR-0008):
 * During mass blackouts in Dhaka, thousands of mobile users (Grameenphone, Robi, Banglalink)
 * share a handful of public Carrier-Grade NAT (CGNAT) gateway IPs.
 * Traditional per-IP rate limits block legitimate citizens.
 * Halchal employs a 3-tier rate limit:
 * - Coarse IP burst ceiling: 120 requests/minute per IP
 * - User rate limit: 1 report / 15 minutes
 * - Device rate limit: 1 report / 15 minutes
 *
 * Test Specification:
 * - 300 reports/minute (= 5 reports/sec) submitted for electricity outage in Banani.
 * - Sourced strictly from only 20 unique Bangladeshi carrier IPs (~15 reports/min per IP).
 * - Each virtual user utilizes a distinct user_id and device_id.
 *
 * Expected Results:
 * - MUST PASS: 100% of reports from distinct users succeed (HTTP 200).
 * - ZERO false 429 Rate Limit rejections caused by shared carrier IPs.
 * - p95 Edge Function submission latency < 500ms.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

// 20 authentic Bangladeshi Mobile Carrier CGNAT Gateway IPs (GP, Robi, Banglalink)
const BANGLADESH_CARRIER_IPS = [
  '103.205.180.14', '103.205.180.22', '103.205.181.5',  '103.205.181.89',
  '119.30.32.10',   '119.30.32.45',   '119.30.33.12',  '119.30.33.98',
  '103.230.104.1',  '103.230.104.55', '103.230.105.12','103.230.105.88',
  '202.134.10.15',  '202.134.10.22',  '202.134.11.4',  '202.134.11.77',
  '103.242.20.10',  '103.242.20.40',  '103.242.21.15', '103.242.21.60',
];

const cgnatSuccess = new Counter('cgnat_successful_reports');
const cgnatFalseRateLimit = new Counter('cgnat_false_rate_limit_blocks');
const errorRate = new Rate('cgnat_error_rate');

export const options = {
  scenarios: {
    cgnat_outage_surge: {
      executor: 'constant-arrival-rate',
      rate: 300,              // 300 reports
      timeUnit: '1m',         // per minute (= 5 req/sec)
      duration: '3m',         // Run for 3 minutes (900 total reports)
      preAllocatedVUs: 50,
      maxVUs: 100,
    },
  },
  thresholds: {
    cgnat_error_rate: ['rate<0.01'],             // < 1% error rate
    cgnat_false_rate_limit_blocks: ['count==0'], // ZERO legitimate requests blocked by CGNAT IP
    http_req_duration: ['p(95)<500'],            // p95 latency under 500ms
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3000';
// Banani Coordinates (Within Bangladesh Bounds)
const BANANI_LAT = 23.7925;
const BANANI_LNG = 90.4078;

export default function () {
  // Select one of the 20 shared CGNAT public IPs round-robin / random
  const ipIndex = __VU % BANGLADESH_CARRIER_IPS.length;
  const carrierIp = BANGLADESH_CARRIER_IPS[ipIndex];

  // Each citizen has a unique user session & persistent device UUID
  const uniqueUserId = `usr-${__VU}-${__ITER}-${Date.now()}`;
  const uniqueDeviceId = `dev-${__VU}-${__ITER}-${crypto.randomUUID()}`;

  const payload = JSON.stringify({
    latitude: BANANI_LAT,
    longitude: BANANI_LNG,
    accuracy_m: 25,
    category: 'electricity',
    state: 'out',
    device_id: uniqueDeviceId,
    client_ts: new Date().toISOString(),
    update_home: true,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': carrierIp,
      'CF-Connecting-IP': carrierIp,
      'Authorization': `Bearer mock-anon-jwt-${uniqueUserId}`,
    },
  };

  const res = http.post(`${BASE_URL}/api/report`, payload, params);

  const isSuccess = check(res, {
    'report accepted (200)': (r) => r.status === 200,
    'not falsely blocked by IP rate limit (429)': (r) => r.status !== 429,
  });

  if (res.status === 200) {
    cgnatSuccess.add(1);
    errorRate.add(0);
  } else {
    if (res.status === 429) {
      cgnatFalseRateLimit.add(1);
    }
    errorRate.add(1);
  }
}
