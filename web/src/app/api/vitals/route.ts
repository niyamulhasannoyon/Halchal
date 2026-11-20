/**
 * Halchal - Privacy-Friendly Web Vitals Field Telemetry Endpoint
 * Architecture: ADR-0005 (Strict Zero PII, No IP Logging, No Location Telemetry)
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json().catch(() => null);
    if (!data || typeof data !== 'object') {
      return new NextResponse(null, { status: 400 });
    }

    const { name, value, rating, pathname, effectiveType } = data;

    if (!name || typeof value !== 'number' || typeof pathname !== 'string') {
      return new NextResponse(null, { status: 400 });
    }

    // Sanitize path (strip query params, clamp length)
    const cleanPath = pathname.split('?')[0].slice(0, 100);

    // In production, metrics can be streamed to telemetry aggregator or Redis
    // Zero IP, zero coordinates, zero user ID logged.
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Web-Vital] ${name}: ${value}ms (${rating}) on ${cleanPath} [${effectiveType || 'unknown'}]`);
    }

    return new NextResponse(null, {
      status: 204,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
