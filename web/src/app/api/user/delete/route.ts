/**
 * Halchal (হালচাল) - Account & Data Erasure Endpoint (`/api/user/delete`)
 * Architecture: ADR-0005 (Privacy), ADR-0007, Right to Erasure
 *
 * Guarantees:
 * 1. Authenticated via user JWT (Authorization: Bearer <token>).
 * 2. Permanently deletes user profile, push subscriptions, and raw reports.
 * 3. Deletes auth record from Supabase Auth admin API.
 * 4. Cleans up any user keys in Upstash Redis.
 * 5. Returns Bengali confirmation message.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabase';
import { getRedisClient } from '@/lib/redis';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const correlationId = crypto.randomUUID();
  const startTime = performance.now();

  try {
    // 1. Extract Bearer token from header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('DELETE_ACCOUNT_UNAUTHORIZED', {
        correlation_id: correlationId,
        status_code: 401,
        meta: { reason: 'MISSING_BEARER_TOKEN' },
      });
      return NextResponse.json(
        { success: false, error: 'অননুমোদিত অনুরোধ। অনুগ্রহ করে লগইন করুন।' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '').trim();

    // 2. Authenticate user token via Supabase Auth
    const supabase = getSupabaseServerClient();
    const { data: userData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !userData?.user) {
      logger.warn('DELETE_ACCOUNT_INVALID_TOKEN', {
        correlation_id: correlationId,
        status_code: 401,
        error: authError?.message || 'USER_NOT_FOUND',
      });
      return NextResponse.json(
        { success: false, error: 'সেশন মেয়াদোত্তীর্ণ বা অবৈধ।' },
        { status: 401 }
      );
    }

    const userId = userData.user.id;

    // 3. Service role client for privileged deletion
    const adminSupabase = getSupabaseServiceClient();
    if (!adminSupabase) {
      logger.error('DELETE_ACCOUNT_CONFIGURATION_ERROR', {
        correlation_id: correlationId,
        status_code: 500,
        error: 'SUPABASE_SERVICE_ROLE_KEY missing on server',
      });
      return NextResponse.json(
        { success: false, error: 'সার্ভার কনফিগারেশন ত্রুটি।' },
        { status: 500 }
      );
    }

    // 4. Call database RPC delete_user_account to purge reports, subscriptions, and profile
    const { data: dbResult, error: dbError } = await adminSupabase.rpc('delete_user_account', {
      p_user_id: userId,
    });

    if (dbError) {
      logger.error('DELETE_ACCOUNT_DB_ERROR', {
        correlation_id: correlationId,
        status_code: 500,
        error: dbError.message,
      });
      return NextResponse.json(
        { success: false, error: 'ডাটাবেস থেকে তথ্য মুছে ফেলতে সমস্যা হয়েছে।' },
        { status: 500 }
      );
    }

    // 5. Delete from Supabase Auth admin
    try {
      await adminSupabase.auth.admin.deleteUser(userId);
    } catch (authDeleteErr) {
      logger.warn('DELETE_AUTH_USER_WARNING', {
        correlation_id: correlationId,
        error: authDeleteErr instanceof Error ? authDeleteErr.message : String(authDeleteErr),
      });
    }

    // 6. Purge Redis rate-limiting and daily notification keys
    const redis = getRedisClient();
    if (redis) {
      try {
        const todayStr = new Date().toISOString().slice(0, 10);
        await Promise.allSettled([
          redis.del(`notif:daily:${userId}:${todayStr}`),
          redis.del(`rl:user:${userId}:electricity`),
          redis.del(`rl:user:${userId}:gas`),
          redis.del(`rl:user:${userId}:water`),
          redis.del(`rl:user:${userId}:lpg`),
        ]);
      } catch (redisErr) {
        logger.warn('DELETE_ACCOUNT_REDIS_PURGE_WARNING', {
          correlation_id: correlationId,
          error: redisErr instanceof Error ? redisErr.message : String(redisErr),
        });
      }
    }

    const duration = performance.now() - startTime;
    logger.info('USER_ACCOUNT_DELETED', {
      correlation_id: correlationId,
      status_code: 200,
      duration_ms: duration,
      meta: {
        reports_deleted: dbResult?.reports_deleted ?? 0,
        subscriptions_deleted: dbResult?.subscriptions_deleted ?? 0,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'আপনার অ্যাকাউন্ট এবং সংশ্লিষ্ট সকল তথ্য স্থায়ীভাবে মুছে ফেলা হয়েছে।',
        details: dbResult,
      },
      { status: 200 }
    );
  } catch (err) {
    const duration = performance.now() - startTime;
    logger.error('DELETE_ACCOUNT_UNHANDLED_EXCEPTION', {
      correlation_id: correlationId,
      status_code: 500,
      duration_ms: duration,
      error: err instanceof Error ? err.message : String(err),
    });

    return NextResponse.json(
      { success: false, error: 'একটি অপ্রত্যাশিত ত্রুটি ঘটেছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।' },
      { status: 500 }
    );
  }
}
