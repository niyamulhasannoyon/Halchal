-- =============================================================================
-- Migration: 20261119000007_user_account_deletion_and_admin_metrics.sql
-- Description: Right to erasure (account & data deletion) RPC, security grants,
--              and minimal admin metrics RPC for operational observability.
-- Architecture: ADR-0005 (Privacy), ADR-0007 (Security Definer), CLAUDE.md
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Right to Erasure: Permanent Account & Data Deletion
-- -----------------------------------------------------------------------------
create or replace function public.delete_user_account(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reports_deleted integer := 0;
  v_subscriptions_deleted integer := 0;
  v_profile_deleted boolean := false;
begin
  if p_user_id is null then
    raise exception 'USER_ID_REQUIRED' using errcode = 'P0001';
  end if;

  -- 1. Delete all raw reports submitted by this user
  delete from public.reports
  where user_id = p_user_id;
  get diagnostics v_reports_deleted = row_count;

  -- 2. Delete all push notification subscriptions tied to this user
  delete from public.push_subscriptions
  where user_id = p_user_id;
  get diagnostics v_subscriptions_deleted = row_count;

  -- 3. Delete user profile record
  delete from public.profiles
  where id = p_user_id;
  if found then
    v_profile_deleted := true;
  end if;

  -- 4. Delete from auth.users if accessible
  begin
    delete from auth.users where id = p_user_id;
  exception when others then
    -- Non-fatal: if running without direct auth.users table write access,
    -- caller will use Supabase Auth Admin API (supabase.auth.admin.deleteUser)
    null;
  end;

  return jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'reports_deleted', v_reports_deleted,
    'subscriptions_deleted', v_subscriptions_deleted,
    'profile_deleted', v_profile_deleted,
    'deleted_at', pg_catalog.now()
  );
end;
$$;

comment on function public.delete_user_account(uuid) is
  'Permanently deletes a user profile, all raw reports, and push subscriptions in compliance with data privacy laws and Right to Erasure.';

-- Grant execute exclusively to service_role (called by backend deletion endpoint after JWT verification)
revoke execute on function public.delete_user_account(uuid) from public, anon, authenticated;
grant execute on function public.delete_user_account(uuid) to service_role;

-- -----------------------------------------------------------------------------
-- 2. SRE & Observability: Admin Metrics RPC
-- -----------------------------------------------------------------------------
create or replace function public.get_admin_metrics()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := pg_catalog.now();
  v_reports_1m integer;
  v_reports_5m integer;
  v_reports_1h integer;
  v_zones_state jsonb;
  v_unverified_count integer;
  v_total_zones integer;
  v_total_subscribers integer;
  v_recent_events_24h integer;
begin
  -- 1. Reports rate
  select count(*) into v_reports_1m
  from public.reports
  where received_at >= v_now - interval '1 minute';

  select count(*) into v_reports_5m
  from public.reports
  where received_at >= v_now - interval '5 minutes';

  select count(*) into v_reports_1h
  from public.reports
  where received_at >= v_now - interval '1 hour';

  -- 2. Zones by state
  select coalesce(
    jsonb_object_agg(state, state_count),
    '{}'::jsonb
  ) into v_zones_state
  from (
    select state::text, count(*) as state_count
    from public.zone_category_status
    group by state
  ) s;

  -- 3. Unverified zone count
  select count(*) into v_unverified_count
  from public.zone_category_status
  where state = 'unverified'::public.zone_state;

  -- 4. Total zones
  select count(*) into v_total_zones
  from public.zones;

  -- 5. Total active push subscriptions
  select count(*) into v_total_subscribers
  from public.push_subscriptions;

  -- 6. Status transition events in last 24h
  select count(*) into v_recent_events_24h
  from public.status_events
  where at >= v_now - interval '24 hours';

  return jsonb_build_object(
    'timestamp', v_now,
    'reports', jsonb_build_object(
      'last_1_minute', v_reports_1m,
      'last_5_minutes', v_reports_5m,
      'last_1_hour', v_reports_1h,
      'per_minute_avg', round(v_reports_5m / 5.0, 2)
    ),
    'zones_by_state', v_zones_state,
    'unverified_zones', v_unverified_count,
    'total_zones', v_total_zones,
    'push_subscribers', v_total_subscribers,
    'status_events_24h', v_recent_events_24h
  );
end;
$$;

comment on function public.get_admin_metrics() is
  'Aggregates high-level SRE operational metrics for Halchal admin dashboard with zero PII exposure.';

-- Grant execute exclusively to service_role
revoke execute on function public.get_admin_metrics() from public, anon, authenticated;
grant execute on function public.get_admin_metrics() to service_role;
