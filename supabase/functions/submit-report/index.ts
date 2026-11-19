/**
 * Halchal (হালচাল) - `submit-report` Edge Function
 * Architecture: ADR-0001 (H3 Res 8), ADR-0002 (Write Gateway),
 * ADR-0003 (Enums), ADR-0005 (Privacy), ADR-0007 (Security Definer & Anti-Gaming)
 *
 * Processing Order:
 * 1. Verify JWT. Reject missing/invalid.
 * 2. Verify attestation (Cloudflare Turnstile / Android Play Integrity).
 * 3. Validate input strictly (Zod, accuracy_m <= 200, Bangladesh bounds).
 * 4. Compute H3 Res 8 index server-side via h3-js. DISCARD lat/lng immediately.
 * 5. Home-zone gate: user may report only for home cell or ring-1 neighbors. 7-day change lock.
 * 6. device_id_hash = HMAC-SHA256(server secret, device_id). Zero browser fingerprinting.
 * 7. Upstash rate limits: user 15m, device 15m, coarse IP burst 120/min (CGNAT-friendly).
 * 8. Call RPC `submit_report` via service role; map Postgres errors to Bengali HTTP responses.
 * 9. Invalidate Redis key `zone:status:{h3}`; return updated zone status.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { AppError, Errors, mapDatabaseError } from '../_shared/errors.ts';
import { IAuthVerifier, getAuthVerifier } from '../_shared/auth.ts';
import { IAttestationVerifier, getAttestationVerifier } from '../_shared/attestation.ts';
import { validateSubmitReportInput } from '../_shared/validation.ts';
import { scrubCoordinatesAndIndex } from '../_shared/h3.ts';
import { enforceHomeZoneGate, IProfileStore, SupabaseProfileStore } from '../_shared/home-zone.ts';
import { computeDeviceIdHash } from '../_shared/device.ts';
import { HalchalRateLimiter } from '../_shared/rate-limit.ts';
import { getRedisClient, IRedisClient } from '../_shared/redis.ts';
import { syncUserTier } from '../_shared/account-linking.ts';

export interface SubmitReportDependencies {
  authVerifier?: IAuthVerifier;
  attestationVerifier?: IAttestationVerifier;
  supabaseClient?: SupabaseClient;
  profileStore?: IProfileStore;
  redisClient?: IRedisClient;
  rateLimiter?: HalchalRateLimiter;
  deviceSecret?: string;
  now?: Date;
}

export function extractClientIp(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

export async function handleReportSubmission(
  req: Request,
  deps: SubmitReportDependencies = {}
): Promise<Response> {
  // Handle CORS Preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const clientIp = extractClientIp(req);
    const redis = deps.redisClient || getRedisClient();
    const rateLimiter = deps.rateLimiter || new HalchalRateLimiter(redis);

    // -------------------------------------------------------------------------
    // Step 7 (Pre-Check): Coarse IP Burst Limit (120 req/min for CGNAT safety)
    // -------------------------------------------------------------------------
    await rateLimiter.checkIpBurst(clientIp);

    // -------------------------------------------------------------------------
    // Step 1: Verify JWT. Reject missing/invalid.
    // -------------------------------------------------------------------------
    const authHeader = req.headers.get('Authorization');
    const authVerifier = deps.authVerifier || getAuthVerifier();
    const verifiedAuth = await authVerifier.verifyToken(authHeader);

    // -------------------------------------------------------------------------
    // Parse Request Body
    // -------------------------------------------------------------------------
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      throw new AppError(400, 'INVALID_JSON', 'অনুরোধের তথ্য সঠিক JSON ফরম্যাটে নেই');
    }

    // -------------------------------------------------------------------------
    // Step 2: Verify Attestation (Turnstile / Play Integrity)
    // -------------------------------------------------------------------------
    const attestationVerifier = deps.attestationVerifier || getAttestationVerifier();
    const attestationPayload = (rawBody as Record<string, unknown>)?.attestation;
    const attestationResult = await attestationVerifier.verify(attestationPayload, clientIp);

    if (!attestationResult.valid) {
      throw Errors.ATTESTATION_FAILED(attestationResult.error);
    }

    // -------------------------------------------------------------------------
    // Step 3: Validate Input Strictly (Zod). Reject accuracy_m > 200.
    // -------------------------------------------------------------------------
    const validatedInput = validateSubmitReportInput(rawBody);

    // -------------------------------------------------------------------------
    // Step 4: Compute H3 Res 8 index server-side.
    // STRICT PRIVACY: DISCARD lat/lng (never log or store them).
    // -------------------------------------------------------------------------
    const { h3_index, sanitized } = scrubCoordinatesAndIndex(validatedInput);

    // -------------------------------------------------------------------------
    // Step 5: Home-Zone Gate
    // User may report only for home cell or ring-1 neighbors. 7-day change lock.
    // -------------------------------------------------------------------------
    const supabase = deps.supabaseClient || createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const profileStore = deps.profileStore || new SupabaseProfileStore(supabase);
    await enforceHomeZoneGate(
      profileStore,
      verifiedAuth.userId,
      h3_index,
      validatedInput.update_home,
      deps.now || new Date()
    );

    // -------------------------------------------------------------------------
    // Step 6: device_id_hash = HMAC-SHA256(server secret, device_id)
    // -------------------------------------------------------------------------
    const deviceIdHash = await computeDeviceIdHash(validatedInput.device_id, deps.deviceSecret);

    // -------------------------------------------------------------------------
    // Step 7: Rate limits (User 15m, Device 15m)
    // -------------------------------------------------------------------------
    await rateLimiter.checkUserAndDeviceLimits(
      verifiedAuth.userId,
      deviceIdHash,
      validatedInput.category
    );

    // Optionally sync user trust tier if user has upgraded account
    if (!verifiedAuth.isAnonymous && verifiedAuth.user) {
      try {
        await syncUserTier(supabase, verifiedAuth.userId, verifiedAuth.user);
      } catch (err) {
        console.warn('Non-fatal tier sync warning:', err);
      }
    }

    // -------------------------------------------------------------------------
    // Step 8: Call RPC submit_report via Service Role
    // -------------------------------------------------------------------------
    const { data: updatedCategoryStatus, error: rpcError } = await supabase.rpc('submit_report', {
      p_user: verifiedAuth.userId,
      p_device_hash: deviceIdHash,
      p_h3: h3_index,
      p_category: sanitized.category,
      p_state: sanitized.state,
      p_price: sanitized.price_bdt,
      p_client_ts: sanitized.client_ts,
    });

    if (rpcError) {
      throw mapDatabaseError(rpcError);
    }

    // Record 15-minute rate limit locks in Redis
    await rateLimiter.recordSuccessfulReport(
      verifiedAuth.userId,
      deviceIdHash,
      sanitized.category
    );

    // -------------------------------------------------------------------------
    // Step 9: Invalidate Redis key zone:status:{h3} & return updated zone status
    // -------------------------------------------------------------------------
    await rateLimiter.invalidateZoneStatus(h3_index);

    // Fetch refreshed 4-category status for the zone
    const { data: fullZoneStatus, error: zoneError } = await supabase.rpc('get_zone_status', {
      p_h3: h3_index,
    });

    if (zoneError) {
      console.warn('Non-fatal error fetching full zone status:', zoneError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'রিপোর্ট সফলভাবে গ্রহণ করা হয়েছে।',
        h3_index,
        category: sanitized.category,
        state: sanitized.state,
        updated_category: updatedCategoryStatus,
        zone_status: fullZoneStatus || null,
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
      return err.toResponse();
    }

    const message = err instanceof Error ? err.message : String(err);
    console.error('Unhandled submit-report exception:', err);
    return Errors.INTERNAL_ERROR(message).toResponse();
  }
}

// Default Deno serve entry point
if (import.meta.main) {
  Deno.serve(async (req) => {
    return await handleReportSubmission(req);
  });
}
