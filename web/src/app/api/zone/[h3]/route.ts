/**
 * Halchal - Fast Zone Read Route Handler
 * GET /api/zone/[h3]
 * Architecture: ADR-0007, Read Path Directive
 * Strategy: Upstash Redis (TTL 60s) -> on miss Supabase RPC get_zone_status -> cache -> return
 * Headers: Cache-Control: s-maxage=30, stale-while-revalidate=60
 */

import { NextRequest, NextResponse } from 'next/server';
import { isValidH3Zone, createDefaultZoneStatus, ZoneStatusResponse, ZoneCategoryStatus } from '@/lib/zones';
import { getCachedZoneStatus, setCachedZoneStatus } from '@/lib/redis';
import { getSupabaseServerClient } from '@/lib/supabase';
import { UtilityCategory, ZoneDisplayState } from '@/lib/theme';

interface RouteContext {
  params: Promise<{
    h3: string;
  }>;
}

interface DbCategoryRow {
  h3_index: string;
  area_name_bn: string;
  ward: string;
  city: string;
  category: UtilityCategory;
  state: ZoneDisplayState;
  distinct_reporters: number;
  weighted_score: number;
  state_since: string;
  updated_at: string;
}

export async function GET(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { h3 } = await context.params;

  // 1. Strict H3 string validation (Res 8)
  if (!isValidH3Zone(h3)) {
    return NextResponse.json(
      {
        success: false,
        error: 'অবৈধ H3 জোন ফরম্যাট। Uber H3 Resolution 8 ইনডেক্স আবশ্যক।',
      },
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );
  }

  // 2. Read from Upstash Redis cache (TTL 60s)
  const cachedData = await getCachedZoneStatus<ZoneStatusResponse>(h3);
  if (cachedData) {
    return NextResponse.json(
      {
        ...cachedData,
        cached: true,
        cache_note: 'DB reads are cached',
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 's-maxage=30, stale-while-revalidate=60',
          'x-cache': 'HIT',
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );
  }

  // 3. On Cache Miss: Call Supabase RPC get_zone_status
  let zoneData: ZoneStatusResponse | null = null;

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.rpc('get_zone_status', { p_h3: h3 });

    if (!error && data && Array.isArray(data) && data.length > 0) {
      const rows = data as DbCategoryRow[];
      const firstRow = rows[0];

      const categoriesMap: Record<UtilityCategory, ZoneCategoryStatus> = {
        electricity: {
          category: 'electricity',
          state: 'unknown',
          distinct_reporters: 0,
          weighted_score: 0,
          state_since: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        gas: {
          category: 'gas',
          state: 'unknown',
          distinct_reporters: 0,
          weighted_score: 0,
          state_since: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        water: {
          category: 'water',
          state: 'unknown',
          distinct_reporters: 0,
          weighted_score: 0,
          state_since: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        lpg: {
          category: 'lpg',
          state: 'unknown',
          distinct_reporters: 0,
          weighted_score: 0,
          state_since: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };

      for (const row of rows) {
        if (categoriesMap[row.category]) {
          categoriesMap[row.category] = {
            category: row.category,
            state: row.state,
            distinct_reporters: row.distinct_reporters,
            weighted_score: Number(row.weighted_score || 0),
            state_since: row.state_since,
            updated_at: row.updated_at,
          };
        }
      }

      zoneData = {
        h3_index: h3,
        area_name_bn: firstRow.area_name_bn,
        ward: firstRow.ward,
        city: firstRow.city,
        updated_at: firstRow.updated_at,
        categories: categoriesMap,
        cached: false,
        cache_note: 'DB reads are cached',
      };
    }
  } catch (err) {
    console.warn(`Database read error for zone ${h3}:`, err);
  }

  // If no DB rows or DB unreachable (e.g. offline dev), fallback to default zone state
  if (!zoneData) {
    zoneData = createDefaultZoneStatus(h3);
  }

  // 4. Cache in Upstash Redis with 60-second TTL
  await setCachedZoneStatus(h3, zoneData, 60);

  // 5. Return fast response with stale-while-revalidate
  return NextResponse.json(zoneData, {
    status: 200,
    headers: {
      'Cache-Control': 's-maxage=30, stale-while-revalidate=60',
      'x-cache': 'MISS',
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}
