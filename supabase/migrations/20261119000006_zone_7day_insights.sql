-- =============================================================================
-- Migration: 20261119000006_zone_7day_insights.sql
-- Description: 7-day community reliability insights powered by zone_hourly_stats
--              and status_events (confirmed intervals only, no raw reports).
-- Security: Anon-callable, read-only, SECURITY DEFINER, privacy-preserving.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Helper Functions for Bengali Typography and Formatting
-- -----------------------------------------------------------------------------

create or replace function public.to_bengali_digits(p_val text)
returns text
language sql
immutable
as $$
  select replace(
    replace(
      replace(
        replace(
          replace(
            replace(
              replace(
                replace(
                  replace(
                    replace(p_val, '0', '০'),
                    '1', '১'),
                  '2', '২'),
                '3', '৩'),
              '4', '৪'),
            '5', '৫'),
          '6', '৬'),
        '7', '৭'),
      '8', '৮'),
    '9', '৯');
$$;

comment on function public.to_bengali_digits is 'Converts Western digits 0-9 to Bengali digits ০-৯.';

create or replace function public.format_hour_bn(p_hour int)
returns text
language sql
immutable
as $$
  select case (p_hour % 24)
    when 0 then 'রাত ১২টা'
    when 1 then 'রাত ১টা'
    when 2 then 'রাত ২টা'
    when 3 then 'রাত ৩টা'
    when 4 then 'ভোর ৪টা'
    when 5 then 'ভোর ৫টা'
    when 6 then 'সকাল ৬টা'
    when 7 then 'সকাল ৭টা'
    when 8 then 'সকাল ৮টা'
    when 9 then 'সকাল ৯টা'
    when 10 then 'সকাল ১০টা'
    when 11 then 'সকাল ১১টা'
    when 12 then 'দুপুর ১২টা'
    when 13 then 'দুপুর ১টা'
    when 14 then 'দুপুর ২টা'
    when 15 then 'দুপুর ৩টা'
    when 16 then 'বিকাল ৪টা'
    when 17 then 'বিকাল ৫টা'
    when 18 then 'সন্ধ্যা ৬টা'
    when 19 then 'সন্ধ্যা ৭টা'
    when 20 then 'রাত ৮টা'
    when 21 then 'রাত ৯টা'
    when 22 then 'রাত ১০টা'
    when 23 then 'রাত ১১টা'
    else ''
  end;
$$;

comment on function public.format_hour_bn is 'Formats an hour of day (0-23) into standard colloquial Bengali time.';

-- -----------------------------------------------------------------------------
-- 2. Core RPC Function: get_zone_7day_insights
-- -----------------------------------------------------------------------------
create or replace function public.get_zone_7day_insights(p_h3 text)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_zone record;
  v_now timestamptz := pg_catalog.now();
  v_start_7d timestamptz := v_now - interval '7 days';

  v_distinct_days int := 0;
  v_total_reporters int := 0;
  v_confidence text := 'insufficient';

  -- Categories
  v_categories jsonb := '{}'::jsonb;
  v_cat public.utility_category;

  -- Per-category loop variables
  v_initial_state public.zone_state;
  v_total_outage_min int;
  v_outage_events int;
  v_hourly_pattern numeric[];
  v_heatmap jsonb;
  v_cat_insight text;

  -- Pattern recognition
  v_h int;
  v_day_idx int;
  v_cur_day date;
  v_prob_days int;
  v_max_prob_share numeric;
  v_peak_start_h int;
  v_peak_end_h int;
  v_cur_streak_start int;
  v_cur_streak_len int;
  v_max_streak_start int;
  v_max_streak_len int;

  -- LPG pricing
  v_lpg_count int := 0;
  v_lpg_median numeric := null;
  v_official_price numeric := null;
  v_official_date date := null;
  v_lpg_obj jsonb := null;

  -- Primary Zone Insight
  v_zone_insight text;
begin
  -- 1. Validate Zone Existence
  select h3_index, area_name_bn, ward, city
  into v_zone
  from public.zones
  where h3_index = p_h3;

  if not found then
    return jsonb_build_object(
      'error', 'ZONE_NOT_FOUND',
      'message', 'Zone not found'
    );
  end if;

  -- 2. Determine Data Confidence:
  -- 'insufficient' if the zone had confirmed data on fewer than 3 distinct days
  -- or fewer than 10 distinct reporters in total, otherwise 'ok'.
  with days_with_data as (
    select distinct ((hour_bucket at time zone 'Asia/Dhaka')::date) as day_dt
    from public.zone_hourly_stats
    where h3_index = p_h3
      and hour_bucket >= v_start_7d
      and hour_bucket <= v_now
      and (minutes_out > 0 or minutes_low > 0 or distinct_reporters > 0)
    union
    select distinct ((at at time zone 'Asia/Dhaka')::date) as day_dt
    from public.status_events
    where h3_index = p_h3
      and at >= v_start_7d
      and at <= v_now
  )
  select coalesce(count(*), 0) into v_distinct_days from days_with_data;

  select coalesce(sum(distinct_reporters), 0)
  into v_total_reporters
  from public.zone_hourly_stats
  where h3_index = p_h3
    and hour_bucket >= v_start_7d
    and hour_bucket <= v_now;

  -- Allow recent reports to contribute to reporter count if rollup has not yet occurred
  v_total_reporters := greatest(
    v_total_reporters,
    (
      select coalesce(count(distinct coalesce(user_id::text, device_id_hash)), 0)
      from public.reports
      where h3_index = p_h3
        and received_at >= v_start_7d
    )
  );

  if v_distinct_days >= 3 and v_total_reporters >= 10 then
    v_confidence := 'ok';
  else
    v_confidence := 'insufficient';
  end if;

  -- 3. LPG Price: Area median reported price and official price, ONLY if >= 5 reports; otherwise null.
  select
    coalesce(count(*), 0),
    percentile_cont(0.5) within group (order by price_bdt)
  into v_lpg_count, v_lpg_median
  from public.reports
  where h3_index = p_h3
    and category = 'lpg'
    and price_bdt is not null
    and received_at >= v_start_7d;

  if v_lpg_count >= 5 then
    select price_bdt, effective_from
    into v_official_price, v_official_date
    from public.official_prices
    order by effective_from desc, created_at desc
    limit 1;

    v_lpg_obj := jsonb_build_object(
      'area_median', round(v_lpg_median, 2),
      'official_price', v_official_price,
      'official_effective_from', v_official_date,
      'report_count', v_lpg_count
    );
  else
    v_lpg_obj := null;
  end if;

  -- 4. Process each of the 4 utility categories
  for v_cat in select unnest(enum_range(null::public.utility_category)) loop
    -- A. Calculate total_outage_minutes and outage_event_count from confirmed 'out' intervals
    -- Initial state at start of 7-day window
    select to_state
    into v_initial_state
    from public.status_events
    where h3_index = p_h3
      and category = v_cat
      and at <= v_start_7d
    order by at desc, id desc
    limit 1;

    if v_initial_state is null then
      select state
      into v_initial_state
      from public.zone_category_status
      where h3_index = p_h3 and category = v_cat;
    end if;

    -- Outage intervals timeline within [v_start_7d, v_now]
    with ordered_events as (
      select v_start_7d as event_at, coalesce(v_initial_state, 'unknown'::public.zone_state) as event_state
      union all
      select at as event_at, to_state as event_state
      from public.status_events
      where h3_index = p_h3
        and category = v_cat
        and at > v_start_7d
        and at <= v_now
    ),
    timeline as (
      select
        event_at,
        event_state,
        coalesce(lead(event_at) over (order by event_at), v_now) as next_at
      from ordered_events
    )
    select
      coalesce(round(sum(extract(epoch from (next_at - event_at)) / 60))::int, 0)
    into v_total_outage_min
    from timeline
    where event_state = 'out';

    -- Count distinct outage events (transitions to 'out', plus 1 if period began in 'out')
    select coalesce(count(*), 0)
    into v_outage_events
    from public.status_events
    where h3_index = p_h3
      and category = v_cat
      and at > v_start_7d
      and at <= v_now
      and to_state = 'out';

    if v_initial_state = 'out' then
      v_outage_events := v_outage_events + 1;
    end if;

    -- Augment from zone_hourly_stats if status_events were pre-aggregated
    declare
      v_stats_out_minutes int := 0;
    begin
      select coalesce(sum(minutes_out), 0)
      into v_stats_out_minutes
      from public.zone_hourly_stats
      where h3_index = p_h3
        and category = v_cat
        and hour_bucket >= v_start_7d
        and hour_bucket <= v_now;

      if v_stats_out_minutes > v_total_outage_min then
        v_total_outage_min := v_stats_out_minutes;
      end if;

      if v_outage_events = 0 and v_total_outage_min > 0 then
        v_outage_events := 1;
      end if;
    end;

    -- B. Compute hourly_pattern: 24 values = share of last 7 days in which that hour had outage/low
    v_hourly_pattern := array[]::numeric[];
    v_max_prob_share := 0;
    v_peak_start_h := 0;
    v_peak_end_h := 0;
    v_cur_streak_start := -1;
    v_cur_streak_len := 0;
    v_max_streak_start := -1;
    v_max_streak_len := 0;

    for v_h in 0..23 loop
      -- Count how many of the 7 days had minutes_out > 0 or minutes_low > 0 at hour v_h
      select count(distinct (hour_bucket at time zone 'Asia/Dhaka')::date)
      into v_prob_days
      from public.zone_hourly_stats
      where h3_index = p_h3
        and category = v_cat
        and hour_bucket >= v_start_7d
        and hour_bucket <= v_now
        and extract(hour from hour_bucket at time zone 'Asia/Dhaka') = v_h
        and (minutes_out > 0 or minutes_low > 0);

      -- Check status_events if zone_hourly_stats lacks current-day coverage
      if v_prob_days = 0 then
        select count(distinct (at at time zone 'Asia/Dhaka')::date)
        into v_prob_days
        from public.status_events
        where h3_index = p_h3
          and category = v_cat
          and at >= v_start_7d
          and at <= v_now
          and extract(hour from at at time zone 'Asia/Dhaka') = v_h
          and to_state in ('out', 'low');
      end if;

      declare
        v_share numeric := round((least(7, v_prob_days)::numeric / 7.0), 2);
      begin
        v_hourly_pattern := array_append(v_hourly_pattern, v_share);

        -- Track peak streak of problem hours (threshold: share >= 0.40, i.e. >= 3 of 7 days)
        if v_share >= 0.40 then
          if v_cur_streak_start = -1 then
            v_cur_streak_start := v_h;
            v_cur_streak_len := 1;
          else
            v_cur_streak_len := v_cur_streak_len + 1;
          end if;

          if v_cur_streak_len > v_max_streak_len then
            v_max_streak_len := v_cur_streak_len;
            v_max_streak_start := v_cur_streak_start;
          end if;
        else
          v_cur_streak_start := -1;
          v_cur_streak_len := 0;
        end if;
      end;
    end loop;

    -- C. Build Heatmap: 7 rows (days) x 6 columns (4-hour blocks)
    -- Block 0: 00-04, Block 1: 04-08, Block 2: 08-12, Block 3: 12-16, Block 4: 16-20, Block 5: 20-24
    v_heatmap := '[]'::jsonb;
    for v_day_idx in 0..6 loop
      v_cur_day := ((v_now - (v_day_idx || ' days')::interval) at time zone 'Asia/Dhaka')::date;

      declare
        v_day_blocks jsonb := '[]'::jsonb;
        v_block_idx int;
        v_block_start_h int;
        v_block_end_h int;
        v_b_out int;
        v_b_low int;
        v_b_rep int;
        v_cell_state text;
        v_day_name_bn text;
      begin
        v_day_name_bn := case extract(dow from v_cur_day)::int
          when 0 then 'রবিবার'
          when 1 then 'সোমবার'
          when 2 then 'মঙ্গলবার'
          when 3 then 'বুধবার'
          when 4 then 'বৃহস্পতিবার'
          when 5 then 'শুক্রবার'
          when 6 then 'শনিবার'
        end;

        for v_block_idx in 0..5 loop
          v_block_start_h := v_block_idx * 4;
          v_block_end_h := v_block_start_h + 3;

          select
            coalesce(sum(minutes_out), 0),
            coalesce(sum(minutes_low), 0),
            coalesce(sum(distinct_reporters), 0)
          into v_b_out, v_b_low, v_b_rep
          from public.zone_hourly_stats
          where h3_index = p_h3
            and category = v_cat
            and (hour_bucket at time zone 'Asia/Dhaka')::date = v_cur_day
            and extract(hour from hour_bucket at time zone 'Asia/Dhaka') between v_block_start_h and v_block_end_h;

          -- Also check status_events on that day for block if stats missing
          if v_b_out = 0 and v_b_low = 0 then
            select
              case when exists (
                select 1 from public.status_events
                where h3_index = p_h3 and category = v_cat
                  and (at at time zone 'Asia/Dhaka')::date = v_cur_day
                  and extract(hour from at at time zone 'Asia/Dhaka') between v_block_start_h and v_block_end_h
                  and to_state = 'out'
              ) then 60 else 0 end,
              case when exists (
                select 1 from public.status_events
                where h3_index = p_h3 and category = v_cat
                  and (at at time zone 'Asia/Dhaka')::date = v_cur_day
                  and extract(hour from at at time zone 'Asia/Dhaka') between v_block_start_h and v_block_end_h
                  and to_state = 'low'
              ) then 60 else 0 end
            into v_b_out, v_b_low;
          end if;

          if v_b_out > 0 then
            v_cell_state := 'out';
          elsif v_b_low > 0 then
            v_cell_state := 'low';
          elsif v_b_rep > 0 then
            v_cell_state := 'ok';
          else
            v_cell_state := 'unknown';
          end if;

          v_day_blocks := v_day_blocks || jsonb_build_object(
            'block_index', v_block_idx,
            'hours_label_bn', public.format_hour_bn(v_block_start_h) || ' - ' || public.format_hour_bn((v_block_end_h + 1) % 24),
            'start_hour', v_block_start_h,
            'end_hour', v_block_end_h,
            'state', v_cell_state,
            'minutes_out', v_b_out,
            'minutes_low', v_b_low
          );
        end loop;

        v_heatmap := v_heatmap || jsonb_build_object(
          'date', v_cur_day,
          'day_name_bn', v_day_name_bn,
          'blocks', v_day_blocks
        );
      end;
    end loop;

    -- D. Deterministic Bengali Template for Category Insight
    if v_confidence = 'insufficient' then
      v_cat_insight := 'এখনো পর্যাপ্ত তথ্য নেই (কমপক্ষে ৩ দিনের রিপোর্ট লাগবে)।';
    else
      if v_max_streak_len >= 2 then
        declare
          v_start_str text := public.format_hour_bn(v_max_streak_start);
          v_end_h int := (v_max_streak_start + v_max_streak_len) % 24;
          v_end_str text := public.format_hour_bn(v_end_h);
          v_range_suffix text;
        begin
          if right(v_end_str, 2) = 'টা' then
            v_range_suffix := v_end_str || 'র';
          else
            v_range_suffix := v_end_str;
          end if;

          if v_cat = 'gas' then
            v_cat_insight := 'এই এলাকায় সাধারণত ' || v_start_str || ' থেকে ' || v_range_suffix || ' মধ্যে গ্যাসের চাপ কম থাকে।';
          elsif v_cat = 'electricity' then
            v_cat_insight := 'এই এলাকায় সাধারণত ' || v_start_str || ' থেকে ' || v_range_suffix || ' মধ্যে বিদ্যুৎ বিভ্রাট বেশি হয়।';
          elsif v_cat = 'water' then
            v_cat_insight := 'এই এলাকায় সাধারণত ' || v_start_str || ' থেকে ' || v_range_suffix || ' মধ্যে পানির চাপ কম থাকে।';
          else
            v_cat_insight := 'এই এলাকায় সাধারণত ' || v_start_str || ' থেকে ' || v_range_suffix || ' মধ্যে সমস্যা বেশি রিপোর্ট হয়।';
          end if;
        end;
      elsif v_cat = 'electricity' and v_outage_events > 0 then
        declare
          v_hours_rounded int := greatest(1, round(v_total_outage_min::numeric / 60.0)::int);
        begin
          v_cat_insight := 'এই সপ্তাহে ' || public.to_bengali_digits(v_outage_events::text) || ' বার কারেন্ট গেছে • মোট ' || public.to_bengali_digits(v_hours_rounded::text) || ' ঘণ্টা।';
        end;
      elsif v_cat = 'gas' and v_total_outage_min > 0 then
        v_cat_insight := 'এই সপ্তাহে মাঝে মাঝে গ্যাসের সমস্যা দেখা গেছে।';
      elsif v_cat = 'lpg' and v_lpg_obj is not null then
        v_cat_insight := 'এই এলাকায় ১২ কেজি এলপিজির বর্তমান গড় বাজারদর ৳ ' || public.to_bengali_digits(round(v_lpg_median)::text) || '।';
      else
        v_cat_insight := 'এই সপ্তাহে ইউটিলিটি পরিষেবা অধিকাংশ সময় স্বাভাবিক ছিল।';
      end if;
    end if;

    -- Store category metrics
    v_categories := v_categories || jsonb_build_object(
      v_cat::text,
      jsonb_build_object(
        'category', v_cat::text,
        'total_outage_minutes', v_total_outage_min,
        'outage_event_count', v_outage_events,
        'hourly_pattern', to_jsonb(v_hourly_pattern),
        'heatmap', v_heatmap,
        'insight_bn', v_cat_insight
      )
    );
  end loop;

  -- 5. Primary Zone Insight: Prioritizes significant gas low pressure pattern or electricity outage
  if v_confidence = 'insufficient' then
    v_zone_insight := 'এখনো পর্যাপ্ত তথ্য নেই (কমপক্ষে ৩ দিনের রিপোর্ট লাগবে)।';
  else
    if (v_categories->'gas'->>'insight_bn') like '%গ্যাসের চাপ কম থাকে%' then
      v_zone_insight := v_categories->'gas'->>'insight_bn';
    elsif (v_categories->'electricity'->>'insight_bn') like '%বিদ্যুৎ বিভ্রাট বেশি হয়%' then
      v_zone_insight := v_categories->'electricity'->>'insight_bn';
    elsif (v_categories->'electricity'->>'outage_event_count')::int > 0 then
      v_zone_insight := v_categories->'electricity'->>'insight_bn';
    else
      v_zone_insight := 'এই সপ্তাহে এলাকার ইউটিলিটি পরিষেবা অধিকাংশ সময় স্বাভাবিক ছিল।';
    end if;
  end if;

  return jsonb_build_object(
    'h3_index', v_zone.h3_index,
    'area_name_bn', v_zone.area_name_bn,
    'ward', v_zone.ward,
    'city', v_zone.city,
    'data_confidence', v_confidence,
    'distinct_days', v_distinct_days,
    'total_reporters', v_total_reporters,
    'categories', v_categories,
    'lpg_price', v_lpg_obj,
    'insight_bn', v_zone_insight,
    'generated_at', v_now
  );
end;
$$;

comment on function public.get_zone_7day_insights is '7-day historical insights for an H3 zone computed from zone_hourly_stats and status_events. Anonymized and privacy-compliant.';

-- -----------------------------------------------------------------------------
-- 3. Security and Privileges (Principle of Least Privilege)
-- -----------------------------------------------------------------------------
revoke all on function public.get_zone_7day_insights(text) from public;
grant execute on function public.get_zone_7day_insights(text) to anon, authenticated, service_role;
