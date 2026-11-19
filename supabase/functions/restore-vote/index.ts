/**
 * Halchal (হালচাল) - `restore-vote` Edge Function
 * Architecture: One-tap restoration feedback ("ঠিক হয়ে গেছে / এখনো নেই").
 *
 * Security:
 * 1. Authenticated via short-lived signed action token (HMAC-SHA256, 15 min expiry).
 * 2. Enforced SINGLE-USE via atomic Redis token consumption.
 * 3. Does not require user to be currently logged into the web app.
 * 4. Responds to both GET (browser/push notification click) and POST (JSON).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { AppError, Errors, mapDatabaseError } from '../_shared/errors.ts';
import { verifyAndConsumeActionToken } from '../_shared/action-token.ts';
import { computeDeviceIdHash } from '../_shared/device.ts';
import { getRedisClient, IRedisClient } from '../_shared/redis.ts';
import { HalchalRateLimiter } from '../_shared/rate-limit.ts';
import { extractClientIp } from '../submit-report/index.ts';
import { ReportState } from '../_shared/types.ts';

export interface RestoreVoteDependencies {
  supabaseClient?: SupabaseClient;
  redisClient?: IRedisClient;
  rateLimiter?: HalchalRateLimiter;
  actionSecret?: string;
  deviceSecret?: string;
}

function renderHtmlResponse(success: boolean, message: string): Response {
  const html = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>হালচাল - হালনাগাদ</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 1rem;
    }
    .card {
      background: white;
      border-radius: 1rem;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      padding: 2rem;
      max-width: 28rem;
      width: 100%;
      text-align: center;
      border: 1px solid #e2e8f0;
    }
    .icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }
    h1 {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }
    p {
      color: #475569;
      font-size: 1.1rem;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? '✅' : '⚠️'}</div>
    <h1>${success ? 'ধন্যবাদ!' : 'অনুরোধ ব্যর্থ হয়েছে'}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: success ? 200 : 400,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}

export async function handleRestoreVote(
  req: Request,
  deps: RestoreVoteDependencies = {}
): Promise<Response> {
  // CORS Preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const isGet = req.method === 'GET';
  const isPost = req.method === 'POST';

  if (!isGet && !isPost) {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    let token = '';
    let vote = '';

    if (isGet) {
      const url = new URL(req.url);
      token = url.searchParams.get('token') || '';
      vote = url.searchParams.get('vote') || '';
    } else {
      const body = (await req.json().catch(() => ({}))) as Record<string, string>;
      token = body.token || '';
      vote = body.vote || '';
    }

    if (!token) {
      throw Errors.INVALID_ACTION_TOKEN('ভোটের টোকেন পাওয়া যায়নি');
    }

    if (vote !== 'ok' && vote !== 'out') {
      throw new AppError(400, 'INVALID_VOTE', 'ভোটের মান শুধুমাত্র ok (স্বাভাবিক) অথবা out (বন্ধ) হতে পারে');
    }

    const clientIp = extractClientIp(req);
    const redis = deps.redisClient || getRedisClient();
    const rateLimiter = deps.rateLimiter || new HalchalRateLimiter(redis);

    // 1. Coarse IP burst limit
    await rateLimiter.checkIpBurst(clientIp);

    // 2. Verify signature, 15 min expiry, and single-use consumption in Redis
    const payload = await verifyAndConsumeActionToken(token, redis, deps.actionSecret);

    // 3. Compute device_id_hash
    const deviceIdHash = await computeDeviceIdHash(payload.dev, deps.deviceSecret);

    // 4. Submit report to database RPC via service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = deps.supabaseClient || createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: updatedStatus, error: rpcError } = await supabase.rpc('submit_report', {
      p_user: payload.sub,
      p_device_hash: deviceIdHash,
      p_h3: payload.h3,
      p_category: payload.cat,
      p_state: vote as ReportState,
      p_price: null,
      p_client_ts: new Date().toISOString(),
    });

    if (rpcError) {
      throw mapDatabaseError(rpcError);
    }

    // 5. Invalidate Redis zone status cache
    await rateLimiter.invalidateZoneStatus(payload.h3);

    const successMessage =
      vote === 'ok'
        ? 'বিদ্যুৎ ও সেবা স্বাভাবিক হওয়ার তথ্য সফলভাবে গ্রহণ করা হয়েছে।'
        : 'সংযোগ এখনো বিচ্ছিন্ন থাকার তথ্য সফলভাবে গ্রহণ করা হয়েছে।';

    if (isGet) {
      return renderHtmlResponse(true, successMessage);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: successMessage,
        vote,
        updated_category: updatedStatus,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );
  } catch (err: unknown) {
    if (err instanceof AppError) {
      if (isGet) {
        return renderHtmlResponse(false, err.bengaliMessage);
      }
      return err.toResponse();
    }

    const message = err instanceof Error ? err.message : String(err);
    if (isGet) {
      return renderHtmlResponse(false, 'সার্ভারে সমস্যা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।');
    }
    return Errors.INTERNAL_ERROR(message).toResponse();
  }
}

// Default Deno serve entry point
if (import.meta.main) {
  Deno.serve(async (req) => {
    return await handleRestoreVote(req);
  });
}
