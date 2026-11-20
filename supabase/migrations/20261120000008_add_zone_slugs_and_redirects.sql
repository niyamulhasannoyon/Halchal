-- =============================================================================
-- Migration: 20261120000008_add_zone_slugs_and_redirects.sql
-- Description: Adds URL slugs to zones table and creates slug_redirects
--              for permanent 301 redirect management.
-- Architecture: ADR-0017, Human-Readable Area URL Architecture
-- =============================================================================

-- 1. Add slug column to public.zones
alter table public.zones
add column if not exists slug text;

-- Add check constraint ensuring URL-safe Latin transliterated slugs
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'zones_slug_format'
  ) then
    alter table public.zones
    add constraint zones_slug_format check (slug is null or slug ~* '^[a-z0-9]+(-[a-z0-9]+)*$');
  end if;
end;
$$;

-- Create index for high-speed slug lookups by city
create index if not exists zones_city_slug_idx
on public.zones (lower(city), lower(slug));

-- 2. Populate pilot Dhaka zone slugs
update public.zones set slug = 'dhanmondi' where h3_index = '883cf10ca1fffff';
update public.zones set slug = 'mirpur-10' where h3_index = '883cf10eb1fffff';
update public.zones set slug = 'gulshan-1' where h3_index = '883cf10c93fffff';
update public.zones set slug = 'gulshan-2' where h3_index = '883cf13b27fffff';
update public.zones set slug = 'banani' where h3_index = '883cf13b25fffff';
update public.zones set slug = 'uttara-sector-3' where h3_index = '883cf10583fffff';
update public.zones set slug = 'mohammadpur' where h3_index = '883cf10cebfffff';
update public.zones set slug = 'farmgate' where h3_index = '883cf10cbdfffff';
update public.zones set slug = 'badda' where h3_index = '883cf13941fffff';
update public.zones set slug = 'lalbagh' where h3_index = '883cf1766bfffff';

comment on column public.zones.slug is 'URL-safe Latin transliterated slug for search-engine friendly URLs (e.g. mohammadpur, dhanmondi).';

-- 3. Create slug_redirects table for 301 redirect tracking on slug migrations
create table if not exists public.slug_redirects (
  id uuid primary key default gen_random_uuid(),
  city text not null default 'dhaka',
  old_slug text not null,
  new_slug text not null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint slug_redirects_unique unique (lower(city), lower(old_slug))
);

comment on table public.slug_redirects is 'Tracks retired or legacy area slugs to issue HTTP 301 Permanent Redirects.';

-- Enable RLS on slug_redirects
alter table public.slug_redirects enable row level security;

-- Allow public read access to slug_redirects
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'slug_redirects_select_public' and tablename = 'slug_redirects'
  ) then
    create policy slug_redirects_select_public
      on public.slug_redirects
      for select
      to anon, authenticated
      using (true);
  end if;
end;
$$;

-- Seed legacy alias redirects
insert into public.slug_redirects (city, old_slug, new_slug)
values
  ('dhaka', 'mirpur', 'mirpur-10'),
  ('dhaka', 'gulshan', 'gulshan-1'),
  ('dhaka', 'uttara', 'uttara-sector-3')
on conflict (lower(city), lower(old_slug)) do update
set new_slug = excluded.new_slug;
