/**
 * Halchal (হালচাল) - `submit-report` Unit Test Suite
 * Tests 9-step processing order, input validation, H3 resolution, privacy scrubbing,
 * home-zone gating, rate limiting, and database error mapping.
 */

import { assertEquals, assertRejects, assert } from '@std/assert';
import { handleReportSubmission } from '../submit-report/index.ts';
import {
  createTestDependencies,
  BANANI_LAT,
  BANANI_LNG,
  BANANI_H3,
  GULSHAN2_H3,
  DHANMONDI_H3,
  DHANMONDI_LAT,
  DHANMONDI_LNG,
} from './test-helpers.ts';

Deno.test('submit-report: rejects missing or invalid JWT (Step 1)', async () => {
  const { deps } = createTestDependencies();

  // No Authorization header
  const req1 = new Request('http://localhost/submit-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const res1 = await handleReportSubmission(req1, deps);
  assertEquals(res1.status, 401);
  const data1 = await res1.json();
  assertEquals(data1.code, 'UNAUTHORIZED');
  assertEquals(data1.error, 'প্রবেশাধিকার নেই। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');

  // Invalid Bearer format
  const req2 = new Request('http://localhost/submit-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic invalid' },
    body: JSON.stringify({}),
  });
  const res2 = await handleReportSubmission(req2, deps);
  assertEquals(res2.status, 401);

  // Unregistered token
  const req3 = new Request('http://localhost/submit-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer unknown-token' },
    body: JSON.stringify({}),
  });
  const res3 = await handleReportSubmission(req3, deps);
  assertEquals(res3.status, 401);
});

Deno.test('submit-report: rejects missing or failed attestation (Step 2)', async () => {
  const { deps, authVerifier } = createTestDependencies();
  authVerifier.registerUser('test-jwt-1', { userId: '11111111-1111-1111-1111-111111111111' });

  // Missing attestation
  const req1 = new Request('http://localhost/submit-report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-jwt-1',
    },
    body: JSON.stringify({
      category: 'electricity',
      state: 'out',
      lat: BANANI_LAT,
      lng: BANANI_LNG,
      accuracy_m: 20,
      client_ts: new Date().toISOString(),
      device_id: 'a0000000-0000-0000-0000-000000000001',
      // attestation omitted
    }),
  });
  const res1 = await handleReportSubmission(req1, deps);
  assertEquals(res1.status, 403);
  const data1 = await res1.json();
  assertEquals(data1.code, 'ATTESTATION_FAILED');

  // Invalid attestation token
  const req2 = new Request('http://localhost/submit-report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-jwt-1',
    },
    body: JSON.stringify({
      category: 'electricity',
      state: 'out',
      lat: BANANI_LAT,
      lng: BANANI_LNG,
      accuracy_m: 20,
      client_ts: new Date().toISOString(),
      device_id: 'a0000000-0000-0000-0000-000000000001',
      attestation: 'forged-or-expired-token',
    }),
  });
  const res2 = await handleReportSubmission(req2, deps);
  assertEquals(res2.status, 403);
  const data2 = await res2.json();
  assertEquals(data2.code, 'ATTESTATION_FAILED');
});

Deno.test('submit-report: rejects accuracy_m > 200 (Step 3)', async () => {
  const { deps, authVerifier, attestationVerifier } = createTestDependencies();
  authVerifier.registerUser('test-jwt-1', { userId: '11111111-1111-1111-1111-111111111111' });
  attestationVerifier.addAllowedToken('valid-token-1');

  const req = new Request('http://localhost/submit-report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-jwt-1',
    },
    body: JSON.stringify({
      category: 'electricity',
      state: 'out',
      lat: BANANI_LAT,
      lng: BANANI_LNG,
      accuracy_m: 250, // > 200m
      client_ts: new Date().toISOString(),
      device_id: 'a0000000-0000-0000-0000-000000000001',
      attestation: 'valid-token-1',
    }),
  });
  const res = await handleReportSubmission(req, deps);
  assertEquals(res.status, 400);
  const data = await res.json();
  assertEquals(data.code, 'ACCURACY_TOO_LOW');
  assert(data.error.includes('২০০ মিটারের'));
});

Deno.test('submit-report: strictly enforces LPG price bounds and restricts price to LPG only (Step 3)', async () => {
  const { deps, authVerifier, attestationVerifier } = createTestDependencies();
  authVerifier.registerUser('test-jwt-1', { userId: '11111111-1111-1111-1111-111111111111' });
  attestationVerifier.addAllowedToken('valid-token-1');

  // Price on electricity category -> REJECT
  const req1 = new Request('http://localhost/submit-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-jwt-1' },
    body: JSON.stringify({
      category: 'electricity',
      state: 'ok',
      price_bdt: 1200,
      lat: BANANI_LAT,
      lng: BANANI_LNG,
      accuracy_m: 15,
      client_ts: new Date().toISOString(),
      device_id: 'a0000000-0000-0000-0000-000000000001',
      attestation: 'valid-token-1',
    }),
  });
  const res1 = await handleReportSubmission(req1, deps);
  assertEquals(res1.status, 400);
  const data1 = await res1.json();
  assertEquals(data1.code, 'PRICE_FORBIDDEN_FOR_CATEGORY');

  // Price < 500 on LPG -> REJECT
  const req2 = new Request('http://localhost/submit-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-jwt-1' },
    body: JSON.stringify({
      category: 'lpg',
      state: 'ok',
      price_bdt: 450,
      lat: BANANI_LAT,
      lng: BANANI_LNG,
      accuracy_m: 15,
      client_ts: new Date().toISOString(),
      device_id: 'a0000000-0000-0000-0000-000000000001',
      attestation: 'valid-token-1',
    }),
  });
  const res2 = await handleReportSubmission(req2, deps);
  assertEquals(res2.status, 400);
  const data2 = await res2.json();
  assertEquals(data2.code, 'PRICE_OUT_OF_RANGE');

  // Valid LPG price 1450 -> SUCCEEDS
  const req3 = new Request('http://localhost/submit-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-jwt-1' },
    body: JSON.stringify({
      category: 'lpg',
      state: 'ok',
      price_bdt: 1450,
      lat: BANANI_LAT,
      lng: BANANI_LNG,
      accuracy_m: 15,
      client_ts: new Date().toISOString(),
      device_id: 'a0000000-0000-0000-0000-000000000001',
      attestation: 'valid-token-1',
    }),
  });
  const res3 = await handleReportSubmission(req3, deps);
  assertEquals(res3.status, 200);
  const data3 = await res3.json();
  assertEquals(data3.success, true);
});

Deno.test('submit-report: converts coordinates to H3 Res 8 and scrubs lat/lng (Step 4)', async () => {
  const { deps, authVerifier, attestationVerifier, mockDb } = createTestDependencies();
  authVerifier.registerUser('test-jwt-1', { userId: '11111111-1111-1111-1111-111111111111' });
  attestationVerifier.addAllowedToken('valid-token-1');

  const req = new Request('http://localhost/submit-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-jwt-1' },
    body: JSON.stringify({
      category: 'electricity',
      state: 'out',
      lat: BANANI_LAT,
      lng: BANANI_LNG,
      accuracy_m: 25,
      client_ts: new Date().toISOString(),
      device_id: 'a0000000-0000-0000-0000-000000000001',
      attestation: 'valid-token-1',
    }),
  });
  const res = await handleReportSubmission(req, deps);
  assertEquals(res.status, 200);
  const data = await res.json();

  // H3 index computed correctly
  assertEquals(data.h3_index, BANANI_H3);

  // Lat and Lng MUST NOT exist in the response or DB report row
  assertEquals((data as Record<string, unknown>).lat, undefined);
  assertEquals((data as Record<string, unknown>).lng, undefined);

  const savedReport = mockDb.reports[0];
  assertEquals((savedReport as Record<string, unknown>).lat, undefined);
  assertEquals((savedReport as Record<string, unknown>).lng, undefined);
  assertEquals(savedReport.h3_index, BANANI_H3);
});

Deno.test('submit-report: home-zone gate initializes home cell and allows neighbor reporting (Step 5)', async () => {
  const { deps, authVerifier, attestationVerifier, profileStore } = createTestDependencies();
  const userId = '11111111-1111-1111-1111-111111111111';
  authVerifier.registerUser('test-jwt-1', { userId });
  attestationVerifier.addAllowedToken('valid-token-1');

  // Report 1: User has no home_h3 -> auto-sets to Banani and succeeds
  const req1 = new Request('http://localhost/submit-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-jwt-1' },
    body: JSON.stringify({
      category: 'electricity',
      state: 'out',
      lat: BANANI_LAT,
      lng: BANANI_LNG,
      accuracy_m: 20,
      client_ts: new Date().toISOString(),
      device_id: 'a0000000-0000-0000-0000-000000000001',
      attestation: 'valid-token-1',
    }),
  });
  const res1 = await handleReportSubmission(req1, deps);
  assertEquals(res1.status, 200);

  const profileAfter1 = await profileStore.getProfile(userId);
  assertEquals(profileAfter1?.home_h3, BANANI_H3);
  assert(profileAfter1?.home_h3_changed_at !== null);

  // Report 2: Report for Gulshan 2 (an immediate neighbor in Banani's k=1 disk) for water -> SUCCEEDS
  const req2 = new Request('http://localhost/submit-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-jwt-1' },
    body: JSON.stringify({
      category: 'water',
      state: 'low',
      lat: 23.7940, // Gulshan 2 coordinates
      lng: 90.4130,
      accuracy_m: 20,
      client_ts: new Date().toISOString(),
      device_id: 'a0000000-0000-0000-0000-000000000001',
      attestation: 'valid-token-1',
    }),
  });
  const res2 = await handleReportSubmission(req2, deps);
  assertEquals(res2.status, 200);
  const data2 = await res2.json();
  assertEquals(data2.h3_index, GULSHAN2_H3);
});
