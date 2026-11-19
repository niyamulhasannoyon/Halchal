/**
 * Halchal (হালচাল) - `restore-vote` Unit Test Suite
 * Tests HMAC verification, 15-minute token expiry, single-use consumption,
 * and GET (HTML) / POST (JSON) response modes.
 */

import { assertEquals, assert } from '@std/assert';
import { handleRestoreVote } from '../restore-vote/index.ts';
import { createActionToken } from '../_shared/action-token.ts';
import {
  createTestDependencies,
  BANANI_H3,
} from './test-helpers.ts';

Deno.test('restore-vote: rejects missing token or invalid vote parameter', async () => {
  const { deps } = createTestDependencies();

  // Missing token
  const req1 = new Request('http://localhost/restore-vote?vote=ok', { method: 'GET' });
  const res1 = await handleRestoreVote(req1, deps);
  assertEquals(res1.status, 400); // Renders friendly HTML error
  const html1 = await res1.text();
  assert(html1.includes('টোকেন'));

  // Invalid vote value (not 'ok' and not 'out')
  const req2 = new Request('http://localhost/restore-vote?token=xyz&vote=maybe', { method: 'GET' });
  const res2 = await handleRestoreVote(req2, deps);
  assertEquals(res2.status, 400);
  const html2 = await res2.text();
  assert(html2.includes('শুধুমাত্র ok'));
});

Deno.test('restore-vote: rejects forged or tampered action tokens', async () => {
  const { deps } = createTestDependencies();

  const validToken = await createActionToken(
    {
      userId: '11111111-1111-1111-1111-111111111111',
      deviceId: 'a0000000-0000-0000-0000-000000000001',
      h3Index: BANANI_H3,
      category: 'electricity',
    },
    deps.actionSecret
  );

  // Tamper with signature
  const tamperedToken = validToken.slice(0, -5) + 'xxxxx';

  const req = new Request('http://localhost/restore-vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: tamperedToken, vote: 'ok' }),
  });
  const res = await handleRestoreVote(req, deps);
  assertEquals(res.status, 403);
  const data = await res.json();
  assertEquals(data.code, 'INVALID_ACTION_TOKEN');
  assert(data.error.includes('স্বাক্ষর সঠিক নয়'));
});

Deno.test('restore-vote: rejects expired action tokens (> 15 min)', async () => {
  const { deps } = createTestDependencies();

  // Create token with ttl = -1 (already expired)
  const expiredToken = await createActionToken(
    {
      userId: '11111111-1111-1111-1111-111111111111',
      deviceId: 'a0000000-0000-0000-0000-000000000001',
      h3Index: BANANI_H3,
      category: 'electricity',
    },
    deps.actionSecret,
    -1 // expired
  );

  const req = new Request('http://localhost/restore-vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: expiredToken, vote: 'ok' }),
  });
  const res = await handleRestoreVote(req, deps);
  assertEquals(res.status, 401);
  const data = await res.json();
  assertEquals(data.code, 'TOKEN_EXPIRED');
  assert(data.error.includes('মেয়াদ শেষ'));
});

Deno.test('restore-vote: enforces single-use token consumption (replay protection)', async () => {
  const { deps, mockDb } = createTestDependencies();

  const token = await createActionToken(
    {
      userId: '11111111-1111-1111-1111-111111111111',
      deviceId: 'a0000000-0000-0000-0000-000000000001',
      h3Index: BANANI_H3,
      category: 'electricity',
    },
    deps.actionSecret,
    900 // 15 min
  );

  // 1st Attempt: Should succeed!
  const req1 = new Request('http://localhost/restore-vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, vote: 'ok' }),
  });
  const res1 = await handleRestoreVote(req1, deps);
  assertEquals(res1.status, 200);
  const data1 = await res1.json();
  assertEquals(data1.success, true);
  assertEquals(mockDb.reports.length, 1);
  assertEquals(mockDb.reports[0].state, 'ok');

  // 2nd Attempt with SAME token: MUST BE REJECTED with 409
  const req2 = new Request('http://localhost/restore-vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, vote: 'ok' }),
  });
  const res2 = await handleRestoreVote(req2, deps);
  assertEquals(res2.status, 409);
  const data2 = await res2.json();
  assertEquals(data2.code, 'TOKEN_ALREADY_USED');
  assert(data2.error.includes('ইতিমধ্যে ব্যবহার করা হয়েছে'));
});

Deno.test('restore-vote: GET request renders lightweight accessible Bengali HTML page', async () => {
  const { deps } = createTestDependencies();

  const token = await createActionToken(
    {
      userId: '11111111-1111-1111-1111-111111111111',
      deviceId: 'a0000000-0000-0000-0000-000000000001',
      h3Index: BANANI_H3,
      category: 'electricity',
    },
    deps.actionSecret
  );

  const req = new Request(`http://localhost/restore-vote?token=${encodeURIComponent(token)}&vote=ok`, {
    method: 'GET',
  });
  const res = await handleRestoreVote(req, deps);
  assertEquals(res.status, 200);
  assertEquals(res.headers.get('content-type'), 'text/html; charset=utf-8');
  const html = await res.text();
  assert(html.includes('ধন্যবাদ!'));
  assert(html.includes('বিদ্যুৎ ও সেবা স্বাভাবিক হওয়ার'));
});
