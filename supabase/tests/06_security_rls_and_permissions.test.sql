-- =============================================================================
-- Test File: 06_security_rls_and_permissions.test.sql
-- Description: pgTAP tests for Halchal security, RLS, and access controls:
--              - RLS enabled on every table.
--              - Anon role CAN select from public.zones.
--              - Anon role CANNOT select from public.reports.
--              - Anon role CANNOT select from profiles, push_subscriptions, status_events.
--              - Anon role CAN execute get_zone_status (returns 4 categories, no user data).
--              - Anon and authenticated roles CANNOT execute submit_report directly.
--              - service_role possesses exclusive execution privileges for submit_report.
-- =============================================================================

begin;

create extension if not exists pgtap;

select plan(11);

-- -----------------------------------------------------------------------------
-- Setup Test Fixtures
-- -----------------------------------------------------------------------------
do $$
begin
  insert into public.zones (h3_index, area_name_bn, ward, city)
  values ('883cf10ca1fffff', 'ধানমন্ডি টেস্ট', 'ওয়ার্ড ১৫', 'ঢাকা')
  on conflict (h3_index) do nothing;

  insert into public.reports (
    user_id, device_id_hash, h3_index, category, state, weight, client_ts, received_at, expires_at
  ) values (
    null, 'dev-secret-1', '883cf10ca1fffff', 'electricity'::public.utility_category, 'out'::public.report_state, 1.0,
    now(), now(), now() + interval '60 minutes'
  );
end;
$$;

-- Test 1: Verify RLS is enabled on all tables
select ok(
  (select bool_and(relrowsecurity) from pg_class
    where relname in ('zones', 'profiles', 'push_subscriptions', 'reports', 'zone_category_status', 'status_events', 'zone_hourly_stats', 'official_prices')
      and relnamespace = 'public'::regnamespace),
  'Row Level Security is enabled on all Halchal public tables'
);

-- Test 2: Switch to anon role
set local role anon;

-- Anon CAN select from zones
select is(
  (select count(*) > 0 from public.zones),
  true,
  'Anon role has SELECT permission on public.zones'
);

-- Test 3: Anon CANNOT select from reports (Principle of Least Privilege / Privacy Mandate)
select throws_ok(
  $$select count(*) from public.reports$$,
  '42501',
  null,
  'Anon role cannot select from public.reports (permission denied - 42501)'
);

-- Test 4: Anon CANNOT select from profiles
select throws_ok(
  $$select count(*) from public.profiles$$,
  '42501',
  null,
  'Anon role cannot select from public.profiles (permission denied - 42501)'
);

-- Test 5: Anon CANNOT select from push_subscriptions
select throws_ok(
  $$select count(*) from public.push_subscriptions$$,
  '42501',
  null,
  'Anon role cannot select from public.push_subscriptions (permission denied - 42501)'
);

-- Test 6: Anon CANNOT select from status_events
select throws_ok(
  $$select count(*) from public.status_events$$,
  '42501',
  null,
  'Anon role cannot select from public.status_events (permission denied - 42501)'
);

-- Test 7: Anon CAN execute get_zone_status
select lives_ok(
  $$select * from public.get_zone_status('883cf10ca1fffff')$$,
  'Anon role is permitted to execute public.get_zone_status'
);

-- Test 8: get_zone_status returns exactly 4 rows (one per utility category)
select is(
  (select count(*) from public.get_zone_status('883cf10ca1fffff')),
  4::bigint,
  'get_zone_status returns exactly 4 category rows (electricity, gas, water, lpg)'
);

-- Test 9: Anon CANNOT execute submit_report directly (Must route via service_role Edge Function)
select throws_ok(
  $$select public.submit_report(
      null, 'dev-attack', '883cf10ca1fffff', 'electricity'::public.utility_category, 'out'::public.report_state, null, now()
    )$$,
  '42501',
  null,
  'Anon role cannot directly execute submit_report (permission denied - 42501)'
);

-- Test 10: Switch to authenticated role
set local role authenticated;

select throws_ok(
  $$select public.submit_report(
      null, 'dev-attack', '883cf10ca1fffff', 'electricity'::public.utility_category, 'out'::public.report_state, null, now()
    )$$,
  '42501',
  null,
  'Authenticated role cannot directly execute submit_report (permission denied - 42501)'
);

-- Test 11: Switch to service_role (Edge Function write gateway)
set local role service_role;

select lives_ok(
  $$select public.submit_report(
      null, 'dev-service-role', '883cf10ca1fffff', 'electricity'::public.utility_category, 'out'::public.report_state, null, now()
    )$$,
  'service_role has exclusive authorization to execute submit_report'
);

select * from finish();

rollback;
