-- =============================================================================
-- Test File: 02_duplicate_reports_rate_limit.test.sql
-- Description: pgTAP tests for Halchal 15-minute anti-spam rate limiting:
--              - Duplicate report within 15 min rejected for same user.
--              - Duplicate report within 15 min rejected for same device_id_hash.
--              - Reports for DIFFERENT categories within 15 min are accepted.
-- =============================================================================

begin;

create extension if not exists pgtap;

select plan(6);

-- -----------------------------------------------------------------------------
-- Setup Test Fixtures
-- -----------------------------------------------------------------------------
do $$
declare
  v_uid1 uuid := 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa';
  v_uid2 uuid := 'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb';
begin
  insert into public.zones (h3_index, area_name_bn, ward, city)
  values ('883cf10ca1fffff', 'ধানমন্ডি টেস্ট', 'ওয়ার্ড ১৫', 'ঢাকা')
  on conflict (h3_index) do nothing;

  insert into auth.users (id, email)
  values
    (v_uid1, 'userA@test.com'),
    (v_uid2, 'userB@test.com')
  on conflict (id) do nothing;

  insert into public.profiles (id, trust_score, tier)
  values
    (v_uid1, 1.00, 'google'),
    (v_uid2, 1.00, 'google')
  on conflict (id) do nothing;
end;
$$;

-- Test 1: User A submits first report for electricity -> Success
select lives_ok(
  $$select public.submit_report(
      'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa'::uuid,
      'dev-alpha',
      '883cf10ca1fffff',
      'electricity'::public.utility_category,
      'out'::public.report_state,
      null,
      now()
    )$$,
  'First report by User A succeeds'
);

-- Test 2: User A attempts duplicate report for electricity within 15 minutes -> Throws P0015
select throws_ok(
  $$select public.submit_report(
      'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa'::uuid,
      'dev-other',
      '883cf10ca1fffff',
      'electricity'::public.utility_category,
      'ok'::public.report_state,
      null,
      now()
    )$$,
  'P0015',
  null,
  'Duplicate report by same user within 15 minutes rejected with P0015'
);

-- Test 3: Same User A submits report for water (different category) within 15 minutes -> Success
select lives_ok(
  $$select public.submit_report(
      'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa'::uuid,
      'dev-alpha',
      '883cf10ca1fffff',
      'water'::public.utility_category,
      'low'::public.report_state,
      null,
      now()
    )$$,
  'Report for a different category within 15 minutes by same user succeeds'
);

-- Test 4: Anonymous device dev-shared submits report for gas -> Success
select lives_ok(
  $$select public.submit_report(
      null,
      'dev-shared',
      '883cf10ca1fffff',
      'gas'::public.utility_category,
      'out'::public.report_state,
      null,
      now()
    )$$,
  'Initial report by device dev-shared succeeds'
);

-- Test 5: Different user (User B) on SAME device dev-shared attempts report for gas within 15 min -> Throws P0016
select throws_ok(
  $$select public.submit_report(
      'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb'::uuid,
      'dev-shared',
      '883cf10ca1fffff',
      'gas'::public.utility_category,
      'ok'::public.report_state,
      null,
      now()
    )$$,
  'P0016',
  null,
  'Duplicate report by same device_id_hash within 15 minutes rejected with P0016'
);

-- Test 6: Verify report count for electricity: User A's duplicate was not inserted
select is(
  (select count(*) from public.reports
    where user_id = 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa'::uuid
      and category = 'electricity'),
  1::bigint,
  'Database contains exactly 1 electricity report for User A (no duplicates inserted)'
);

select * from finish();

rollback;
