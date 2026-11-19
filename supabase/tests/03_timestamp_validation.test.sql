-- =============================================================================
-- Test File: 03_timestamp_validation.test.sql
-- Description: pgTAP tests for Halchal client timestamp & price validation:
--              - Offline report 25 min old accepted (supports offline queue).
--              - Stale report 45 min old rejected (ERRCODE P0003).
--              - Future-dated report rejected (ERRCODE P0002).
--              - Report effective time uses LEAST(client_ts, now()).
--              - Expiry calculated correctly from report time.
--              - LPG price bounds (500..6000 BDT) and category restrictions.
-- =============================================================================

begin;

create extension if not exists pgtap;

select plan(7);

-- -----------------------------------------------------------------------------
-- Setup Test Fixtures
-- -----------------------------------------------------------------------------
do $$
begin
  insert into public.zones (h3_index, area_name_bn, ward, city)
  values ('883cf10ca1fffff', 'ধানমন্ডি টেস্ট', 'ওয়ার্ড ১৫', 'ঢাকা')
  on conflict (h3_index) do nothing;
end;
$$;

-- Test 1: Future-dated report rejected (now() + 5 minutes) -> Throws P0002
select throws_ok(
  $$select public.submit_report(
      null,
      'dev-future',
      '883cf10ca1fffff',
      'electricity'::public.utility_category,
      'out'::public.report_state,
      null,
      now() + interval '5 minutes'
    )$$,
  'P0002',
  null,
  'Future-dated client timestamp strictly rejected with P0002'
);

-- Test 2: Stale report 45 minutes old rejected (now() - 45 minutes) -> Throws P0003
select throws_ok(
  $$select public.submit_report(
      null,
      'dev-stale',
      '883cf10ca1fffff',
      'electricity'::public.utility_category,
      'out'::public.report_state,
      null,
      now() - interval '45 minutes'
    )$$,
  'P0003',
  null,
  'Stale client timestamp older than 30 minutes rejected with P0003'
);

-- Test 3: Offline-queued report 25 minutes old ACCEPTED (now() - 25 minutes)
select lives_ok(
  $$select public.submit_report(
      null,
      'dev-offline',
      '883cf10ca1fffff',
      'electricity'::public.utility_category,
      'out'::public.report_state,
      null,
      now() - interval '25 minutes'
    )$$,
  'Offline report 25 minutes old is accepted'
);

-- Test 4: Verify expiry timestamp calculation from effective report time
-- For electricity: 60 minutes from report time (now() - 25 min + 60 min = now() + 35 min)
select ok(
  (select expires_at > now() and expires_at <= (now() + interval '36 minutes')
     from public.reports
    where device_id_hash = 'dev-offline'
      and category = 'electricity'),
  'Expiry timestamp calculated from effective report time (now() - 25m + 60m = ~35m from now)'
);

-- Test 5: LPG price reporting: non-LPG category with price rejected -> Throws P0006
select throws_ok(
  $$select public.submit_report(
      null,
      'dev-price-err',
      '883cf10ca1fffff',
      'water'::public.utility_category,
      'ok'::public.report_state,
      1200.00,
      now()
    )$$,
  'P0006',
  null,
  'Price parameter strictly rejected for non-LPG categories with P0006'
);

-- Test 6: LPG price below 500 BDT rejected -> Throws P0005
select throws_ok(
  $$select public.submit_report(
      null,
      'dev-lpg-low',
      '883cf10ca1fffff',
      'lpg'::public.utility_category,
      'ok'::public.report_state,
      350.00,
      now()
    )$$,
  'P0005',
  null,
  'LPG price under 500 BDT rejected with P0005'
);

-- Test 7: Valid LPG report with price within 500..6000 BDT accepted
select lives_ok(
  $$select public.submit_report(
      null,
      'dev-lpg-ok',
      '883cf10ca1fffff',
      'lpg'::public.utility_category,
      'ok'::public.report_state,
      1450.00,
      now()
    )$$,
  'Valid LPG report with 1450 BDT price accepted'
);

select * from finish();

rollback;
