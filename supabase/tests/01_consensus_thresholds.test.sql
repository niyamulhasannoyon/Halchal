-- =============================================================================
-- Test File: 01_consensus_thresholds.test.sql
-- Description: pgTAP tests for Halchal consensus rules (ADR-0004):
--              - 2 reporters never confirm; 3 do.
--              - One user with trust 3.0 alone never confirms (weight capped at 2.0).
--              - Status events are written on state change.
--              - Ties keep the previous state.
-- =============================================================================

begin;

create extension if not exists pgtap;

select plan(11);

-- -----------------------------------------------------------------------------
-- Setup Test Fixtures
-- -----------------------------------------------------------------------------
do $$
declare
  v_uid1 uuid := '11111111-1111-1111-1111-111111111111';
  v_uid2 uuid := '22222222-2222-2222-2222-222222222222';
  v_uid3 uuid := '33333333-3333-3333-3333-333333333333';
  v_uid_whale uuid := '99999999-9999-9999-9999-999999999999';
begin
  -- Ensure test zone exists
  insert into public.zones (h3_index, area_name_bn, ward, city)
  values ('883cf10ca1fffff', 'ধানমন্ডি টেস্ট', 'ওয়ার্ড ১৫', 'ঢাকা')
  on conflict (h3_index) do nothing;

  -- Create test users in auth.users
  insert into auth.users (id, email)
  values
    (v_uid1, 'user1@test.halchal.org'),
    (v_uid2, 'user2@test.halchal.org'),
    (v_uid3, 'user3@test.halchal.org'),
    (v_uid_whale, 'whale@test.halchal.org')
  on conflict (id) do nothing;

  -- Create profiles: 3 regular users (trust 1.0, tier google -> weight 1.0 each)
  insert into public.profiles (id, trust_score, tier)
  values
    (v_uid1, 1.00, 'google'),
    (v_uid2, 1.00, 'google'),
    (v_uid3, 1.00, 'google'),
    -- High-trust user ("Whale"): trust 3.0, tier phone (multiplier 1.5 -> capped at 2.0)
    (v_uid_whale, 3.00, 'phone')
  on conflict (id) do update set
    trust_score = excluded.trust_score,
    tier = excluded.tier;
end;
$$;

-- Test 1: Initial state for electricity is 'unknown'
select is(
  (select state from public.zone_category_status where h3_index = '883cf10ca1fffff' and category = 'electricity'),
  'unknown'::public.zone_state,
  'Initial zone category state must be unknown'
);

-- Test 2: First reporter submits 'out' (user1: weight 1.0)
select lives_ok(
  $$select public.submit_report(
      '11111111-1111-1111-1111-111111111111'::uuid,
      'dev-1',
      '883cf10ca1fffff',
      'electricity'::public.utility_category,
      'out'::public.report_state,
      null,
      now()
    )$$,
  'First report submitted successfully'
);

-- Test 3: 1 reporter alone leaves state as 'unverified'
select is(
  (select state from public.zone_category_status where h3_index = '883cf10ca1fffff' and category = 'electricity'),
  'unverified'::public.zone_state,
  '1 reporter alone leaves state as unverified'
);

-- Test 4: Second reporter submits 'out' (user2: weight 1.0, total weight 2.0)
select lives_ok(
  $$select public.submit_report(
      '22222222-2222-2222-2222-222222222222'::uuid,
      'dev-2',
      '883cf10ca1fffff',
      'electricity'::public.utility_category,
      'out'::public.report_state,
      null,
      now()
    )$$,
  'Second report submitted successfully'
);

-- Test 5: Rule: 2 reporters NEVER confirm! (Must remain 'unverified')
select is(
  (select state from public.zone_category_status where h3_index = '883cf10ca1fffff' and category = 'electricity'),
  'unverified'::public.zone_state,
  '2 reporters never confirm; state must strictly remain unverified'
);

-- Test 6: Collusion Guard: One user with trust 3.0 alone on 'gas' NEVER confirms
select lives_ok(
  $$select public.submit_report(
      '99999999-9999-9999-9999-999999999999'::uuid,
      'dev-whale',
      '883cf10ca1fffff',
      'gas'::public.utility_category,
      'out'::public.report_state,
      null,
      now()
    )$$,
  'High-trust user report submitted successfully on gas category'
);

select is(
  (select state from public.zone_category_status where h3_index = '883cf10ca1fffff' and category = 'gas'),
  'unverified'::public.zone_state,
  'One user with trust 3.0 alone NEVER confirms (weight capped at 2.0, distinct=1 < 3)'
);

-- Test 7: Third reporter submits 'out' on 'electricity' (user3: weight 1.0, total weight 3.0, distinct 3)
select lives_ok(
  $$select public.submit_report(
      '33333333-3333-3333-3333-333333333333'::uuid,
      'dev-3',
      '883cf10ca1fffff',
      'electricity'::public.utility_category,
      'out'::public.report_state,
      null,
      now()
    )$$,
  'Third report submitted successfully on electricity'
);

-- Test 8: Rule: 3 reporters DO confirm (distinct >= 3 AND weighted >= 3.0 met -> state = 'out')
select is(
  (select state from public.zone_category_status where h3_index = '883cf10ca1fffff' and category = 'electricity'),
  'out'::public.zone_state,
  '3 reporters meeting thresholds confirm state to out'
);

-- Test 9: Verify status_events record written on confirmation
select is(
  (select count(*) from public.status_events
    where h3_index = '883cf10ca1fffff'
      and category = 'electricity'
      and from_state = 'unverified'
      and to_state = 'out'),
  1::bigint,
  'Status change from unverified to out was logged in status_events'
);

-- Test 10: Tie-breaking rule: "Ties keep the previous state"
-- State is currently 'out'. If another state also reaches equal qualifying weight (e.g. 3.0),
-- previous state ('out') must be retained.
do $$
declare
  v_uid4 uuid := '44444444-4444-4444-4444-444444444444';
  v_uid5 uuid := '55555555-5555-5555-5555-555555555555';
  v_uid6 uuid := '66666666-6666-6666-6666-666666666666';
begin
  insert into auth.users (id, email)
  values (v_uid4, 'u4@test.com'), (v_uid5, 'u5@test.com'), (v_uid6, 'u6@test.com')
  on conflict do nothing;

  insert into public.profiles (id, trust_score, tier)
  values (v_uid4, 1.00, 'google'), (v_uid5, 1.00, 'google'), (v_uid6, 1.00, 'google')
  on conflict do nothing;

  -- 3 users report 'ok' (each weight 1.0 -> sum 3.0, distinct 3)
  perform public.submit_report(v_uid4, 'dev-4', '883cf10ca1fffff', 'electricity'::public.utility_category, 'ok'::public.report_state, null, now());
  perform public.submit_report(v_uid5, 'dev-5', '883cf10ca1fffff', 'electricity'::public.utility_category, 'ok'::public.report_state, null, now());
  perform public.submit_report(v_uid6, 'dev-6', '883cf10ca1fffff', 'electricity'::public.utility_category, 'ok'::public.report_state, null, now());
end;
$$;

select is(
  (select state from public.zone_category_status where h3_index = '883cf10ca1fffff' and category = 'electricity'),
  'out'::public.zone_state,
  'Tied qualifying scores keep previous state (retains out)'
);

select * from finish();

rollback;
