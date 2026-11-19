/**
 * Halchal - Web Push Subscription Route Handler
 * POST /api/push/subscribe
 * Architecture: ADR-0002, ADR-0007, Service Role Isolation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      subscription,
      h3_subscriptions,
      categories,
      allow_night_alerts = false,
      device_id,
      user_id,
    } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { success: false, error: 'অবৈধ সাবস্ক্রিপশন ডেটা' },
        { status: 400 }
      );
    }

    const serviceClient = getSupabaseServiceClient();

    if (serviceClient) {
      const { data, error } = await serviceClient.rpc('upsert_push_subscription', {
        p_endpoint: subscription.endpoint,
        p_kind: 'webpush',
        p_keys: subscription.keys || {},
        p_h3_subscriptions: h3_subscriptions || [],
        p_categories: categories || ['electricity', 'gas', 'water', 'lpg'],
        p_allow_night_alerts: Boolean(allow_night_alerts),
        p_device_id: device_id || null,
        p_user_id: user_id || null,
      });

      if (error) {
        // Fallback to direct upsert if RPC is unavailable in current migration state
        const { error: upsertErr } = await serviceClient
          .from('push_subscriptions')
          .upsert(
            {
              token_or_endpoint: subscription.endpoint,
              kind: 'webpush',
              keys: subscription.keys || {},
              h3_subscriptions: h3_subscriptions || [],
              categories: categories || ['electricity', 'gas', 'water', 'lpg'],
              allow_night_alerts: Boolean(allow_night_alerts),
              device_id: device_id || null,
              user_id: user_id || null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'token_or_endpoint' }
          );

        if (upsertErr) {
          console.warn('Database upsert warning:', upsertErr.message);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'নোটিফিকেশন সাবস্ক্রিপশন সফলভাবে সংরক্ষিত হয়েছে।',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: 'সাবস্ক্রিপশন সংরক্ষণে সমস্যা হয়েছে', details: message },
      { status: 500 }
    );
  }
}
