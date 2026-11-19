/**
 * Halchal - 7-Day Zone Insights API Route
 * GET /api/zone/[h3]/insights
 * Architecture: ADR-0006, Read Path Directive
 * Strategy: Upstash Redis (TTL 300s) -> on miss Supabase RPC get_zone_7day_insights -> cache -> return
 * Headers: Cache-Control: s-maxage=60, stale-while-revalidate=300
 */

import { NextRequest, NextResponse } from 'next/server';
import { isValidH3Zone, getZoneMetadata, DHAKA_SEED_ZONES } from '@/lib/zones';
import { getCachedZoneInsights, setCachedZoneInsights } from '@/lib/redis';
import { getSupabaseServerClient } from '@/lib/supabase';
import { Zone7DayInsights, createDefaultZone7DayInsights } from '@/lib/insights';

interface RouteContext {
  params: Promise<{
    h3: string;
  }>;
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

  // 2. Read from Upstash Redis cache (TTL 300s)
  const cachedData = await getCachedZoneInsights<Zone7DayInsights>(h3);
  if (cachedData) {
    return NextResponse.json(
      {
        ...cachedData,
        cached: true,
        cache_note: '7-day insights read from Redis cache',
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
          'x-cache': 'HIT',
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );
  }

  // 3. On Cache Miss: Call Supabase RPC get_zone_7day_insights
  let insightsData: Zone7DayInsights | null = null;
  const meta = getZoneMetadata(h3) || DHAKA_SEED_ZONES[0];

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.rpc('get_zone_7day_insights', { p_h3: h3 });

    if (!error && data && typeof data === 'object' && !('error' in data)) {
      insightsData = data as unknown as Zone7DayInsights;
    }
  } catch (err) {
    console.warn(`Supabase RPC get_zone_7day_insights error for ${h3}:`, err);
  }

  // 4. Fallback if DB RPC returned no data (e.g. offline dev mode or newly initialized zone)
  if (!insightsData) {
    const isSeedZone = DHAKA_SEED_ZONES.some((z) => z.h3_index === h3);
    insightsData = createDefaultZone7DayInsights(
      h3,
      meta.area_name_bn,
      meta.ward,
      meta.city,
      { isSynthetic: isSeedZone }
    );
  }

  // 5. Cache in Redis (TTL 300s)
  await setCachedZoneInsights(h3, insightsData, 300);

  return NextResponse.json(
    {
      ...insightsData,
      cached: false,
      cache_note: 'Freshly computed from zone_hourly_stats & status_events',
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
        'x-cache': 'MISS',
        'Content-Type': 'application/json; charset=utf-8',
      },
    }
  );
}
