# Halchal (হালচাল) — Database Migration Rollback Guide

> **SRE Guideline:** Reversible Schema Migrations, Down-Scripts, and Zero-Downtime Rollbacks  
> **Repository Path:** `supabase/migrations/`  
> **Last Updated:** 2026-11-19

---

## 1. Migration Rollback Philosophy

1. **Sequential Backward Execution:** Rollbacks must be executed in strictly reverse chronological order (`000007` -> `000006` -> ... -> `000001`).
2. **Explicit Foreign Key Cascades:** Tables and views depending on parent records must be dropped or unlinked before altering parent definitions.
3. **Enum Safety:** In PostgreSQL, dropping an enum value used in table columns is prohibited. Down-scripts must drop the dependent columns or tables first before dropping enum types.
4. **Service Role Authorization:** Migration rollbacks must only be performed by authorized SRE engineers using the Supabase Service Role or direct Postgres administrative connection.

---

## 2. Down-Migration SQL Scripts

### Rollback: `20261119000007_user_account_deletion_and_admin_metrics.sql`
```sql
-- Down-script: Roll back account deletion & admin metrics
revoke execute on function public.get_admin_metrics() from service_role;
drop function if exists public.get_admin_metrics();

revoke execute on function public.delete_user_account(uuid) from service_role;
drop function if exists public.delete_user_account(uuid);
```

### Rollback: `20261119000006_zone_7day_insights.sql`
```sql
-- Down-script: Roll back 7-day insights and complaint card aggregation
drop function if exists public.get_zone_7day_insights(text);
```

### Rollback: `20261119000005_notification_system.sql`
```sql
-- Down-script: Roll back notification triggers, pg_net webhooks, and push subscription enhancements
drop trigger if exists trg_status_events_notify on public.status_events;
drop function if exists public.trg_status_events_notify();
drop function if exists public.upsert_push_subscription(text, text, jsonb, text[], text[], boolean, text, uuid);

drop index if exists public.idx_push_subscriptions_device_id;
drop index if exists public.idx_push_subscriptions_categories;

alter table public.push_subscriptions
  drop column if exists device_id,
  drop column if exists quiet_hours_end,
  drop column if exists quiet_hours_start,
  drop column if exists allow_night_alerts,
  drop column if exists categories;
```

### Rollback: `20261119000004_seed_dhaka_zones.sql`
```sql
-- Down-script: Clean up seeded Dhaka zones
delete from public.zones
where h3_index in (
  '883cf10ca1fffff', '883cf10eb1fffff', '883cf10c93fffff', '883cf13b27fffff',
  '883cf13b25fffff', '883cf10583fffff', '883cf10cebfffff', '883cf10cbdfffff',
  '883cf13941fffff', '883cf1766bfffff', '883cf13b21fffff'
);
```

### Rollback: `20261119000003_create_rls_and_cron.sql`
```sql
-- Down-script: Unscheduele pg_cron jobs and drop RLS policies
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('halchal-settle-trust-scores')
      where exists (select 1 from cron.job where jobname = 'halchal-settle-trust-scores');
    perform cron.unschedule('halchal-expire-and-rollup')
      where exists (select 1 from cron.job where jobname = 'halchal-expire-and-rollup');
  end if;
end;
$$;

drop policy if exists "Allow public select on zones" on public.zones;
```

### Rollback: `20261119000002_create_functions.sql`
```sql
-- Down-script: Drop consensus, settlement, and read functions
drop function if exists public.get_zone_status(text);
drop function if exists public.expire_and_rollup();
drop function if exists public.settle_trust_scores();
drop function if exists public.submit_report(uuid, text, text, public.utility_category, public.report_state, numeric, timestamptz);
drop function if exists public.recompute_zone_category(text, public.utility_category);
```

### Rollback: `20261119000001_create_extensions_enums_and_tables.sql`
```sql
-- Down-script: Drop tables in reverse foreign key order, triggers, and enums
drop trigger if exists trg_after_insert_zone_init_status on public.zones;
drop function if exists public.trg_init_zone_category_status();

drop table if exists public.official_prices cascade;
drop table if exists public.zone_hourly_stats cascade;
drop table if exists public.status_events cascade;
drop table if exists public.zone_category_status cascade;
drop table if exists public.reports cascade;
drop table if exists public.push_subscriptions cascade;
drop table if exists public.profiles cascade;
drop table if exists public.zones cascade;

drop type if exists public.trust_tier;
drop type if exists public.zone_state;
drop type if exists public.report_state;
drop type if exists public.utility_category;
```

---

## 3. Post-Rollback Verification Checklist

After executing any rollback:
1. Run `supabase db lint` to check for broken dependencies.
2. Verify that `get_zone_status` executes without missing function or table errors.
3. Verify that zero orphaned triggers or cron jobs remain running.
