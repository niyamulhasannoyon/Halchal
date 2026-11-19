/**
 * Halchal (হালচাল) - Load Test 1: High-Volume Zone Status Reads (Cache Hit/Miss Mix)
 * Tool: Grafana k6 (https://k6.io)
 *
 * Scenario:
 * - 2,000 concurrent citizens in one pilot zone (Banani `883cf13b25fffff`) reading live utility status.
 * - Cache mix: 90% cache hits (served from Upstash Redis / Edge CDN within 60s TTL),
 *   10% cache miss/revalidation.
 *
 * Expected Results:
 * - Pass: http_req_failed < 1%
 * - Pass: Cache hit p95 latency < 150ms
 * - Pass: Overall p95 latency < 350ms
 * - Response payload contains valid 4-category status (electricity, gas, water, lpg)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const cacheHits = new Counter('cache_hits');
const cacheMisses = new Counter('cache_misses');
const cacheHitDuration = new Trend('duration_cache_hit', true);
const cacheMissDuration = new Trend('duration_cache_miss', true);
const failureRate = new Rate('custom_failure_rate');

export const options = {
  scenarios: {
    zone_read_flood: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 500 },   // Warm up to 500 users
        { duration: '1m', target: 2000 },   // Ramp to 2,000 concurrent readers
        { duration: '2m', target: 2000 },   // Sustain 2,000 concurrent readers
        { duration: '30s', target: 0 },     // Cool down
      ],
      gracefulRampDown: '15s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],         // < 1% errors
    http_req_duration: ['p(95)<350'],       // 95% of all requests under 350ms
    duration_cache_hit: ['p(95)<150'],      // 95% of cached reads under 150ms
    custom_failure_rate: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3000';
const PILOT_H3 = '883cf13b25fffff'; // Banani Dhaka H3 Res 8

export default function () {
  // 90% read standard cached endpoint, 10% simulate force-refresh / insights query
  const isCacheMissProbe = Math.random() < 0.10;
  const url = isCacheMissProbe
    ? `${BASE_URL}/api/zone/${PILOT_H3}?refresh=1&_t=${Date.now()}`
    : `${BASE_URL}/api/zone/${PILOT_H3}`;

  const params = {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Halchal-k6-LoadTest/1.0',
    },
    tags: {
      cache_type: isCacheMissProbe ? 'miss_probe' : 'normal_read',
    },
  };

  const res = http.get(url, params);

  const isSuccess = check(res, {
    'status is 200': (r) => r.status === 200,
    'has 4 utility categories': (r) => {
      try {
        const body = JSON.parse(r.body);
        const categories = body.categories || body;
        return Array.isArray(categories) && categories.length === 4;
      } catch {
        return false;
      }
    },
    'area name in Bengali': (r) => {
      return r.body.includes('বনানী') || r.body.includes('ঢাকা');
    },
  });

  if (!isSuccess) {
    failureRate.add(1);
  } else {
    failureRate.add(0);
    const isHit = res.headers['X-Cache'] === 'HIT' || res.headers['x-cache'] === 'HIT' || !isCacheMissProbe;
    if (isHit) {
      cacheHits.add(1);
      cacheHitDuration.add(res.timings.duration);
    } else {
      cacheMisses.add(1);
      cacheMissDuration.add(res.timings.duration);
    }
  }

  // Realistic user think time between checks: 1 to 3 seconds
  sleep(Math.random() * 2 + 1);
}
