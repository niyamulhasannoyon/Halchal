/**
 * Halchal - Push Notification Settings Route Handler
 * GET /api/push/settings?endpoint=...
 * POST /api/push/settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const endpoint = searchParams.get('endpoint');
  const deviceId = searchParams.get('device_id');

  if (!endpoint && !deviceId) {
    return NextResponse.json(
      { success: false, error: 'এন্ডপয়েন্ট বা ডিভাইস আইডি আবশ্যক' },
      { status: 400 }
    );
  }

  const serviceClient = getSupabaseServiceClient();
  if (!serviceClient) {
    return NextResponse.json({
      success: true,
      settings: {
        categories: ['electricity', 'gas', 'water', 'lpg'],
        allow_night_alerts: false,
        h3_subscriptions: [],
      },
    });
  }

  let query = serviceClient.from('push_subscriptions').select('*');
  if (endpoint) {
    query = query.eq('token_or_endpoint', endpoint);
  } else if (deviceId) {
    query = query.eq('device_id', deviceId);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    return NextResponse.json({
      success: true,
      settings: {
        categories: ['electricity', 'gas', 'water', 'lpg'],
        allow_night_alerts: false,
        h3_subscriptions: [],
      },
    });
  }

  return NextResponse.json({
    success: true,
    settings: {
      categories: data.categories || ['electricity', 'gas', 'water', 'lpg'],
      allow_night_alerts: Boolean(data.allow_night_alerts),
      h3_subscriptions: data.h3_subscriptions || [],
    },
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json().catch(() => ({}));
    const { endpoint, device_id, categories, allow_night_alerts, h3_subscriptions } = body;

    if (!endpoint && !device_id) {
      return NextResponse.json(
        { success: false, error: 'এন্ডপয়েন্ট বা ডিভাইস আইডি আবশ্যক' },
        { status: 400 }
      );
    }

    const serviceClient = getSupabaseServiceClient();
    if (serviceClient) {
      let query = serviceClient.from('push_subscriptions').update({
        categories: categories || ['electricity', 'gas', 'water', 'lpg'],
        allow_night_alerts: Boolean(allow_night_alerts),
        h3_subscriptions: h3_subscriptions || [],
        updated_at: new Date().toISOString(),
      });

      if (endpoint) {
        query = query.eq('token_or_endpoint', endpoint);
      } else {
        query = query.eq('device_id', device_id);
      }

      await query;
    }

    return NextResponse.json({
      success: true,
      message: 'সেটিংস সফলভাবে আপডেট হয়েছে।',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: 'সেটিংস সংরক্ষণে ব্যর্থ', details: message },
      { status: 500 }
    );
  }
}
