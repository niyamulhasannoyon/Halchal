import { NextResponse } from 'next/server';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { getRedisClient } from '@/lib/redis';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const startedAt = Date.now();
  const checks: Record<string, 'ok' | 'degraded' | 'unconfigured' | 'error'> = {
    app: 'ok',
  };

  // 1. Database Connectivity Check
  try {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from('zones').select('h3_index').limit(1);
    checks.database = error ? 'degraded' : 'ok';
  } catch {
    checks.database = 'error';
  }

  // 2. Redis Cache Check
  try {
    const redis = getRedisClient();
    if (redis) {
      await redis.ping();
      checks.redis = 'ok';
    } else {
      checks.redis = 'unconfigured';
    }
  } catch {
    checks.redis = 'degraded';
  }

  const isHealthy = checks.app === 'ok' && checks.database !== 'error';
  const responseTimeMs = Date.now() - startedAt;

  return NextResponse.json(
    {
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      uptime_seconds: typeof process.uptime === 'function' ? Math.floor(process.uptime()) : undefined,
      response_time_ms: responseTimeMs,
      checks,
    },
    {
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Content-Type': 'application/json; charset=utf-8',
      },
    }
  );
}
