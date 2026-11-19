-- =============================================================================
-- Migration: 20261119000001_create_extensions_enums_and_tables.sql
-- Description: Core schema for Halchal (হালচাল) utility status platform.
-- Architecture: ADR-0001 (H3 Res 8), ADR-0003 (Enums & States), ADR-0005 (Privacy)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Environment Stubs & Extensions
-- -----------------------------------------------------------------------------
-- PostGIS is intentionally NOT enabled because coordinates are never stored in the database (ADR-0001, ADR-0005).
-- We use PostgreSQL 13+ native gen_random_uuid() instead of uuid-ossp.
-- pg_cron is used for scheduled background maintenance (trust score settlement, rollup, 72h TTL).
-- pg_net is used for asynchronous network operations (e.g. edge webhook dispatch).

create schema if not exists extensions;

-- Enable pg_net and pg_cron only (PostGIS is strictly omitted per ADR-0001 / ADR-0005)
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists "pg_net" with schema "extensions";
  end if;
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists "pg_cron" with schema "extensions";
  end if;
end;
$$;

-- Ensure auth schema and required roles exist for local testing and CI portability
do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'auth') then
    create schema auth;
  end if;
  if not exists (select 1 from pg_tables where schemaname = 'auth' and tablename = 'users') then
    create table auth.users (
      id uuid primary key default gen_random_uuid(),
      email text,
      created_at timestamptz default pg_catalog.now()
    );
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Enumerated Types
-- -----------------------------------------------------------------------------

-- Utility category enum (extensible per ADR-0003; never redesign schema for new categories)
create type public.utility_category as enum (
  'electricity',
  'gas',
  'water',
  'lpg'
);

-- Report states submitted by citizens
create type public.report_state as enum (
  'ok',   -- স্বাভাবিক / সচল / আছে
  'low',  -- স্বল্প / চাপ কম / ভোল্টেজ কম / সমস্যা
  'out'   -- নেই / বন্ধ / লোডশেডিং
);

-- Zone consensus states displayed to public
-- Golden Rule: 'unknown' must NEVER be treated as 'ok' or rendered green. Absence of data is not evidence of service.
create type public.zone_state as enum (
  'ok',          -- Verified normal service (Green)
  'low',         -- Verified reduced service / low pressure (Amber)
  'out',         -- Verified total outage (Red)
  'unverified',  -- Reports exist but below consensus thresholds (Gray dashed)
  'unknown'      -- No active reports within validity window (Neutral gray)
);

-- Trust tiers based on authentication level
create type public.trust_tier as enum (
  'anonymous', -- Anonymous auth session (multiplier: 0.5)
  'google',    -- Verified Google account (multiplier: 1.0)
  'phone'      -- Verified Phone/SMS OTP account (multiplier: 1.5)
);

-- -----------------------------------------------------------------------------
-- 3. Tables Definition
-- -----------------------------------------------------------------------------

-- Table 1: zones
-- Spatial lookup table based on Uber H3 Resolution 8 cells (~0.74 km²).
-- Area names come strictly from this server-side lookup table, NEVER from the client.
create table public.zones (
  h3_index text primary key,
  area_name_bn text not null,
  ward text,
  city text not null default 'Dhaka',
  created_at timestamptz not null default pg_catalog.now(),
  constraint zones_h3_format check (h3_index ~* '^[0-9a-f]{15}$')
);

comment on table public.zones is 'Precomputed Uber H3 Res 8 geographic areas in Bangladesh. Area names are localized in Bengali.';

-- Table 2: profiles
-- User profile metadata tied 1:1 to Supabase Auth users.
-- Stores trust score (clamped between 0.1 and 3.0), tier, and optional home zone.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  trust_score numeric(4, 2) not null default 1.00 check (trust_score >= 0.10 and trust_score <= 3.00),
  tier public.trust_tier not null default 'anonymous',
  home_h3 text references public.zones(h3_index) on delete set null,
  home_h3_changed_at timestamptz,
  device_id_hash text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

comment on table public.profiles is 'Citizen trust reputation scores, tiers, and home zone preference. Trust is never updated inside submit_report.';

-- Table 3: push_subscriptions
-- Multi-device push notification endpoints per user (Web Push or FCM).
-- Decoupled from profiles to support multiple browsers/devices per user.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  kind text not null check (kind in ('webpush', 'fcm')),
  token_or_endpoint text not null,
  keys jsonb,
  h3_subscriptions text[] not null default '{}',
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint push_subscriptions_token_unique unique (token_or_endpoint)
);

comment on table public.push_subscriptions is 'Push notification subscriptions for WebPush / FCM with subscribed H3 zone arrays.';

-- Table 4: reports
-- Raw citizen utility reports.
-- Strict Privacy Rule (ADR-0005): ZERO location columns (no lat, lng, geometry, or addresses).
-- Ephemeral Storage Rule (ADR-0005): 72-Hour raw data TTL enforced via expire_and_rollup().
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  device_id_hash text,
  h3_index text not null references public.zones(h3_index) on delete cascade,
  category public.utility_category not null,
  state public.report_state not null,
  price_bdt numeric check (
    (category = 'lpg' and (price_bdt is null or (price_bdt >= 500 and price_bdt <= 6000)))
    or
    (category <> 'lpg' and price_bdt is null)
  ),
  weight numeric(4, 2) not null check (weight > 0 and weight <= 2.00),
  client_ts timestamptz not null,
  received_at timestamptz not null default pg_catalog.now(),
  expires_at timestamptz not null,
  settled_at timestamptz,
  constraint reports_identity_check check (user_id is not null or (device_id_hash is not null and btrim(device_id_hash) <> ''))
);

comment on table public.reports is 'Ephemeral raw crowd-sourced reports. Strictly contains NO GPS coordinates. Automatically purged after 72 hours.';

-- Table 5: zone_category_status
-- O(1) read table for real-time client queries.
-- Holds the materialized consensus state per (h3_index, category).
create table public.zone_category_status (
  h3_index text not null references public.zones(h3_index) on delete cascade,
  category public.utility_category not null,
  state public.zone_state not null default 'unknown',
  distinct_reporters integer not null default 0 check (distinct_reporters >= 0),
  weighted_score numeric(8, 2) not null default 0.00 check (weighted_score >= 0),
  state_since timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  primary key (h3_index, category)
);

comment on table public.zone_category_status is 'Materialized O(1) zone category consensus status read table.';

-- Table 6: status_events
-- Append-only ledger of verified zone state transitions.
-- Source for historical playback, timeline graphs, and push notification triggers.
create table public.status_events (
  id uuid primary key default gen_random_uuid(),
  h3_index text not null references public.zones(h3_index) on delete cascade,
  category public.utility_category not null,
  from_state public.zone_state not null,
  to_state public.zone_state not null,
  at timestamptz not null default pg_catalog.now()
);

comment on table public.status_events is 'Append-only ledger of zone state transitions for push notifications and historical auditing.';

-- Table 7: zone_hourly_stats
-- Pre-aggregated hourly metrics (duration in outage/low, distinct reporters).
-- Survives the 72-hour raw report purge to power 7-day community reliability insights.
create table public.zone_hourly_stats (
  h3_index text not null references public.zones(h3_index) on delete cascade,
  category public.utility_category not null,
  hour_bucket timestamptz not null,
  minutes_out integer not null default 0 check (minutes_out >= 0 and minutes_out <= 60),
  minutes_low integer not null default 0 check (minutes_low >= 0 and minutes_low <= 60),
  distinct_reporters integer not null default 0 check (distinct_reporters >= 0),
  primary key (h3_index, category, hour_bucket)
);

comment on table public.zone_hourly_stats is '7-day historical hourly rollups preserving privacy and surviving raw report deletion.';

-- Table 8: official_prices
-- Manually maintained regulatory price benchmarks (e.g., Bangladesh Energy Regulatory Commission LPG rates).
create table public.official_prices (
  id uuid primary key default gen_random_uuid(),
  item text not null,
  price_bdt numeric(10, 2) not null check (price_bdt > 0),
  effective_from date not null,
  source_url text,
  created_at timestamptz not null default pg_catalog.now()
);

comment on table public.official_prices is 'Official government/regulatory benchmark prices (e.g. BERC LPG rate).';

-- -----------------------------------------------------------------------------
-- 4. Automatic Zone Status Initialization Trigger
-- -----------------------------------------------------------------------------
-- Ensures every new zone automatically has O(1) entries for all 4 categories in 'unknown' state.
create or replace function public.trg_init_zone_category_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.zone_category_status (h3_index, category, state, distinct_reporters, weighted_score, state_since, updated_at)
  values
    (new.h3_index, 'electricity'::public.utility_category, 'unknown'::public.zone_state, 0, 0.00, new.created_at, new.created_at),
    (new.h3_index, 'gas'::public.utility_category,         'unknown'::public.zone_state, 0, 0.00, new.created_at, new.created_at),
    (new.h3_index, 'water'::public.utility_category,       'unknown'::public.zone_state, 0, 0.00, new.created_at, new.created_at),
    (new.h3_index, 'lpg'::public.utility_category,         'unknown'::public.zone_state, 0, 0.00, new.created_at, new.created_at)
  on conflict (h3_index, category) do nothing;
  return new;
end;
$$;

create trigger trg_after_insert_zone_init_status
after insert on public.zones
for each row
execute function public.trg_init_zone_category_status();

-- -----------------------------------------------------------------------------
-- 5. Performance Indexes (Following Supabase Postgres Best Practices)
-- -----------------------------------------------------------------------------

-- Foreign Key & Join indexes
create index idx_profiles_home_h3 on public.profiles(home_h3) where home_h3 is not null;
create index idx_profiles_device_id_hash on public.profiles(device_id_hash) where device_id_hash is not null;
create index idx_push_subscriptions_user_id on public.push_subscriptions(user_id) where user_id is not null;
create index idx_push_subscriptions_h3_subs on public.push_subscriptions using gin(h3_subscriptions);

-- Hot query indexes for report ingestion and consensus recomputation
create index idx_reports_h3_cat_active on public.reports(h3_index, category, expires_at);
create index idx_reports_rate_limit_user on public.reports(user_id, category, received_at desc) where user_id is not null;
create index idx_reports_rate_limit_device on public.reports(device_id_hash, category, received_at desc) where device_id_hash is not null;
create index idx_reports_unsettled on public.reports(received_at) where settled_at is null and user_id is not null;
create index idx_reports_72h_cleanup on public.reports(received_at);

-- Zone status and timeline indexes
create index idx_zone_category_status_state on public.zone_category_status(state);
create index idx_status_events_h3_cat_at on public.status_events(h3_index, category, at desc);
create index idx_status_events_at on public.status_events(at desc);
create index idx_zone_hourly_stats_lookup on public.zone_hourly_stats(h3_index, category, hour_bucket desc);
create index idx_official_prices_lookup on public.official_prices(item, effective_from desc);
