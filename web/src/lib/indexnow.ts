/**
 * Halchal - IndexNow Protocol Engine (Microsoft Bing & Participating Engines)
 * Architecture: Technical SEO Foundation (ADR-0017)
 *
 * Rules:
 * 1. Pings Bing/IndexNow ONLY when a zone page's indexability or content changes MEANINGFULLY:
 *    - Transition from non-indexable to indexable (passes shouldIndexZone)
 *    - Confirmed macro consensus state change (e.g. verified blackout or restoration with distinct_reporters >= 3)
 *    - Regulatory price benchmark update (BERC LPG monthly announcement)
 *    - Citizen guides editorial publication
 * 2. Strictly REJECTS minor status flips:
 *    - Single unverified user report
 *    - Flips within unverified or unknown states
 *    - Unconfirmed reports failing consensus thresholds
 * 3. Rate-Limits Submissions:
 *    - Minimum 24-hour cooldown per URL
 *    - Maximum 100 URLs per day
 * 4. Safety Guardrails:
 *    - Never pings external search engines during local tests, CI builds, or preview deployments
 */

import { siteConfig } from '@/config/site';
import { shouldIndexZone, ZoneIndexCriteria } from '@/lib/seo';
import { ZoneDisplayState } from '@/lib/theme';

export const DEFAULT_INDEXNOW_KEY = 'c7e19d3f8a4b2e650123456789abcdef';
export const INDEXNOW_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24-hour cooldown per URL
export const MAX_DAILY_INDEXNOW_PINGS = 100;

export interface ZoneStateTransition {
  url: string;
  previousIndexable?: boolean;
  newIndexable?: boolean;
  previousState?: ZoneDisplayState;
  newState?: ZoneDisplayState;
  distinctReporters?: number;
  weightedTrustScore?: number;
  reason?: 'indexability_transition' | 'macro_outage_transition' | 'regulatory_benchmark' | 'guide_publication' | 'minor_report';
}

export interface IndexNowPayload {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

export interface PingResult {
  success: boolean;
  statusCode?: number;
  submittedCount: number;
  urlsSubmitted: string[];
  skippedUrls: string[];
  dryRun: boolean;
  message: string;
}

// In-memory rate limiting tracker (backed by timestamp cache)
const urlPingHistory = new Map<string, number>();
let dailyPingCount = 0;
let dailyCounterResetTime = Date.now();

export function getIndexNowKey(): string {
  return process.env.INDEXNOW_KEY || DEFAULT_INDEXNOW_KEY;
}

export function getIndexNowKeyLocation(baseOrigin?: string): string {
  const origin = (baseOrigin || siteConfig.url).replace(/\/+$/, '');
  const key = getIndexNowKey();
  return `${origin}/${key}.txt`;
}

export function resetRateLimitCache(): void {
  urlPingHistory.clear();
  dailyPingCount = 0;
  dailyCounterResetTime = Date.now();
}

/**
 * Determines whether a zone change qualifies as a "meaningful change" deserving an IndexNow ping.
 * Rejects all minor unverified flips, single-user fluctuations, and non-indexable states.
 */
export function isMeaningfulZoneChange(transition: ZoneStateTransition): { shouldPing: boolean; reason: string } {
  // 1. If currently not indexable, never ping IndexNow
  if (transition.newIndexable === false) {
    return { shouldPing: false, reason: 'Target zone fails indexability criteria (shouldIndexZone === false)' };
  }

  // 2. Indexability Transition: Zone just crossed the confirmation threshold into indexable status
  if (transition.previousIndexable === false && transition.newIndexable === true) {
    return { shouldPing: true, reason: 'Zone became newly indexable (passed threshold)' };
  }

  // 3. Regulatory or Editorial updates are inherently meaningful
  if (transition.reason === 'regulatory_benchmark' || transition.reason === 'guide_publication') {
    return { shouldPing: true, reason: `Meaningful update: ${transition.reason}` };
  }

  // 4. Minor report rejection
  if (transition.reason === 'minor_report') {
    return { shouldPing: false, reason: 'Minor report without consensus is discarded' };
  }

  // 5. Consensus Guard: Check whether state change is backed by real community consensus
  const reporters = transition.distinctReporters ?? 0;
  const trust = transition.weightedTrustScore ?? 0;
  const hasConsensus = reporters >= 3 && trust >= 3.0;

  if (!hasConsensus) {
    return {
      shouldPing: false,
      reason: `Consensus not met (reporters: ${reporters}/3, trust: ${trust}/3.0). Minor flip suppressed.`,
    };
  }

  // 6. Confirmed Macro State Change (e.g. ok -> out, or out -> ok)
  if (
    transition.previousState &&
    transition.newState &&
    transition.previousState !== transition.newState
  ) {
    const isMajorShift =
      (transition.previousState === 'ok' && transition.newState === 'out') ||
      (transition.previousState === 'out' && transition.newState === 'ok') ||
      (transition.previousState === 'low' && transition.newState === 'out') ||
      (transition.previousState === 'out' && transition.newState === 'low');

    if (isMajorShift) {
      return { shouldPing: true, reason: `Confirmed macro outage transition: ${transition.previousState} -> ${transition.newState}` };
    }
  }

  return { shouldPing: false, reason: 'Change does not qualify as a macro shift or indexability milestone' };
}

/**
 * Checks per-URL cooldown (24h) and daily rate limits.
 */
export function checkIndexNowRateLimit(url: string, now: number = Date.now()): { allowed: boolean; reason?: string } {
  // Reset daily quota every 24h
  if (now - dailyCounterResetTime > 24 * 60 * 60 * 1000) {
    dailyPingCount = 0;
    dailyCounterResetTime = now;
  }

  if (dailyPingCount >= MAX_DAILY_INDEXNOW_PINGS) {
    return { allowed: false, reason: `Daily IndexNow quota reached (${MAX_DAILY_INDEXNOW_PINGS}/day)` };
  }

  const lastPing = urlPingHistory.get(url);
  if (lastPing && now - lastPing < INDEXNOW_COOLDOWN_MS) {
    const hoursRemaining = Math.ceil((INDEXNOW_COOLDOWN_MS - (now - lastPing)) / (60 * 60 * 1000));
    return { allowed: false, reason: `URL is in 24h cooldown (${hoursRemaining} hours remaining)` };
  }

  return { allowed: true };
}

/**
 * Submits URL changes to the IndexNow endpoint (Bing, Yandex, etc.)
 */
export async function pingIndexNow(options: {
  urls: string[];
  host?: string;
  key?: string;
  keyLocation?: string;
  force?: boolean;
  dryRun?: boolean;
}): Promise<PingResult> {
  const { force = false } = options;
  const key = options.key || getIndexNowKey();
  const host = options.host || new URL(siteConfig.url).host;
  const keyLocation = options.keyLocation || getIndexNowKeyLocation();

  const isNonProduction =
    process.env.NODE_ENV !== 'production' ||
    process.env.HALCHAL_INDEXNOW_DRY_RUN === 'true' ||
    process.env.VERCEL_ENV === 'preview' ||
    siteConfig.url.includes('localhost');

  const dryRun = options.dryRun ?? isNonProduction;

  const validUrlsToSubmit: string[] = [];
  const skippedUrls: string[] = [];

  const now = Date.now();

  for (const rawUrl of options.urls) {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.host !== host && !dryRun) {
        skippedUrls.push(`${rawUrl} (Host mismatch: ${parsed.host} !== ${host})`);
        continue;
      }

      if (!force) {
        const rateCheck = checkIndexNowRateLimit(rawUrl, now);
        if (!rateCheck.allowed) {
          skippedUrls.push(`${rawUrl} (${rateCheck.reason})`);
          continue;
        }
      }

      validUrlsToSubmit.push(rawUrl);
    } catch {
      skippedUrls.push(`${rawUrl} (Malformed URL)`);
    }
  }

  if (validUrlsToSubmit.length === 0) {
    return {
      success: true,
      statusCode: 200,
      submittedCount: 0,
      urlsSubmitted: [],
      skippedUrls,
      dryRun,
      message: 'No URLs met indexability and rate-limit criteria for submission.',
    };
  }

  const payload: IndexNowPayload = {
    host,
    key,
    keyLocation,
    urlList: validUrlsToSubmit,
  };

  // Dry run or testing environment: record without sending live external network request
  if (dryRun) {
    for (const url of validUrlsToSubmit) {
      urlPingHistory.set(url, now);
      dailyPingCount++;
    }
    return {
      success: true,
      statusCode: 200,
      submittedCount: validUrlsToSubmit.length,
      urlsSubmitted: validUrlsToSubmit,
      skippedUrls,
      dryRun: true,
      message: `[Dry Run] Successfully simulated IndexNow ping for ${validUrlsToSubmit.length} URL(s).`,
    };
  }

  // Live production dispatch to IndexNow API
  try {
    const endpoints = [
      'https://api.indexnow.org/indexnow',
      'https://www.bing.com/indexnow',
    ];

    let lastError: Error | null = null;
    let res: Response | null = null;

    for (const endpoint of endpoints) {
      try {
        res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'User-Agent': 'Halchal-IndexNow/1.0',
          },
          body: JSON.stringify(payload),
        });

        // 200 (OK) or 202 (Accepted) are valid IndexNow success codes
        if (res.status === 200 || res.status === 202) {
          break;
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    if (res && (res.status === 200 || res.status === 202)) {
      for (const url of validUrlsToSubmit) {
        urlPingHistory.set(url, now);
        dailyPingCount++;
      }

      return {
        success: true,
        statusCode: res.status,
        submittedCount: validUrlsToSubmit.length,
        urlsSubmitted: validUrlsToSubmit,
        skippedUrls,
        dryRun: false,
        message: `Successfully notified IndexNow of ${validUrlsToSubmit.length} updated URL(s).`,
      };
    }

    return {
      success: false,
      statusCode: res?.status || 500,
      submittedCount: 0,
      urlsSubmitted: [],
      skippedUrls,
      dryRun: false,
      message: `IndexNow submission returned status ${res?.status}: ${lastError?.message || 'Submission rejected'}`,
    };
  } catch (err: any) {
    return {
      success: false,
      statusCode: 500,
      submittedCount: 0,
      urlsSubmitted: [],
      skippedUrls,
      dryRun: false,
      message: `Failed to contact IndexNow endpoints: ${err.message}`,
    };
  }
}
