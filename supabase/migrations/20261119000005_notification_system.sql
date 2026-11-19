-- =============================================================================
-- Migration: 20261119000005_notification_system.sql
-- Description: Notification trigger on status_events, push subscription settings,
--              and pg_net webhook integration for notify-zone Edge Function.
-- Architecture: ADR-0003, ADR-0007, ADR-0008, CLAUDE.md
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Enhance push_subscriptions for Notification Settings & Quiet Hours
-- -----------------------------------------------------------------------------
alter table public.push_subscriptions
  add column if not exists categories text[] not null default array['electricity', 'gas', 'water', 'lpg'],
  add column if not exists allow_night_alerts boolean not null default false,
  add column if not exists quiet_hours_start text not null default '23:00',
  add column if not exists quiet_hours_end text not null default '06:00',
  add column if not exists device_id text;

-- Index for category filtering on push_subscriptions
create index if not exists idx_push_subscriptions_categories
  on public.push_subscriptions using gin(categories);

create index if not exists idx_push_subscriptions_device_id
  on public.push_subscriptions(device_id) where device_id is not null;

-- -----------------------------------------------------------------------------
-- 2. Secure RPC to Upsert Push Subscriptions
-- -----------------------------------------------------------------------------
create or replace function public.upsert_push_subscription(
  p_endpoint text,
  p_kind text,
  p_keys jsonb,
  p_h3_subscriptions text[],
  p_categories text[],
  p_allow_night_alerts boolean,
  p_device_id text default null,
  p_user_id uuid default null
)
returns public.push_subscriptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sub public.push_subscriptions;
begin
  insert into public.push_subscriptions (
    token_or_endpoint,
    kind,
    keys,
    h3_subscriptions,
    categories,
    allow_night_alerts,
    device_id,
    user_id,
    updated_at
  ) values (
    p_endpoint,
    p_kind,
    p_keys,
    coalesce(p_h3_subscriptions, '{}'),
    coalesce(p_categories, array['electricity', 'gas', 'water', 'lpg']),
    coalesce(p_allow_night_alerts, false),
    p_device_id,
    p_user_id,
    pg_catalog.now()
  )
  on conflict (token_or_endpoint) do update set
    h3_subscriptions = coalesce(excluded.h3_subscriptions, push_subscriptions.h3_subscriptions),
    categories = coalesce(excluded.categories, push_subscriptions.categories),
    allow_night_alerts = excluded.allow_night_alerts,
    device_id = coalesce(excluded.device_id, push_subscriptions.device_id),
    user_id = coalesce(excluded.user_id, push_subscriptions.user_id),
    keys = coalesce(excluded.keys, push_subscriptions.keys),
    updated_at = pg_catalog.now()
  returning * into v_sub;

  return v_sub;
end;
$$;

revoke all on function public.upsert_push_subscription(text, text, jsonb, text[], text[], boolean, text, uuid) from public, anon, authenticated;
grant execute on function public.upsert_push_subscription(text, text, jsonb, text[], text[], boolean, text, uuid) to service_role;

-- -----------------------------------------------------------------------------
-- 3. Postgres Trigger on status_events
-- Calls notify-zone Edge Function when:
-- - A category becomes 'out' (confirmed) or 'low' (confirmed)
-- - A category returns to 'ok' from 'out'/'low' (restored)
-- -----------------------------------------------------------------------------
create or replace function public.trg_status_event_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payload jsonb;
  v_url text;
  v_service_key text;
  v_is_eligible boolean := false;
begin
  -- 1. Determine eligibility
  -- (a) A category becomes 'out' or 'low'
  if NEW.to_state in ('out', 'low') and NEW.from_state <> NEW.to_state then
    v_is_eligible := true;
  -- (b) A category returns to 'ok' from 'out'/'low' (restored)
  elsif NEW.from_state in ('out', 'low') and NEW.to_state = 'ok' then
    v_is_eligible := true;
  end if;

  if not v_is_eligible then
    return NEW;
  end if;

  -- 2. Build JSON payload
  v_payload := jsonb_build_object(
    'event_id', NEW.id,
    'h3_index', NEW.h3_index,
    'category', NEW.category,
    'from_state', NEW.from_state,
    'to_state', NEW.to_state,
    'at', NEW.at
  );

  -- 3. Resolve target URL & service key
  v_url := coalesce(
    current_setting('app.settings.notify_zone_url', true),
    'http://127.0.0.1:54321/functions/v1/notify-zone'
  );
  v_service_key := coalesce(
    current_setting('app.settings.service_role_key', true),
    ''
  );

  -- 4. Invoke Edge Function via pg_net (net.http_post or extensions.http_post)
  begin
    -- Attempt call via net schema
    if exists (select 1 from pg_proc p join pg_namespace n on p.pronamespace = n.oid where p.proname = 'http_post' and n.nspname = 'net') then
      perform net.http_post(
        url := v_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_key
        ),
        body := v_payload,
        timeout_milliseconds := 5000
      );
    -- Attempt call via extensions schema
    elsif exists (select 1 from pg_proc p join pg_namespace n on p.pronamespace = n.oid where p.proname = 'http_post' and n.nspname = 'extensions') then
      perform extensions.http_post(
        url := v_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_key
        ),
        body := v_payload,
        timeout_milliseconds := 5000
      );
    end if;
  exception when others then
    -- Never roll back status_events insert due to notification dispatch network issue
    raise warning 'trg_status_event_notify network dispatch non-fatal warning: %', SQLERRM;
  end;

  return NEW;
end;
$$;

-- Drop existing trigger if any and attach to status_events
drop trigger if exists trg_status_events_notify on public.status_events;
create trigger trg_status_events_notify
  after insert on public.status_events
  for each row
  execute function public.trg_status_event_notify();
