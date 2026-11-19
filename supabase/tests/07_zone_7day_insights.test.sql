-- =============================================================================
-- Test File: 07_zone_7day_insights.test.sql
-- Description: pgTAP tests for 7-day community reliability insights (ADR-0006):
--              - Anon-callable, read-only.
--              - Uses zone_hourly_stats and status_events (no raw reports older than 72h).
--              - total_outage_minutes and outage_event_count per category for last 7 days.
--              - hourly_pattern: 24 values representing share of problem days.
--              - data_confidence: 'insufficient' (<3 days or <10 reporters) vs 'ok'.
--              - lpg_price: median and official price ONLY if >= 5 reports; otherwise null.
--              - insight_bn: deterministic Bengali templates with thresholds.
-- =============================================================================

begin;

create extension if not exists pgtap;

select plan(14);

-- -----------------------------------------------------------------------------
-- Setup Test Fixtures
-- -----------------------------------------------------------------------------
do $$
declare
  v_test_h3 text := '883cf10ca1fffff';
  v_empty_h3 text := '883cf10eb1fffff';
  v_now timestamptz := pg_catalog.now();
  v_d1 timestamptz;
  v_d2 timestamptz;
  v_d3 timestamptz;
  v_d4 timestamptz;
begin
  -- Ensure test zones exist
  insert into public.zones (h3_index, area_name_bn, ward, city)
  values
    (v_test_h3, 'ধানমন্ডি টেস্ট', 'ওয়ার্ড ১৫', 'ঢাকা'),
    (v_empty_h3, 'মিরপুর টেস্ট', 'ওয়ার্ড ১৪', 'ঢাকা')
  on conflict (h3_index) do nothing;

  -- Ensure official LPG price exists
  insert into public.official_prices (item, price_bdt, effective_from, source_url)
  values ('BERC ১২ কেজি এলপিজি সরকারি মূল্য', 1455.00, '2026-11-01', 'https://berc.org.bd')
  on conflict do nothing;

  -- ---------------------------------------------------------------------------
  -- Fixture 1: Electricity with 4 distinct confirmed outages totaling 540 min (9h)
  -- Outage 1: 5 days ago, duration 120 min (2h)
  -- Outage 2: 4 days ago, duration 180 min (3h)
  -- Outage 3: 2 days ago, duration 90 min (1.5h)
  -- Outage 4: yesterday, duration 150 min (2.5h)
  -- Total: 120 + 180 + 90 + 150 = 540 minutes
  -- ---------------------------------------------------------------------------
  v_d1 := v_now - interval '5 days';
  insert into public.status_events (h3_index, category, from_state, to_state, at)
  values
    (v_test_h3, 'electricity', 'ok', 'out', v_d1),
    (v_test_h3, 'electricity', 'out', 'ok', v_d1 + interval '120 minutes');

  v_d2 := v_now - interval '4 days';
  insert into public.status_events (h3_index, category, from_state, to_state, at)
  values
    (v_test_h3, 'electricity', 'ok', 'out', v_d2),
    (v_test_h3, 'electricity', 'out', 'ok', v_d2 + interval '180 minutes');

  v_d3 := v_now - interval '2 days';
  insert into public.status_events (h3_index, category, from_state, to_state, at)
  values
    (v_test_h3, 'electricity', 'ok', 'out', v_d3),
    (v_test_h3, 'electricity', 'out', 'ok', v_d3 + interval '90 minutes');

  v_d4 := v_now - interval '1 day';
  insert into public.status_events (h3_index, category, from_state, to_state, at)
  values
    (v_test_h3, 'electricity', 'ok', 'out', v_d4),
    (v_test_h3, 'electricity', 'out', 'ok', v_d4 + interval '150 minutes');

  -- ---------------------------------------------------------------------------
  -- Fixture 2: Gas with low pressure recurring between 10:00 and 14:00 (10 AM to 2 PM)
  -- on 3 distinct days, with 12 distinct reporters in total
  -- ---------------------------------------------------------------------------
  insert into public.zone_hourly_stats (h3_index, category, hour_bucket, minutes_out, minutes_low, distinct_reporters)
  values
    -- Day 1 (3 days ago)
    (v_test_h3, 'gas', (v_now - interval '3 days')::date + interval '10 hours', 0, 50, 4),
    (v_test_h3, 'gas', (v_now - interval '3 days')::date + interval '11 hours', 0, 60, 0),
    (v_test_h3, 'gas', (v_now - interval '3 days')::date + interval '12 hours', 0, 60, 0),
    (v_test_h3, 'gas', (v_now - interval '3 days')::date + interval '13 hours', 0, 45, 0),
    -- Day 2 (2 days ago)
    (v_test_h3, 'gas', (v_now - interval '2 days')::date + interval '10 hours', 0, 60, 4),
    (v_test_h3, 'gas', (v_now - interval '2 days')::date + interval '11 hours', 0, 60, 0),
    (v_test_h3, 'gas', (v_now - interval '2 days')::date + interval '12 hours', 0, 55, 0),
    (v_test_h3, 'gas', (v_now - interval '2 days')::date + interval '13 hours', 0, 40, 0),
    -- Day 3 (1 day ago)
    (v_test_h3, 'gas', (v_now - interval '1 day')::date + interval '10 hours', 0, 40, 4),
    (v_test_h3, 'gas', (v_now - interval '1 day')::date + interval '11 hours', 0, 60, 0),
    (v_test_h3, 'gas', (v_now - interval '1 day')::date + interval '12 hours', 0, 60, 0),
    (v_test_h3, 'gas', (v_now - interval '1 day')::date + interval '13 hours', 0, 50, 0);

  -- ---------------------------------------------------------------------------
  -- Fixture 3: LPG reports (initially 4 reports)
  -- ---------------------------------------------------------------------------
  insert into public.reports (device_id_hash, h3_index, category, state, price_bdt, weight, client_ts, received_at)
  values
    ('dev-lpg-1', v_test_h3, 'lpg', 'ok', 1400.00, 1.0, v_now, v_now),
    ('dev-lpg-2', v_test_h3, 'lpg', 'ok', 1420.00, 1.0, v_now, v_now),
    ('dev-lpg-3', v_test_h3, 'lpg', 'ok', 1450.00, 1.0, v_now, v_now),
    ('dev-lpg-4', v_test_h3, 'lpg', 'ok', 1410.00, 1.0, v_now, v_now);
end;
$$;

-- -----------------------------------------------------------------------------
-- Test 1: Empty Zone has 'insufficient' confidence and default message
-- -----------------------------------------------------------------------------
select is(
  (public.get_zone_7day_insights('883cf10eb1fffff')->>'data_confidence'),
  'insufficient',
  'Empty zone must have data_confidence = insufficient'
);

-- Test 2: Empty Zone insight_bn states insufficient data
select is(
  (public.get_zone_7day_insights('883cf10eb1fffff')->>'insight_bn'),
  'এখনো পর্যাপ্ত তথ্য নেই (কমপক্ষে ৩ দিনের রিপোর্ট লাগবে)।',
  'Insufficient confidence returns exact Bengali threshold notice'
);

-- -----------------------------------------------------------------------------
-- Test 3: Active Test Zone has 'ok' confidence (>= 3 distinct days, >= 10 reporters)
-- -----------------------------------------------------------------------------
select is(
  (public.get_zone_7day_insights('883cf10ca1fffff')->>'data_confidence'),
  'ok',
  'Zone with >= 3 distinct days and >= 10 reporters has data_confidence = ok'
);

-- -----------------------------------------------------------------------------
-- Tests 4 & 5: Electricity total_outage_minutes = 540, outage_event_count = 4
-- -----------------------------------------------------------------------------
select is(
  (public.get_zone_7day_insights('883cf10ca1fffff')->'categories'->'electricity'->>'outage_event_count')::int,
  4,
  'Electricity outage_event_count must be exactly 4 confirmed outage events'
);

select is(
  (public.get_zone_7day_insights('883cf10ca1fffff')->'categories'->'electricity'->>'total_outage_minutes')::int,
  540,
  'Electricity total_outage_minutes must be exactly 540 minutes (9 hours)'
);

-- -----------------------------------------------------------------------------
-- Tests 6 & 7: Gas hourly_pattern has 24 values and reflects peak hours 10..13
-- -----------------------------------------------------------------------------
select is(
  jsonb_array_length(public.get_zone_7day_insights('883cf10ca1fffff')->'categories'->'gas'->'hourly_pattern'),
  24,
  'Gas hourly_pattern must contain exactly 24 values'
);

select is(
  (public.get_zone_7day_insights('883cf10ca1fffff')->'categories'->'gas'->'hourly_pattern'->>10)::numeric,
  0.43,
  'Hour 10 pattern share must be 3 of 7 days = 0.43'
);

-- -----------------------------------------------------------------------------
-- Test 8: Deterministic Bengali Template for Gas Low Pressure Peak (10 AM to 2 PM)
-- -----------------------------------------------------------------------------
select is(
  (public.get_zone_7day_insights('883cf10ca1fffff')->'categories'->'gas'->>'insight_bn'),
  'এই এলাকায় সাধারণত সকাল ১০টা থেকে দুপুর ২টার মধ্যে গ্যাসের চাপ কম থাকে।',
  'Gas insight generates deterministic Bengali template with 10:00 to 14:00 window'
);

-- -----------------------------------------------------------------------------
-- Test 9: Electricity Category Insight (4 outages, 9 hours)
-- -----------------------------------------------------------------------------
select is(
  (public.get_zone_7day_insights('883cf10ca1fffff')->'categories'->'electricity'->>'insight_bn'),
  'এই সপ্তাহে ৪ বার কারেন্ট গেছে • মোট ৯ ঘণ্টা।',
  'Electricity insight formats event count and total hours with Bengali digits'
);

-- -----------------------------------------------------------------------------
-- Test 10: LPG price is null when fewer than 5 reports (currently 4)
-- -----------------------------------------------------------------------------
select is(
  (public.get_zone_7day_insights('883cf10ca1fffff')->>'lpg_price'),
  null,
  'LPG price is null when fewer than 5 reports exist'
);

-- -----------------------------------------------------------------------------
-- Test 11 & 12: LPG price populated when 5th report is added
-- -----------------------------------------------------------------------------
do $$
begin
  insert into public.reports (device_id_hash, h3_index, category, state, price_bdt, weight, client_ts, received_at)
  values ('dev-lpg-5', '883cf10ca1fffff', 'lpg', 'ok', 1430.00, 1.0, now(), now());
end;
$$;

select is(
  ((public.get_zone_7day_insights('883cf10ca1fffff')->'lpg_price'->>'area_median')::numeric),
  1420.00,
  'LPG median price is correctly calculated (1420.00) when >= 5 reports'
);

select is(
  ((public.get_zone_7day_insights('883cf10ca1fffff')->'lpg_price'->>'official_price')::numeric),
  1455.00,
  'LPG official benchmark price is correctly retrieved from official_prices'
);

-- -----------------------------------------------------------------------------
-- Tests 13 & 14: Anon Execution Privileges and Zero Personal Data
-- -----------------------------------------------------------------------------
set local role anon;

select ok(
  (public.get_zone_7day_insights('883cf10ca1fffff') is not null),
  'Anon role can successfully execute get_zone_7day_insights'
);

select is(
  (public.get_zone_7day_insights('883cf10ca1fffff') ? 'user_id' or
   public.get_zone_7day_insights('883cf10ca1fffff') ? 'device_id_hash'),
  false,
  'Returned insights payload exposes no user_id or device_id_hash'
);

rollback;
