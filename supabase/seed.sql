-- =============================================================================
-- Seed Data for Halchal (হালচাল) Local Development / Reset
-- =============================================================================

insert into public.zones (h3_index, area_name_bn, ward, city)
values
  ('883cf10ca1fffff', 'ধানমন্ডি', 'ওয়ার্ড ১৫', 'ঢাকা'),
  ('883cf10eb1fffff', 'মিরপুর ১০', 'ওয়ার্ড ১৪', 'ঢাকা'),
  ('883cf10c93fffff', 'গুলশান ১', 'ওয়ার্ড ১৯', 'ঢাকা'),
  ('883cf13b27fffff', 'গুলশান ২', 'ওয়ার্ড ১৮', 'ঢাকা'),
  ('883cf13b25fffff', 'বনানী', 'ওয়ার্ড ১৯', 'ঢাকা'),
  ('883cf10583fffff', 'উত্তরা সেক্টর ৩', 'ওয়ার্ড ১', 'ঢাকা'),
  ('883cf10cebfffff', 'মোহাম্মদপুর', 'ওয়ার্ড ৩১', 'ঢাকা'),
  ('883cf10cbdfffff', 'ফার্মগেট', 'ওয়ার্ড ২৬', 'ঢাকা'),
  ('883cf13941fffff', 'বাড্ডা', 'ওয়ার্ড ২১', 'ঢাকা'),
  ('883cf1766bfffff', 'লালবাগ', 'ওয়ার্ড ২৪', 'ঢাকা')
on conflict (h3_index) do update set
  area_name_bn = excluded.area_name_bn,
  ward = excluded.ward,
  city = excluded.city;

insert into public.official_prices (item, price_bdt, effective_from, source_url)
values (
  'BERC ১২ কেজি এলপিজি সরকারি নির্ধারিত ভোক্তা মূল্য',
  1455.00,
  '2026-11-01',
  'https://berc.org.bd'
)
on conflict do nothing;
