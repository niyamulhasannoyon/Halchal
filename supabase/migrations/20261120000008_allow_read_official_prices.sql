-- =============================================================================
-- Migration 08: Allow public read access to official_prices benchmark table
-- Architecture: ADR-0017 / Evergreen Content Layer
-- =============================================================================

-- 1. Grant read permissions on official benchmark table to anon and authenticated
grant select on table public.official_prices to anon, authenticated;

-- 2. Add RLS policy for select
create policy "Allow public read access to official_prices"
  on public.official_prices
  for select
  to anon, authenticated
  using (true);

-- 3. Dedicated RPC to fetch latest official benchmark price
create or replace function public.get_latest_official_price(p_item text default null)
returns table (
  id uuid,
  item text,
  price_bdt numeric,
  effective_from date,
  source_url text,
  created_at timestamptz
)
language sql
stable
security definer
as $$
  select id, item, price_bdt, effective_from, source_url, created_at
  from public.official_prices
  where (p_item is null or item ilike '%' || p_item || '%')
  order by effective_from desc, created_at desc
  limit 1;
$$;

comment on function public.get_latest_official_price(text) is 'Fetches the most recent official regulatory price benchmark.';

grant execute on function public.get_latest_official_price(text) to anon, authenticated, service_role;
