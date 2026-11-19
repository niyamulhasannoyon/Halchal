-- =============================================================================
-- Migration: 20261119000002_create_functions.sql
-- Description: Core business logic functions for Halchal utility reporting.
-- Security: All SECURITY DEFINER, set search_path = '', fully schema-qualified.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Function 1: recompute_zone_category
-- -----------------------------------------------------------------------------
-- Evaluates non-expired reports for a specific (h3_index, category).
-- Rules:
-- 1. Considers reports where expires_at > now().
-- 2. Calculates weighted sum and distinct reporters per state.
-- 3. A state qualifies ONLY if (distinct >= 3 AND weighted >= 3.0).
-- 4. Winner is the qualifying state with the highest weighted score.
-- 5. Ties keep the previous state.
-- 6. If active reports exist but none qualifies -> 'unverified'.
-- 7. If zero active reports exist -> 'unknown'.
-- 8. On state change, writes a row to status_events and updates state_since.
-- -----------------------------------------------------------------------------
create or replace function public.recompute_zone_category(
  p_h3 text,
  p_category public.utility_category
)
returns public.zone_category_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prev_state public.zone_state := 'unknown'::public.zone_state;
  v_prev_state_since timestamptz;
  v_total_active_reports int := 0;
  v_total_distinct_reporters int := 0;
  v_total_active_weight numeric := 0.00;
  
  v_new_state public.zone_state := 'unknown'::public.zone_state;
  v_new_distinct int := 0;
  v_new_weighted numeric := 0.00;
  v_new_state_since timestamptz;
  
  v_qualifying_count int := 0;
  v_max_weight numeric := 0.00;
  v_tied_count int := 0;
  v_result public.zone_category_status;
begin
  -- Fetch current state and state_since
  select state, state_since
    into v_prev_state, v_prev_state_since
    from public.zone_category_status
   where h3_index = p_h3 and category = p_category;

  if not found then
    v_prev_state := 'unknown'::public.zone_state;
    v_prev_state_since := pg_catalog.now();
  end if;

  -- Compute totals over active (non-expired) reports
  select
    coalesce(count(*), 0),
    coalesce(count(distinct coalesce(r.user_id::text, r.device_id_hash)), 0),
    coalesce(sum(r.weight), 0.00)
  into
    v_total_active_reports,
    v_total_distinct_reporters,
    v_total_active_weight
  from public.reports r
  where r.h3_index = p_h3
    and r.category = p_category
    and r.expires_at > pg_catalog.now();

  -- Case A: No active reports -> zone drops to 'unknown' (never 'ok'!)
  if v_total_active_reports = 0 then
    v_new_state := 'unknown'::public.zone_state;
    v_new_distinct := 0;
    v_new_weighted := 0.00;

  else
    -- Evaluate qualifying states: distinct >= 3 AND weighted >= 3.0
    -- Collusion guard: single user (max weight 2.0) can never satisfy this alone.
    with state_aggregates as (
      select
        r.state as r_state,
        count(distinct coalesce(r.user_id::text, r.device_id_hash)) as r_distinct,
        sum(r.weight) as r_weight
      from public.reports r
      where r.h3_index = p_h3
        and r.category = p_category
        and r.expires_at > pg_catalog.now()
      group by r.state
      having count(distinct coalesce(r.user_id::text, r.device_id_hash)) >= 3
         and sum(r.weight) >= 3.00
    )
    select
      count(*),
      coalesce(max(r_weight), 0.00)
    into
      v_qualifying_count,
      v_max_weight
    from state_aggregates;

    if v_qualifying_count = 0 then
      -- Reports exist but confirmation threshold not met -> 'unverified'
      v_new_state := 'unverified'::public.zone_state;
      v_new_distinct := v_total_distinct_reporters;
      v_new_weighted := v_total_active_weight;

    elsif v_qualifying_count = 1 then
      -- Exactly one qualifying state -> confirmed winner
      select
        r_state::text::public.zone_state,
        r_distinct,
        r_weight
      into
        v_new_state,
        v_new_distinct,
        v_new_weighted
      from (
        select
          r.state as r_state,
          count(distinct coalesce(r.user_id::text, r.device_id_hash)) as r_distinct,
          sum(r.weight) as r_weight
        from public.reports r
        where r.h3_index = p_h3
          and r.category = p_category
          and r.expires_at > pg_catalog.now()
        group by r.state
        having count(distinct coalesce(r.user_id::text, r.device_id_hash)) >= 3
           and sum(r.weight) >= 3.00
      ) q;

    else
      -- Multiple qualifying states: check for unique highest score vs tie
      with qualifying as (
        select
          r.state as r_state,
          count(distinct coalesce(r.user_id::text, r.device_id_hash)) as r_distinct,
          sum(r.weight) as r_weight
        from public.reports r
        where r.h3_index = p_h3
          and r.category = p_category
          and r.expires_at > pg_catalog.now()
        group by r.state
        having count(distinct coalesce(r.user_id::text, r.device_id_hash)) >= 3
           and sum(r.weight) >= 3.00
      )
      select count(*)
        into v_tied_count
        from qualifying
       where r_weight = v_max_weight;

      if v_tied_count = 1 then
        -- Clear unique winner with strictly highest weighted score
        select
          r_state::text::public.zone_state,
          r_distinct,
          r_weight
        into
          v_new_state,
          v_new_distinct,
          v_new_weighted
        from (
          select
            r.state as r_state,
            count(distinct coalesce(r.user_id::text, r.device_id_hash)) as r_distinct,
            sum(r.weight) as r_weight
          from public.reports r
          where r.h3_index = p_h3
            and r.category = p_category
            and r.expires_at > pg_catalog.now()
          group by r.state
          having count(distinct coalesce(r.user_id::text, r.device_id_hash)) >= 3
             and sum(r.weight) >= 3.00
        ) q
        where r_weight = v_max_weight;
      else
        -- Tie detected! Rule: "Ties keep the previous state"
        v_new_state := v_prev_state;
        v_new_distinct := v_total_distinct_reporters;
        v_new_weighted := v_total_active_weight;
      end if;
    end if;
  end if;

  -- On state change: append to status_events and reset state_since
  if v_new_state <> v_prev_state then
    insert into public.status_events (
      h3_index,
      category,
      from_state,
      to_state,
      at
    ) values (
      p_h3,
      p_category,
      v_prev_state,
      v_new_state,
      pg_catalog.now()
    );
    v_new_state_since := pg_catalog.now();
  else
    v_new_state_since := coalesce(v_prev_state_since, pg_catalog.now());
  end if;

  -- Upsert into O(1) zone_category_status read table
  insert into public.zone_category_status (
    h3_index,
    category,
    state,
    distinct_reporters,
    weighted_score,
    state_since,
    updated_at
  ) values (
    p_h3,
    p_category,
    v_new_state,
    v_new_distinct,
    v_new_weighted,
    v_new_state_since,
    pg_catalog.now()
  )
  on conflict (h3_index, category) do update set
    state = excluded.state,
    distinct_reporters = excluded.distinct_reporters,
    weighted_score = excluded.weighted_score,
    state_since = excluded.state_since,
    updated_at = excluded.updated_at
  returning * into v_result;

  return v_result;
end;
$$;

comment on function public.recompute_zone_category is 'Calculates consensus state for a zone category over active non-expired reports.';

-- -----------------------------------------------------------------------------
-- Function 2: submit_report
-- -----------------------------------------------------------------------------
-- Single write gateway for citizen utility reports.
-- Called by Edge Function submit-report with service_role.
-- Rules:
-- 1. Identity: user_id OR device_id_hash required.
-- 2. Zone check: h3_index must exist in zones lookup table.
-- 3. Rate limiting: reject if user or device reported same category within 15 min.
-- 4. Timestamp validation: reject if client_ts is future or > 30 min old.
--    Use LEAST(client_ts, now()) as effective report time.
-- 5. Weight calculation: LEAST(trust_score * tier_multiplier, 2.0).
--    Multipliers: anonymous=0.5, google=1.0, phone=1.5. Capped at 2.0.
--    Trust score is NEVER modified inside submit_report.
-- 6. Expiry: electricity 60 min, gas 90 min, water 90 min, lpg 240 min from report time.
-- 7. LPG price: only allowed for lpg, validated between 500 and 6000 BDT.
-- 8. Inserts report and triggers recompute_zone_category, returns new status row.
-- -----------------------------------------------------------------------------
create or replace function public.submit_report(
  p_user uuid,
  p_device_hash text,
  p_h3 text,
  p_category public.utility_category,
  p_state public.report_state,
  p_price numeric,
  p_client_ts timestamptz
)
returns public.zone_category_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report_time timestamptz;
  v_expires_at timestamptz;
  v_trust_score numeric(4, 2) := 1.00;
  v_tier public.trust_tier := 'anonymous'::public.trust_tier;
  v_tier_mult numeric(3, 2) := 0.50;
  v_weight numeric(4, 2);
  v_result public.zone_category_status;
begin
  -- 1. Identity validation
  if p_user is null and (p_device_hash is null or pg_catalog.btrim(p_device_hash) = '') then
    raise exception 'INVALID_REPORTER_IDENTITY: Either user_id or device_id_hash must be provided'
      using errcode = 'P0001', detail = 'IDENTITY_REQUIRED';
  end if;

  -- 2. Zone lookup validation (Area names and validity come from DB lookup table, never client)
  if not exists (select 1 from public.zones where h3_index = p_h3) then
    raise exception 'ZONE_NOT_FOUND: Geographic zone % does not exist in lookup table', p_h3
      using errcode = 'P0004', detail = 'UNKNOWN_H3_ZONE';
  end if;

  -- 3. Rate limiting (15-minute anti-spam threshold per category)
  if p_user is not null and exists (
    select 1 from public.reports
    where user_id = p_user
      and category = p_category
      and received_at > (pg_catalog.now() - interval '15 minutes')
  ) then
    raise exception 'DUPLICATE_REPORT_RATE_LIMIT: User % already reported % within the last 15 minutes', p_user, p_category
      using errcode = 'P0015', detail = 'RATE_LIMITED_USER_15M';
  end if;

  if p_device_hash is not null and pg_catalog.btrim(p_device_hash) <> '' and exists (
    select 1 from public.reports
    where device_id_hash = p_device_hash
      and category = p_category
      and received_at > (pg_catalog.now() - interval '15 minutes')
  ) then
    raise exception 'DUPLICATE_DEVICE_RATE_LIMIT: Device % already reported % within the last 15 minutes', p_device_hash, p_category
      using errcode = 'P0016', detail = 'RATE_LIMITED_DEVICE_15M';
  end if;

  -- 4. Timestamp validation
  -- Reject if in the future
  if p_client_ts > pg_catalog.now() then
    raise exception 'FUTURE_TIMESTAMP: Client timestamp % is in the future (server time: %)', p_client_ts, pg_catalog.now()
      using errcode = 'P0002', detail = 'TIMESTAMP_IN_FUTURE';
  end if;

  -- Reject if older than 30 minutes
  if p_client_ts < (pg_catalog.now() - interval '30 minutes') then
    raise exception 'STALE_TIMESTAMP: Client timestamp % is older than 30 minutes (server time: %)', p_client_ts, pg_catalog.now()
      using errcode = 'P0003', detail = 'TIMESTAMP_TOO_OLD';
  end if;

  -- Effective report time for offline-queued reports
  v_report_time := least(p_client_ts, pg_catalog.now());

  -- 5. LPG price validation
  if p_category = 'lpg' then
    if p_price is not null and (p_price < 500 or p_price > 6000) then
      raise exception 'INVALID_LPG_PRICE: LPG cylinder price % BDT must be between 500 and 6000 BDT', p_price
        using errcode = 'P0005', detail = 'PRICE_OUT_OF_RANGE';
    end if;
  else
    if p_price is not null then
      raise exception 'PRICE_NOT_ALLOWED: Price reporting is strictly restricted to LPG category (received %)', p_category
        using errcode = 'P0006', detail = 'PRICE_FORBIDDEN_FOR_CATEGORY';
    end if;
  end if;

  -- 6. Reputation & Weight computation
  -- Look up user trust profile if authenticated
  if p_user is not null then
    select trust_score, tier
      into v_trust_score, v_tier
      from public.profiles
     where id = p_user;

    if not found then
      -- Auto-initialize default profile for registered auth user
      v_trust_score := 1.00;
      v_tier := 'anonymous'::public.trust_tier;
      insert into public.profiles (id, trust_score, tier, device_id_hash)
      values (p_user, v_trust_score, v_tier, p_device_hash)
      on conflict (id) do nothing;
    end if;
  end if;

  -- Tier multipliers: anonymous = 0.5, google = 1.0, phone = 1.5
  v_tier_mult := case v_tier
    when 'anonymous' then 0.50
    when 'google'    then 1.00
    when 'phone'     then 1.50
    else 0.50
  end;

  -- Weight formula: LEAST(trust_score * tier_multiplier, 2.0)
  -- The 2.0 cap guarantees no single user can ever meet the 3.0 confirmation threshold alone
  v_weight := least(pg_catalog.round((v_trust_score * v_tier_mult)::numeric, 2), 2.00);

  -- 7. Category-specific expiry calculation
  v_expires_at := case p_category
    when 'electricity' then v_report_time + interval '60 minutes'
    when 'gas'         then v_report_time + interval '90 minutes'
    when 'water'       then v_report_time + interval '90 minutes'
    when 'lpg'         then v_report_time + interval '240 minutes'
  end;

  -- 8. Insert raw report (Strict Privacy: zero GPS columns)
  insert into public.reports (
    user_id,
    device_id_hash,
    h3_index,
    category,
    state,
    price_bdt,
    weight,
    client_ts,
    received_at,
    expires_at
  ) values (
    p_user,
    p_device_hash,
    p_h3,
    p_category,
    p_state,
    p_price,
    v_weight,
    p_client_ts,
    pg_catalog.now(),
    v_expires_at
  );

  -- 9. Recompute consensus for this zone and category
  v_result := public.recompute_zone_category(p_h3, p_category);

  return v_result;
end;
$$;

comment on function public.submit_report is 'Validates and inserts a citizen report, then updates zone consensus.';

-- -----------------------------------------------------------------------------
-- Function 3: settle_trust_scores
-- -----------------------------------------------------------------------------
-- Executed periodically by pg_cron every 10 minutes.
-- Rules:
-- 1. Evaluates unsettled reports older than 20 minutes (received_at <= now() - 20 min).
-- 2. Compares report state to the zone consensus reached around that time.
-- 3. Confirmed consensus match: +0.05.
-- 4. Confirmed consensus contradiction: -0.15.
-- 5. Unconfirmed consensus ('unverified' or 'unknown'): 0.00 (no penalty/reward).
-- 6. Clamps user trust score strictly within [0.10, 3.00].
-- 7. Marks reports as settled (settled_at = now()) to prevent duplicate settlement.
-- 8. Trust is NEVER altered inside submit_report to prevent gaming.
-- -----------------------------------------------------------------------------
create or replace function public.settle_trust_scores()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settled_count int := 0;
  v_rec record;
  v_consensus_state public.zone_state;
  v_delta numeric(4, 2);
begin
  -- Temporary table to collect per-user deltas and settled report IDs
  drop table if exists temp_settlement_batch;
  create temporary table temp_settlement_batch (
    report_id uuid primary key,
    user_id uuid,
    delta numeric(4, 2)
  ) on commit drop;

  for v_rec in (
    select r.id, r.user_id, r.h3_index, r.category, r.state, r.received_at
    from public.reports r
    where r.settled_at is null
      and r.received_at <= (pg_catalog.now() - interval '20 minutes')
    order by r.received_at asc
    limit 1000 -- Batch size safety limit
  ) loop
    -- Determine the zone consensus at that time (using status_events at received_at + 20 min)
    select se.to_state
      into v_consensus_state
      from public.status_events se
     where se.h3_index = v_rec.h3_index
       and se.category = v_rec.category
       and se.at <= (v_rec.received_at + interval '20 minutes')
     order by se.at desc, se.id desc
     limit 1;

    -- If no event prior to that time, fall back to zone_category_status
    if v_consensus_state is null then
      select state
        into v_consensus_state
        from public.zone_category_status
       where h3_index = v_rec.h3_index and category = v_rec.category;
    end if;

    -- Evaluate reputation adjustment
    v_delta := 0.00;
    if v_consensus_state in ('ok'::public.zone_state, 'low'::public.zone_state, 'out'::public.zone_state) then
      if v_rec.state::text = v_consensus_state::text then
        v_delta := 0.05;  -- Accurately matched confirmed state
      else
        v_delta := -0.15; -- Contradicted confirmed consensus
      end if;
    end if;

    insert into temp_settlement_batch (report_id, user_id, delta)
    values (v_rec.id, v_rec.user_id, v_delta);
  end loop;

  -- Update profiles with aggregated deltas and clamp to [0.10, 3.00]
  update public.profiles p
  set trust_score = least(3.00, greatest(0.10, pg_catalog.round((p.trust_score + u.delta_sum)::numeric, 2))),
      updated_at = pg_catalog.now()
  from (
    select user_id, sum(delta) as delta_sum
    from temp_settlement_batch
    where user_id is not null and delta <> 0.00
    group by user_id
  ) u
  where p.id = u.user_id;

  -- Mark reports as settled
  update public.reports r
     set settled_at = pg_catalog.now()
    from temp_settlement_batch b
   where r.id = b.report_id;

  get diagnostics v_settled_count = row_count;
  return v_settled_count;
end;
$$;

comment on function public.settle_trust_scores is 'Periodically evaluates reports > 20m old against zone consensus and updates user trust scores.';

-- -----------------------------------------------------------------------------
-- Function 4: expire_and_rollup
-- -----------------------------------------------------------------------------
-- Executed periodically by pg_cron every 5 minutes.
-- Rules:
-- 1. Recompute only zones that have reports that just expired (expires_at <= now() and updated_at < expires_at).
-- 2. Roll up hourly statistics into zone_hourly_stats from status_events and reports.
-- 3. Delete raw individual reports older than 72 hours (Privacy Mandate ADR-0005).
-- -----------------------------------------------------------------------------
create or replace function public.expire_and_rollup()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rec record;
  v_purged_count int := 0;
  v_bucket_start timestamptz;
  v_bucket_end timestamptz;
  v_zone_rec record;
  v_min_out int;
  v_min_low int;
  v_reporters int;
  v_initial_state public.zone_state;
begin
  -- 1. Recompute only zones that have active status needing refresh due to report expiration
  for v_rec in (
    select distinct r.h3_index, r.category
    from public.reports r
    join public.zone_category_status zcs
      on zcs.h3_index = r.h3_index
     and zcs.category = r.category
    where r.expires_at <= pg_catalog.now()
      and zcs.updated_at < r.expires_at
  ) loop
    perform public.recompute_zone_category(v_rec.h3_index, v_rec.category);
  end loop;

  -- 2. Roll up previous hour statistics into zone_hourly_stats
  v_bucket_start := pg_catalog.date_trunc('hour', pg_catalog.now() - interval '1 hour');
  v_bucket_end := v_bucket_start + interval '1 hour';

  for v_zone_rec in (
    select distinct h3_index, category
    from public.zone_category_status
  ) loop
    -- Determine initial state at the start of the hour bucket
    select to_state
      into v_initial_state
      from public.status_events
     where h3_index = v_zone_rec.h3_index
       and category = v_zone_rec.category
       and at <= v_bucket_start
     order by at desc, id desc
     limit 1;

    if v_initial_state is null then
      select state
        into v_initial_state
        from public.zone_category_status
       where h3_index = v_zone_rec.h3_index and category = v_zone_rec.category;
    end if;

    -- Calculate durations in 'out' and 'low' states within the hour bucket [v_bucket_start, v_bucket_end]
    with events_in_hour as (
      select
        at as event_at,
        to_state as event_state
      from public.status_events
      where h3_index = v_zone_rec.h3_index
        and category = v_zone_rec.category
        and at >= v_bucket_start
        and at < v_bucket_end
      order by at asc
    ),
    timeline as (
      select
        event_at,
        event_state,
        coalesce(lead(event_at) over (), v_bucket_end) as next_at
      from (
        select v_bucket_start as event_at, v_initial_state as event_state
        union all
        select event_at, event_state from events_in_hour
      ) t
    )
    select
      least(60, greatest(0, coalesce(pg_catalog.round(sum(case when event_state = 'out'::public.zone_state then extract(epoch from (next_at - event_at)) / 60 else 0 end)), 0)::int)),
      least(60, greatest(0, coalesce(pg_catalog.round(sum(case when event_state = 'low'::public.zone_state then extract(epoch from (next_at - event_at)) / 60 else 0 end)), 0)::int))
    into v_min_out, v_min_low
    from timeline;

    -- Count distinct reporters who submitted reports during this hour bucket
    select count(distinct coalesce(user_id::text, device_id_hash))
      into v_reporters
      from public.reports
     where h3_index = v_zone_rec.h3_index
       and category = v_zone_rec.category
       and received_at >= v_bucket_start
       and received_at < v_bucket_end;

    -- Upsert into hourly aggregate table
    insert into public.zone_hourly_stats (
      h3_index,
      category,
      hour_bucket,
      minutes_out,
      minutes_low,
      distinct_reporters
    ) values (
      v_zone_rec.h3_index,
      v_zone_rec.category,
      v_bucket_start,
      v_min_out,
      v_min_low,
      coalesce(v_reporters, 0)
    )
    on conflict (h3_index, category, hour_bucket) do update set
      minutes_out = excluded.minutes_out,
      minutes_low = excluded.minutes_low,
      distinct_reporters = greatest(public.zone_hourly_stats.distinct_reporters, excluded.distinct_reporters);
  end loop;

  -- 3. Delete raw individual reports older than 72 hours (Privacy Mandate ADR-0005)
  delete from public.reports
  where received_at < (pg_catalog.now() - interval '72 hours');

  get diagnostics v_purged_count = row_count;
  return v_purged_count;
end;
$$;

comment on function public.expire_and_rollup is 'Recomputes zones with expired reports, aggregates hourly metrics, and purges reports older than 72 hours.';

-- -----------------------------------------------------------------------------
-- Function 5: get_zone_status
-- -----------------------------------------------------------------------------
-- The ONLY function anonymous and authenticated clients are permitted to execute.
-- Returns exactly the 4 category rows (electricity, gas, water, lpg) for a zone.
-- Privacy Guarantee: Contains absolutely NO user identifiers, device hashes, or timestamps.
-- -----------------------------------------------------------------------------
create or replace function public.get_zone_status(p_h3 text)
returns table (
  h3_index text,
  area_name_bn text,
  ward text,
  city text,
  category public.utility_category,
  state public.zone_state,
  distinct_reporters integer,
  weighted_score numeric,
  state_since timestamptz,
  updated_at timestamptz
)
language sql
security definer
stable
set search_path = ''
as $$
  select
    z.h3_index,
    z.area_name_bn,
    z.ward,
    z.city,
    c.category,
    coalesce(zcs.state, 'unknown'::public.zone_state) as state,
    coalesce(zcs.distinct_reporters, 0) as distinct_reporters,
    coalesce(zcs.weighted_score, 0.00) as weighted_score,
    coalesce(zcs.state_since, z.created_at) as state_since,
    coalesce(zcs.updated_at, z.created_at) as updated_at
  from public.zones z
  cross join (
    values
      ('electricity'::public.utility_category),
      ('gas'::public.utility_category),
      ('water'::public.utility_category),
      ('lpg'::public.utility_category)
  ) as c(category)
  left join public.zone_category_status zcs
    on zcs.h3_index = z.h3_index
   and zcs.category = c.category
  where z.h3_index = p_h3
  order by
    case c.category
      when 'electricity' then 1
      when 'gas'         then 2
      when 'water'       then 3
      when 'lpg'         then 4
    end;
$$;

comment on function public.get_zone_status is 'Public read-only API returning status of the 4 utility categories for an H3 zone. Exposes no user data.';
