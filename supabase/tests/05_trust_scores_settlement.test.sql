-- =============================================================================
-- Test File: 05_trust_scores_settlement.test.sql
-- Description: pgTAP tests for Halchal trust score lifecycle & settlement:
--              - Trust score is NEVER updated inside submit_report (prevents gaming).
--              - Reports older than 20 min are evaluated against zone consensus.
--              - Matching confirmed consensus awards +0.05.
--              - Contradicting confirmed consensus penalizes -0.15.
--              - Unconfirmed consensus results in 0.00 delta.
--              - Clamping: strictly clamped within [0.10, 3.00].
-- =============================================================================

begin;

create extension if not exists pgtap;

select plan(9);

-- -----------------------------------------------------------------------------
-- Setup Test Fixtures
-- -----------------------------------------------------------------------------
do $$
declare
  v_u_honest uuid := '71717171-7171-7171-7171-717171717171';
  v_u_troll  uuid := '72727272-7272-7272-7272-727272727272';
  v_u_high   uuid := '73737373-7373-7373-7373-737373737373';
  v_u_low    uuid := '74747474-7474-7474-7474-747474747474';
begin
  insert into public.zones (h3_index, area_name_bn, ward, city)
  values ('883cf10ca1fffff', 'ধানমন্ডি টেস্ট', 'ওয়ার্ড ১৫', 'ঢাকা')
  on conflict (h3_index) do nothing;

  insert into auth.users (id, email)
  values
    (v_u_honest, 'honest@test.com'),
    (v_u_troll,  'troll@test.com'),
    (v_u_high,   'high@test.com'),
    (v_u_low,    'low@test.com')
  on conflict (id) do nothing;

  insert into public.profiles (id, trust_score, tier)
  values
    (v_u_honest, 1.00, 'google'),
    (v_u_troll,  1.00, 'google'),
    (v_u_high,   2.98, 'phone'),   -- Near maximum cap (3.00)
    (v_u_low,    0.15, 'anonymous') -- Near minimum floor (0.10)
  on conflict (id) do update set
    trust_score = excluded.trust_score,
    tier = excluded.tier;
end;
$$;

-- Test 1: Trust score is NEVER changed inside submit_report
select lives_ok(
  $$select public.submit_report(
      '71717171-7171-7171-7171-717171717171'::uuid,
      'dev-honest',
      '883cf10ca1fffff',
      'electricity'::public.utility_category,
      'out'::public.report_state,
      null,
      now()
    )$$,
  'Submit report succeeds'
);

select is(
  (select trust_score from public.profiles where id = '71717171-7171-7171-7171-717171717171'::uuid),
  1.00::numeric,
  'Trust score is strictly unchanged immediately after submit_report (anti-gaming rule)'
);

-- Test 2: Reports younger than 20 minutes are not settled
select is(
  (select public.settle_trust_scores()),
  0,
  'settle_trust_scores processes 0 reports when all reports are < 20 minutes old'
);

-- Setup consensus and simulate passage of > 20 minutes
do $$
declare
  v_u_honest uuid := '71717171-7171-7171-7171-717171717171';
  v_u_troll  uuid := '72727272-7272-7272-7272-727272727272';
  v_u_high   uuid := '73737373-7373-7373-7373-737373737373';
  v_u_low    uuid := '74747474-7474-7474-7474-747474747474';
begin
  -- Set zone consensus to confirmed 'out'
  insert into public.zone_category_status (
    h3_index, category, state, distinct_reporters, weighted_score, state_since, updated_at
  ) values (
    '883cf10ca1fffff', 'electricity'::public.utility_category, 'out'::public.zone_state, 3, 3.00, now() - interval '30 minutes', now() - interval '30 minutes'
  ) on conflict (h3_index, category) do update set state = 'out'::public.zone_state;

  insert into public.status_events (h3_index, category, from_state, to_state, at)
  values ('883cf10ca1fffff', 'electricity'::public.utility_category, 'unverified'::public.zone_state, 'out'::public.zone_state, now() - interval '25 minutes');

  -- Backdate existing honest report (reported 'out', matching confirmed 'out') to 22 minutes ago
  update public.reports
     set received_at = now() - interval '22 minutes'
   where user_id = v_u_honest;

  -- Insert report for troll (reported 'ok', contradicting confirmed consensus 'out') 22 minutes ago
  insert into public.reports (
    user_id, device_id_hash, h3_index, category, state, weight, client_ts, received_at, expires_at
  ) values (
    v_u_troll, 'dev-troll', '883cf10ca1fffff', 'electricity'::public.utility_category, 'ok'::public.report_state, 1.00,
    now() - interval '22 minutes', now() - interval '22 minutes', now() + interval '38 minutes'
  );

  -- Insert report for v_u_high (reported 'out', matching confirmed 'out') to test upper clamp (2.98 + 0.05 -> 3.00)
  insert into public.reports (
    user_id, device_id_hash, h3_index, category, state, weight, client_ts, received_at, expires_at
  ) values (
    v_u_high, 'dev-high', '883cf10ca1fffff', 'electricity'::public.utility_category, 'out'::public.report_state, 2.00,
    now() - interval '22 minutes', now() - interval '22 minutes', now() + interval '38 minutes'
  );

  -- Insert report for v_u_low (reported 'ok', contradicting confirmed 'out') to test lower clamp (0.15 - 0.15 -> 0.10)
  insert into public.reports (
    user_id, device_id_hash, h3_index, category, state, weight, client_ts, received_at, expires_at
  ) values (
    v_u_low, 'dev-low', '883cf10ca1fffff', 'electricity'::public.utility_category, 'ok'::public.report_state, 0.50,
    now() - interval '22 minutes', now() - interval '22 minutes', now() + interval '38 minutes'
  );
end;
$$;

-- Trigger settlement
select is(
  (select public.settle_trust_scores()),
  4,
  'settle_trust_scores settled 4 reports older than 20 minutes'
);

-- Test 3: Honest reporter matches confirmed consensus -> +0.05 (1.00 -> 1.05)
select is(
  (select trust_score from public.profiles where id = '71717171-7171-7171-7171-717171717171'::uuid),
  1.05::numeric,
  'Matching confirmed consensus increases trust score by +0.05 (1.00 -> 1.05)'
);

-- Test 4: Contradicting reporter contradicts confirmed consensus -> -0.15 (1.00 -> 0.85)
select is(
  (select trust_score from public.profiles where id = '72727272-7272-7272-7272-727272727272'::uuid),
  0.85::numeric,
  'Contradicting confirmed consensus decreases trust score by -0.15 (1.00 -> 0.85)'
);

-- Test 5: Upper clamp test: 2.98 + 0.05 = 3.03 -> clamped to 3.00
select is(
  (select trust_score from public.profiles where id = '73737373-7373-7373-7373-737373737373'::uuid),
  3.00::numeric,
  'Trust score upper bound clamped strictly to 3.00 (2.98 + 0.05 clamped to 3.00)'
);

-- Test 6: Lower clamp test: 0.15 - 0.15 = 0.00 -> clamped to 0.10
select is(
  (select trust_score from public.profiles where id = '74747474-7474-7474-7474-747474747474'::uuid),
  0.10::numeric,
  'Trust score lower bound clamped strictly to 0.10 (0.15 - 0.15 clamped to 0.10)'
);

-- Test 7: Verify reports are marked settled so they are not re-processed
select is(
  (select count(*) from public.reports where settled_at is not null),
  4::bigint,
  'All 4 evaluated reports have settled_at timestamp populated'
);

select * from finish();

rollback;
