import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  enqueueReport,
  getQueuedReports,
  pruneExpiredQueuedReports,
  flushOfflineQueue,
  clearQueue,
  SubmitReportPayload,
} from './offline-queue';

describe('Halchal Offline Queue & 30-Minute Expiry Tests', () => {
  beforeEach(async () => {
    await clearQueue();
  });

  const samplePayload: SubmitReportPayload = {
    category: 'electricity',
    state: 'out',
    lat: 23.746177,
    lng: 90.373828,
    accuracy_m: 25,
    client_ts: new Date().toISOString(),
    device_id: '11111111-2222-4333-8444-555555555555',
  };

  it('enqueues a report into storage with client_ts and unique id', async () => {
    const item = await enqueueReport(samplePayload);
    assert.ok(item.id.startsWith('rep_'));
    assert.strictEqual(item.payload.category, 'electricity');
    assert.strictEqual(item.payload.state, 'out');
    assert.strictEqual(item.retryCount, 0);

    const queued = await getQueuedReports();
    assert.strictEqual(queued.length, 1);
    assert.strictEqual(queued[0].id, item.id);
  });

  it('drops queued items older than 30 minutes', async () => {
    // 1. Enqueue fresh item
    await enqueueReport(samplePayload);

    // 2. Artificially add an expired item (older than 32 minutes)
    const queue = await getQueuedReports();
    queue.push({
      id: 'rep_expired_123',
      payload: { ...samplePayload, category: 'gas' },
      queuedAt: Date.now() - 32 * 60 * 1000, // 32 minutes ago
      retryCount: 0,
    });

    // 3. Prune expired reports
    const prunedCount = await pruneExpiredQueuedReports();
    assert.strictEqual(prunedCount, 1);

    const afterPrune = await getQueuedReports();
    assert.strictEqual(afterPrune.length, 1);
    assert.strictEqual(afterPrune[0].payload.category, 'electricity');
  });

  it('flushes queued reports when online', async () => {
    await enqueueReport(samplePayload);

    let submitted = false;
    const result = await flushOfflineQueue(async (payload) => {
      submitted = true;
      assert.strictEqual(payload.category, 'electricity');
      return { success: true };
    });

    assert.strictEqual(submitted, true);
    assert.strictEqual(result.flushed, 1);

    const remaining = await getQueuedReports();
    assert.strictEqual(remaining.length, 0);
  });
});
