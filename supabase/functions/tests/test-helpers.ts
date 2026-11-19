/**
 * Halchal (হালচাল) - Test Helpers & Mock Stubs
 * Provides in-memory test harness for Supabase Edge Functions and abuse scripts.
 */

import { MockAuthVerifier } from '../_shared/auth.ts';
import { MockAttestationVerifier } from '../_shared/attestation.ts';
import { InMemoryProfileStore } from '../_shared/home-zone.ts';
import { InMemoryRedisClient } from '../_shared/redis.ts';
import { HalchalRateLimiter } from '../_shared/rate-limit.ts';
import { SubmitReportDependencies } from '../submit-report/index.ts';
import { RestoreVoteDependencies } from '../restore-vote/index.ts';
import { SupabaseClient } from '@supabase/supabase-js';

export const BANANI_LAT = 23.7925;
export const BANANI_LNG = 90.4078;
export const BANANI_H3 = '883cf13b25fffff'; // Seed zone for Banani
export const GULSHAN2_H3 = '883cf13b27fffff'; // Immediate neighbor (k=1)
export const DHANMONDI_H3 = '883cf10ca1fffff'; // Far away (NOT neighbor, k > 1)
export const DHANMONDI_LAT = 23.7465;
export const DHANMONDI_LNG = 90.3760;

export interface MockDatabaseState {
  reports: Array<Record<string, unknown>>;
  zones: Set<string>;
  zoneStatuses: Map<string, Record<string, unknown>>;
}

export function createMockSupabaseClient(initialZones: string[] = [BANANI_H3, GULSHAN2_H3, DHANMONDI_H3]): {
  client: SupabaseClient;
  db: MockDatabaseState;
} {
  const db: MockDatabaseState = {
    reports: [],
    zones: new Set(initialZones),
    zoneStatuses: new Map(),
  };

  const client = {
    rpc: async (functionName: string, args: Record<string, unknown>) => {
      if (functionName === 'submit_report') {
        const { p_user, p_device_hash, p_h3, p_category, p_state, p_price, p_client_ts } = args;

        // 1. Identity validation
        if (!p_user && !p_device_hash) {
          return {
            data: null,
            error: { code: 'P0001', message: 'IDENTITY_REQUIRED', details: 'IDENTITY_REQUIRED' },
          };
        }

        // 2. Zone check
        if (!db.zones.has(String(p_h3))) {
          return {
            data: null,
            error: { code: 'P0004', message: 'ZONE_NOT_FOUND', details: 'UNKNOWN_H3_ZONE' },
          };
        }

        // 3. Rate limiting (DB level defense-in-depth)
        const nowMs = Date.now();
        const recentUserReport = db.reports.find(
          (r) =>
            r.user_id === p_user &&
            r.category === p_category &&
            nowMs - (r.received_at as number) < 15 * 60 * 1000
        );
        if (recentUserReport) {
          return {
            data: null,
            error: { code: 'P0015', message: 'DUPLICATE_REPORT_RATE_LIMIT', details: 'RATE_LIMITED_USER_15M' },
          };
        }

        const recentDeviceReport = db.reports.find(
          (r) =>
            r.device_id_hash === p_device_hash &&
            r.category === p_category &&
            nowMs - (r.received_at as number) < 15 * 60 * 1000
        );
        if (recentDeviceReport) {
          return {
            data: null,
            error: { code: 'P0016', message: 'DUPLICATE_DEVICE_RATE_LIMIT', details: 'RATE_LIMITED_DEVICE_15M' },
          };
        }

        // Record report in mock DB
        const reportRow = {
          id: crypto.randomUUID(),
          user_id: p_user,
          device_id_hash: p_device_hash,
          h3_index: p_h3,
          category: p_category,
          state: p_state,
          price_bdt: p_price,
          client_ts: p_client_ts,
          received_at: nowMs,
        };
        db.reports.push(reportRow);

        const updatedStatus = {
          h3_index: p_h3,
          category: p_category,
          state: p_state,
          distinct_reporters: 1,
          weighted_score: 1.0,
          state_since: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        db.zoneStatuses.set(`${p_h3}:${p_category}`, updatedStatus);

        return { data: updatedStatus, error: null };
      }

      if (functionName === 'get_zone_status') {
        const h3 = String(args.p_h3);
        const categories = ['electricity', 'gas', 'water', 'lpg'];
        const results = categories.map((cat) => {
          const cached = db.zoneStatuses.get(`${h3}:${cat}`);
          return (
            cached || {
              h3_index: h3,
              area_name_bn: h3 === BANANI_H3 ? 'বনানী' : 'ঢাকা',
              ward: 'ওয়ার্ড ১৯',
              city: 'ঢাকা',
              category: cat,
              state: 'unknown',
              distinct_reporters: 0,
              weighted_score: 0.0,
              state_since: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          );
        });
        return { data: results, error: null };
      }

      return { data: null, error: { message: `Unknown mock function ${functionName}` } };
    },
    from: (_tableName: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
      update: () => ({
        eq: async () => ({ error: null }),
      }),
      upsert: async () => ({ error: null }),
    }),
    auth: {
      admin: {
        getUserById: async (id: string) => ({
          data: {
            user: {
              id,
              app_metadata: { provider: 'anonymous' },
              user_metadata: {},
            },
          },
          error: null,
        }),
      },
    },
  } as unknown as SupabaseClient;

  return { client, db };
}

export function createTestDependencies(options?: {
  initialZones?: string[];
  testSecret?: string;
}): {
  deps: SubmitReportDependencies & RestoreVoteDependencies;
  authVerifier: MockAuthVerifier;
  attestationVerifier: MockAttestationVerifier;
  profileStore: InMemoryProfileStore;
  redisClient: InMemoryRedisClient;
  rateLimiter: HalchalRateLimiter;
  mockDb: MockDatabaseState;
} {
  const secret = options?.testSecret || 'test-server-secret-key-1234567890';
  const { client, db } = createMockSupabaseClient(options?.initialZones);

  const authVerifier = new MockAuthVerifier();
  const attestationVerifier = new MockAttestationVerifier();
  const profileStore = new InMemoryProfileStore();
  const redisClient = new InMemoryRedisClient();
  const rateLimiter = new HalchalRateLimiter(redisClient);

  const deps: SubmitReportDependencies & RestoreVoteDependencies = {
    authVerifier,
    attestationVerifier,
    supabaseClient: client,
    profileStore,
    redisClient,
    rateLimiter,
    deviceSecret: secret,
    actionSecret: secret,
  };

  return {
    deps,
    authVerifier,
    attestationVerifier,
    profileStore,
    redisClient,
    rateLimiter,
    mockDb: db,
  };
}
