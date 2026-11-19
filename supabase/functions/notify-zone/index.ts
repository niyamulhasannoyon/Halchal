/**
 * Halchal (হালচাল) - `notify-zone` Edge Function
 * Architecture:
 * - Triggered via Postgres trigger on status_events (or Database Webhook)
 * - Web Push (VAPID) & FCM v1 (Service-Account OAuth for Flutter)
 * - Anti-spam: 30-min cooldown lock, <= 3 notifs/day, quiet hours (23:00-06:00 BDT)
 * - Restored notification targeting (only to users who received outage alert)
 * - 30-min interactive restoration confirmation with signed action tokens
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { AppError, Errors } from '../_shared/errors.ts';
import { getRedisClient, IRedisClient } from '../_shared/redis.ts';
import {
  UtilityCategory,
  ZoneState,
  PushSubscriptionRecord,
  NotificationMessagePayload,
} from '../_shared/types.ts';
import { createActionToken } from '../_shared/action-token.ts';
import {
  checkAndAcquireCooldownLock,
  checkAndIncrementDailyCap,
  canDeliverDuringQuietHours,
  recordOutageRecipients,
  getOutageRecipients,
  clearOutageRecipients,
} from './anti-spam.ts';
import {
  buildStatusNotification,
  buildInteractiveConfirmationNotification,
} from './templates.ts';
import {
  IDeliveryProvider,
  WebPushProvider,
  FcmV1Provider,
  dispatchNotificationBatch,
} from './delivery.ts';

const NotifyEventSchema = z.object({
  event_id: z.string().optional(),
  h3_index: z.string().min(10),
  category: z.enum(['electricity', 'gas', 'water', 'lpg']),
  from_state: z.enum(['ok', 'low', 'out', 'unverified', 'unknown']),
  to_state: z.enum(['ok', 'low', 'out', 'unverified', 'unknown']),
  at: z.string().optional(),
  interactive: z.boolean().optional(),
});

export interface NotifyZoneDependencies {
  supabaseClient?: SupabaseClient;
  redisClient?: IRedisClient;
  webPushProvider?: IDeliveryProvider;
  fcmV1Provider?: IDeliveryProvider;
  actionSecret?: string;
  mockCurrentTime?: Date;
}

export async function handleNotifyZone(
  req: Request,
  deps: NotifyZoneDependencies = {}
): Promise<Response> {
  // CORS Preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const rawBody = await req.json().catch(() => ({}));
    const parseResult = NotifyEventSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          error: 'অবৈধ নোটিফিকেশন পে-লোড',
          details: parseResult.error.flatten(),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const {
      event_id,
      h3_index,
      category,
      from_state,
      to_state,
      interactive = false,
    } = parseResult.data;

    const redis = deps.redisClient || getRedisClient();
    const now = deps.mockCurrentTime || new Date();

    // 1. Determine eligibility
    const isOutageOrLow =
      (to_state === 'out' || to_state === 'low') && from_state !== to_state;
    const isRestored =
      (from_state === 'out' || from_state === 'low') && to_state === 'ok';

    if (!interactive && !isOutageOrLow && !isRestored) {
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: 'STATE_TRANSITION_NOT_NOTIFIABLE',
          from_state,
          to_state,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 2. Anti-Spam: 30-Minute Cooldown Lock
    // notif:lock:{h3}:{category}:{state}
    const lockStateKey = interactive ? 'interactive' : to_state;
    const lockAcquired = await checkAndAcquireCooldownLock(
      redis,
      h3_index,
      category,
      lockStateKey as ZoneState
    );

    if (!lockAcquired) {
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: 'COOLDOWN_ACTIVE_30M',
          h3_index,
          category,
          state: lockStateKey,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Database & Provider Client Setup
    const supabase =
      deps.supabaseClient ||
      createClient(
        Deno.env.get('SUPABASE_URL') || '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
        { auth: { persistSession: false, autoRefreshToken: false } }
      );

    const webPushProvider = deps.webPushProvider || new WebPushProvider();
    const fcmV1Provider = deps.fcmV1Provider || new FcmV1Provider();

    // 4. Query Subscriptions matching the H3 zone and category
    // push_subscriptions.h3_subscriptions @> ARRAY[h3_index]
    const { data: rawSubscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .contains('h3_subscriptions', [h3_index]);

    if (subError) {
      throw Errors.INTERNAL_ERROR(`Database error: ${subError.message}`);
    }

    const allSubscriptions = (rawSubscriptions || []) as unknown as PushSubscriptionRecord[];

    // Filter by subscribed utility category
    let eligibleSubscriptions = allSubscriptions.filter(
      (sub) => !sub.categories || sub.categories.includes(category)
    );

    // 5. Anti-Spam: Restored notification targeting rule
    // A "restored" notification goes ONLY to users who were notified of the outage.
    if (isRestored) {
      const outageRecipientIds = await getOutageRecipients(
        redis,
        h3_index,
        category
      );

      eligibleSubscriptions = eligibleSubscriptions.filter((sub) => {
        const identifier = sub.user_id || sub.device_id || sub.id;
        return outageRecipientIds.has(identifier) || outageRecipientIds.has(sub.id);
      });

      // If no one was notified of the outage, skip sending restored notification
      if (eligibleSubscriptions.length === 0) {
        return new Response(
          JSON.stringify({
            success: true,
            skipped: true,
            reason: 'NO_PREVIOUS_OUTAGE_RECIPIENTS_FOUND',
            h3_index,
            category,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // 6. Anti-Spam: Quiet Hours (23:00 - 06:00 BDT)
    // Only send if allow_night_alerts = true or currently outside quiet hours
    eligibleSubscriptions = eligibleSubscriptions.filter((sub) =>
      canDeliverDuringQuietHours(Boolean(sub.allow_night_alerts), now)
    );

    // 7. Anti-Spam: Daily Cap (Max 3 notifications/day per user/subscription)
    const deliverableSubscriptions: PushSubscriptionRecord[] = [];
    for (const sub of eligibleSubscriptions) {
      const recipientKey = sub.user_id || sub.device_id || sub.id;
      const { allowed } = await checkAndIncrementDailyCap(redis, recipientKey, now, 3);
      if (allowed) {
        deliverableSubscriptions.push(sub);
      }
    }

    if (deliverableSubscriptions.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          delivered: 0,
          reason: 'ALL_RECIPIENTS_FILTERED_BY_QUIET_HOURS_OR_DAILY_CAP',
          h3_index,
          category,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 8. Lookup localized Bengali zone name (if available)
    let areaNameBn: string | undefined;
    const { data: zoneData } = await supabase
      .from('zones')
      .select('name_bn')
      .eq('h3_index', h3_index)
      .maybeSingle();

    if (zoneData?.name_bn) {
      areaNameBn = zoneData.name_bn;
    }

    // 9. Dispatch Delivery (Separate per-user interactive token vs standard status alert)
    const actionSecret =
      deps.actionSecret ||
      Deno.env.get('ACTION_TOKEN_SECRET') ||
      Deno.env.get('SERVER_SECRET') ||
      'halchal-action-secret-replace-in-prod';

    let totalDelivered = 0;
    let totalFailed = 0;
    let expiredRemoved = 0;
    const notifiedRecipientIds: string[] = [];

    if (interactive) {
      // Interactive confirmation: generate a unique signed single-use action token per recipient
      for (const sub of deliverableSubscriptions) {
        const actionToken = await createActionToken(
          {
            userId: sub.user_id || '00000000-0000-0000-0000-000000000000',
            deviceId: sub.device_id || sub.id,
            h3Index: h3_index,
            category,
          },
          actionSecret,
          900 // 15 min expiration
        );

        const payload = buildInteractiveConfirmationNotification({
          areaNameBn,
          category,
          h3Index: h3_index,
          actionToken,
        });

        const dispatchResult = await dispatchNotificationBatch({
          subscriptions: [sub],
          payload,
          webPushProvider,
          fcmV1Provider,
          supabaseClient: supabase,
        });

        totalDelivered += dispatchResult.totalSent;
        totalFailed += dispatchResult.totalFailed;
        expiredRemoved += dispatchResult.expiredCount;

        if (dispatchResult.totalSent > 0) {
          notifiedRecipientIds.push(sub.user_id || sub.device_id || sub.id);
        }
      }
    } else {
      // Standard status change alert (out, low, ok)
      const payload: NotificationMessagePayload = buildStatusNotification({
        areaNameBn,
        category,
        state: to_state,
        h3Index: h3_index,
      });

      const dispatchResult = await dispatchNotificationBatch({
        subscriptions: deliverableSubscriptions,
        payload,
        webPushProvider,
        fcmV1Provider,
        supabaseClient: supabase,
      });

      totalDelivered = dispatchResult.totalSent;
      totalFailed = dispatchResult.totalFailed;
      expiredRemoved = dispatchResult.expiredCount;

      for (const res of dispatchResult.results) {
        if (res.success) {
          const matchSub = deliverableSubscriptions.find(
            (s) => s.id === res.subscriptionId
          );
          if (matchSub) {
            notifiedRecipientIds.push(
              matchSub.user_id || matchSub.device_id || matchSub.id
            );
          }
        }
      }
    }

    // 10. Outage recipient tracking
    if (isOutageOrLow && notifiedRecipientIds.length > 0) {
      // Record who received the outage alert so we can deliver "restored" only to them later
      await recordOutageRecipients(
        redis,
        h3_index,
        category,
        notifiedRecipientIds
      );
    } else if (isRestored) {
      // Clear recipient set after restored alerts are sent
      await clearOutageRecipients(redis, h3_index, category);
    }

    return new Response(
      JSON.stringify({
        success: true,
        event_id,
        h3_index,
        category,
        state: to_state,
        total_targets: deliverableSubscriptions.length,
        delivered: totalDelivered,
        failed: totalFailed,
        expired_removed: expiredRemoved,
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
    return Errors.INTERNAL_ERROR(message).toResponse();
  }
}

// Default Deno serve entry point
if (import.meta.main) {
  Deno.serve(async (req) => {
    return await handleNotifyZone(req);
  });
}
