-- =============================================================================
-- Test File: 04_report_expiry_and_rollup.test.sql
-- Description: pgTAP tests for Halchal report expiry, rollback, and 72h cleanup:
--              - Expired reports drop the zone to 'unknown', NOT 'ok'.
--              - Golden Rule: Absence of reports is never proof of service.
--              - State transition from 'out' to 'unknown' recorded in status_events.
--              - Hourly stats rollup aggregates minutes_out from status_events.
--              - 72-Hour Raw Data TTL: Raw reports older than 72 hours are deleted.
-- =============================================================================

begin;

create extension if not exists pgtap;

select plan(7);

-- -----------------------------------------------------------------------------
-- Setup Test Fixtures
-- -----------------------------------------------------------------------------
do $$
declare
  v_u1 uuid := '10101010-1010-1010-1010-101010101010';
  v_u2 uuid := '20202020-2020-2020-2020-202020202020';
  v_u3 uuid := '30303030-3030-3030-3030-303030303030';
begin
  insert into public.zones (h3_index, area_name_bn, ward, city)
  values ('883cf10ca1fffff', 'ধানমন্ডি টেস্ট', 'ওয়ার্ড ১৫', 'ঢাকা')
  on conflict (h3_index) do nothing;

  insert into auth.users (id, email)
  values
    (v_u1, 'u1@test.com'),
    (v_u2, 'u2@test.com'),
    (v_u3, 'u3@test.com')
  on conflict (id) do nothing;

  insert into public.profiles (id, trust_score, tier)
  values
    (v_u1, 1.00, 'google'),
    (v_u2, 1.00, 'google'),
    (v_u3, 1.00, 'google')
  on conflict (id) do nothing;

  -- 3 users submit 'out' for electricity to confirm 'out' state
  perform public.submit_report(v_u1, 'dev-1', '883cf10ca1fffff', 'electricity'::public.utility_category, 'out'::public.report_state, null, now());
  perform public.submit_report(v_u2, 'dev-2', '883cf10ca1fffff', 'electricity'::public.utility_category, 'out'::public.report_state, null, now());
  perform public.submit_report(v_u3, 'dev-3', '883cf10ca1fffff', 'electricity'::public.utility_category, 'out'::public.report_state, null, now());
end;
$$;

-- Test 1: Zone is confirmed as 'out'
select is(
  (select state from public.zone_category_status where h3_index = '883cf10ca1fffff' and category = 'electricity'),
  'out'::public.zone_state,
  'Zone is confirmed in out state prior to expiration'
);

-- Test 2: Expire all electricity reports for this zone
do $$
begin
  -- Simulate expiry by setting expires_at to 5 minutes ago and updating updated_at so expire_and_rollup detects it
  update public.reports
     set expires_at = now() - interval '5 minutes'
   where h3_index = '883cf10ca1fffff' and category = 'electricity';

  update public.zone_category_status
     set updated_at = now() - interval '10 minutes'
   where h3_index = '883cf10ca1fffff' and category = 'electricity';
end;
$$;

-- Run expire_and_rollup
select lives_ok(
  $$select public.expire_and_rollup()$$,
  'expire_and_rollup runs successfully'
);

-- Test 3: Golden Rule: Expired reports drop the zone to 'unknown', NOT 'ok'!
select is(
  (select state from public.zone_category_status where h3_index = '883cf10ca1fffff' and category = 'electricity'),
  'unknown'::public.zone_state,
  'Expired reports drop zone to unknown (Golden Rule: unknown must NEVER drop to ok)'
);

-- Test 4: Verify status_events logged transition from 'out' to 'unknown'
select is(
  (select count(*) from public.status_events
    where h3_index = '883cf10ca1fffff'
      and category = 'electricity'
      and from_state = 'out'
      and to_state = 'unknown'),
  1::bigint,
  'Transition from out to unknown was appended to status_events'
);

-- Test 5: Verify zone_hourly_stats was populated by rollup
select ok(
  (select count(*) > 0 from public.zone_hourly_stats
    where h3_index = '883cf10ca1fffff'
      and category = 'electricity'),
  'zone_hourly_stats has hourly record created by rollup'
);

-- Test 6: Test 72-Hour Raw Data TTL
-- Insert a raw report older than 72 hours (75 hours old) and one fresh report (24 hours old)
do $$
begin
  insert into public.reports (
    user_id, device_id_hash, h3_index, category, state, weight, client_ts, received_at, expires_at
  ) values (
    null, 'dev-old-75h', '883cf10ca1fffff', 'gas'::public.utility_category, 'ok'::public.report_state, 1.0,
    now() - interval '75 hours', now() - interval '75 hours', now() - interval '74 hours'
  );

  insert into public.reports (
    user_id, device_id_hash, h3_index, category, state, weight, client_ts, received_at, expires_at
  ) values (
    null, 'dev-fresh-24h', '883cf10ca1fffff', 'gas'::public.utility_category, 'ok'::public.report_state, 1.0,
    now() - interval '24 hours', now() - interval '24 hours', now() - interval '23 hours'
  );
end;
$$;

-- Trigger cleanup via expire_and_rollup
select is(
  (select public.expire_and_rollup() >= 1),
  true,
  'expire_and_rollup purged at least 1 raw report older than 72h'
);

-- Test 7: Verify 75h report was deleted while 24h report remains
select ok(
  (not exists (select 1 from public.reports where device_id_hash = 'dev-old-75h'))
  and
  (exists (select 1 from public.reports where device_id_hash = 'dev-fresh-24h')),
  'Raw report > 72h permanently purged; recent report (< 72h) preserved'
);

select * from finish();

rollback;
