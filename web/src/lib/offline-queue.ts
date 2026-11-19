/**
 * Halchal - Offline Report Queue & Synchronization
 * Architecture: ADR-0002, ADR-0008, 2G/3G Resilience Directive
 * Backed by IndexedDB via idb-keyval with fallback in-memory store for Node test environments.
 * Drops queued items older than 30 minutes.
 */

import { get, set } from 'idb-keyval';
import { UtilityCategory, UserReportState } from './theme';

export interface SubmitReportPayload {
  category: UtilityCategory;
  state: UserReportState;
  price_bdt?: number | null;
  lat: number;
  lng: number;
  accuracy_m: number;
  client_ts: string;
  device_id: string;
  attestation?: unknown;
  update_home?: boolean;
}

export interface QueuedReportItem {
  id: string;
  payload: SubmitReportPayload;
  queuedAt: number;
  retryCount: number;
}

const QUEUE_KEY = 'halchal_offline_report_queue';
const THIRTY_MINUTES_MS = 30 * 60 * 1000;

// Universal storage layer supporting browser IndexedDB and Node test environments
const memoryStore = new Map<string, unknown>();

async function readQueue(): Promise<QueuedReportItem[]> {
  if (typeof indexedDB !== 'undefined') {
    try {
      const items = await get<QueuedReportItem[]>(QUEUE_KEY);
      return items || [];
    } catch {
      // Fallback
    }
  }
  return (memoryStore.get(QUEUE_KEY) as QueuedReportItem[]) || [];
}

async function writeQueue(items: QueuedReportItem[]): Promise<void> {
  if (typeof indexedDB !== 'undefined') {
    try {
      await set(QUEUE_KEY, items);
      return;
    } catch {
      // Fallback
    }
  }
  memoryStore.set(QUEUE_KEY, items);
}

/**
 * Enqueues a report when client is offline or network fails
 */
export async function enqueueReport(payload: SubmitReportPayload): Promise<QueuedReportItem> {
  const item: QueuedReportItem = {
    id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    payload,
    queuedAt: Date.now(),
    retryCount: 0,
  };

  const queue = await readQueue();
  queue.push(item);
  await writeQueue(queue);

  // Try to register background sync if supported in service worker
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      // @ts-expect-error SyncManager is not in all standard TS definitions
      if (reg.sync) {
        // @ts-expect-error sync.register
        await reg.sync.register('sync-reports');
      }
    } catch {
      // Background Sync optional fallback
    }
  }

  // Dispatch custom event for UI feedback
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('halchal:report_queued', {
        detail: {
          message: 'অফলাইনে সেভ হয়েছে, নেট এলেই জমা হবে',
          item,
        },
      })
    );
  }

  return item;
}

/**
 * Returns all currently queued reports
 */
export async function getQueuedReports(): Promise<QueuedReportItem[]> {
  return await readQueue();
}

/**
 * Drops queued items older than 30 minutes
 */
export async function pruneExpiredQueuedReports(): Promise<number> {
  const now = Date.now();
  const queue = await readQueue();
  let prunedCount = 0;

  const valid = queue.filter((item) => {
    const isFresh = now - item.queuedAt < THIRTY_MINUTES_MS;
    if (!isFresh) prunedCount++;
    return isFresh;
  });

  if (prunedCount > 0) {
    await writeQueue(valid);
  }

  return prunedCount;
}

/**
 * Flushes all queued reports when connection is restored
 */
export async function flushOfflineQueue(
  submitFn: (payload: SubmitReportPayload) => Promise<{ success: boolean; error?: string }>
): Promise<{ flushed: number; failed: number; dropped: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { flushed: 0, failed: 0, dropped: 0 };
  }

  const dropped = await pruneExpiredQueuedReports();
  const queue = await readQueue();

  if (queue.length === 0) {
    return { flushed: 0, failed: 0, dropped };
  }

  let flushed = 0;
  let failed = 0;
  const remaining: QueuedReportItem[] = [];

  for (const item of queue) {
    try {
      const result = await submitFn(item.payload);
      if (result.success) {
        flushed++;
      } else {
        item.retryCount++;
        if (item.retryCount < 3) {
          remaining.push(item);
        }
        failed++;
      }
    } catch {
      item.retryCount++;
      if (item.retryCount < 3) {
        remaining.push(item);
      }
      failed++;
    }
  }

  await writeQueue(remaining);

  if (flushed > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('halchal:queue_flushed', {
        detail: { flushed, remainingCount: remaining.length },
      })
    );
  }

  return { flushed, failed, dropped };
}

/**
 * Initializes automatic background listeners for online and focus events
 */
export function initOfflineQueueListeners(
  submitFn: (payload: SubmitReportPayload) => Promise<{ success: boolean; error?: string }>
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnlineOrFocus = () => {
    if (navigator.onLine) {
      void flushOfflineQueue(submitFn);
    }
  };

  window.addEventListener('online', handleOnlineOrFocus);
  window.addEventListener('focus', handleOnlineOrFocus);

  handleOnlineOrFocus();

  return () => {
    window.removeEventListener('online', handleOnlineOrFocus);
    window.removeEventListener('focus', handleOnlineOrFocus);
  };
}

/**
 * Clears queue (useful in test suites)
 */
export async function clearQueue(): Promise<void> {
  await writeQueue([]);
}
