-- =============================================================================
-- Migration: 20261119000003_create_rls_and_cron.sql
-- Description: Row Level Security (RLS) policies, role permissions, and pg_cron schedules.
-- Security: Principle of Least Privilege, zero client write access, service_role isolation.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Enable Row Level Security (RLS) on ALL Tables
-- -----------------------------------------------------------------------------
alter table public.zones enable row level security;
alter table public.profiles enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.reports enable row level security;
alter table public.zone_category_status enable row level security;
alter table public.status_events enable row level security;
alter table public.zone_hourly_stats enable row level security;
alter table public.official_prices enable row level security;

-- -----------------------------------------------------------------------------
-- 2. Define RLS Policies
-- -----------------------------------------------------------------------------

-- Rule: anon/authenticated are granted SELECT only on zones.
create policy "Allow public select on zones"
  on public.zones
  for select
  to anon, authenticated
  using (true);

-- Explicitly, NO policies are created for anon/authenticated on:
-- reports, profiles, push_subscriptions, status_events, zone_category_status,
-- zone_hourly_stats, official_prices.
-- In PostgreSQL, when RLS is enabled and no policy matches, all rows are rejected.

-- -----------------------------------------------------------------------------
-- 3. Grant and Revoke Table Privileges (Principle of Least Privilege)
-- -----------------------------------------------------------------------------

-- Revoke all default table privileges from public, anon, and authenticated
revoke all on table public.zones from public, anon, authenticated;
revoke all on table public.profiles from public, anon, authenticated;
revoke all on table public.push_subscriptions from public, anon, authenticated;
revoke all on table public.reports from public, anon, authenticated;
revoke all on table public.zone_category_status from public, anon, authenticated;
revoke all on table public.status_events from public, anon, authenticated;
revoke all on table public.zone_hourly_stats from public, anon, authenticated;
revoke all on table public.official_prices from public, anon, authenticated;

-- Grant select ONLY on zones to anon and authenticated
grant select on table public.zones to anon, authenticated;

-- Grant full operational privileges to service_role (used by Edge Functions and cron)
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all routines in schema public to service_role;

-- -----------------------------------------------------------------------------
-- 4. Function Execution Privileges
-- -----------------------------------------------------------------------------

-- Revoke execute on all functions from public, anon, and authenticated
revoke execute on function public.recompute_zone_category(text, public.utility_category) from public, anon, authenticated;
revoke execute on function public.submit_report(uuid, text, text, public.utility_category, public.report_state, numeric, timestamptz) from public, anon, authenticated;
revoke execute on function public.settle_trust_scores() from public, anon, authenticated;
revoke execute on function public.expire_and_rollup() from public, anon, authenticated;
revoke execute on function public.get_zone_status(text) from public, anon, authenticated;

-- Grant internal functions exclusively to service_role
grant execute on function public.recompute_zone_category(text, public.utility_category) to service_role;
grant execute on function public.submit_report(uuid, text, text, public.utility_category, public.report_state, numeric, timestamptz) to service_role;
grant execute on function public.settle_trust_scores() to service_role;
grant execute on function public.expire_and_rollup() to service_role;

-- get_zone_status is the ONLY function anon/authenticated may execute
grant execute on function public.get_zone_status(text) to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 5. Scheduled Background Jobs (pg_cron)
-- -----------------------------------------------------------------------------
-- settle_trust_scores: Every 10 minutes
-- expire_and_rollup: Every 5 minutes
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Clean up existing schedules if re-running
    perform cron.unschedule('halchal-settle-trust-scores')
      where exists (select 1 from cron.job where jobname = 'halchal-settle-trust-scores');

    perform cron.unschedule('halchal-expire-and-rollup')
      where exists (select 1 from cron.job where jobname = 'halchal-expire-and-rollup');

    -- Schedule settle_trust_scores every 10 minutes
    perform cron.schedule(
      'halchal-settle-trust-scores',
      '*/10 * * * *',
      'select public.settle_trust_scores();'
    );

    -- Schedule expire_and_rollup every 5 minutes
    perform cron.schedule(
      'halchal-expire-and-rollup',
      '*/5 * * * *',
      'select public.expire_and_rollup();'
    );
  end if;
end;
$$;
