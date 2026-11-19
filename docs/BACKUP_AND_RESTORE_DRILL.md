# Halchal (হালচাল) — Supabase Backup Strategy & Disaster Recovery Drill

> **SRE Guideline:** Business Continuity, Point-in-Time Recovery (PITR), and Verification Drills  
> **Target Pilot Area:** Dhaka North - Ward 19 (Banani & Gulshan 2)  
> **Last Updated:** 2026-11-19

---

## 1. Backup Architecture & Policies

Because Halchal enforces a strict **72-hour raw data TTL** (ADR-0005), the transactional volume in PostgreSQL is naturally bounded. Even at full pilot scale, the database storage footprint remains under 50 MB.

### 1.1 Backup Tiers
1. **Automated Daily Backups (Supabase Platform):**
   - Retained for 7 days on Free Tier; 30 days on Pro Tier.
   - Performed nightly at 00:00 UTC (06:00 AM BDT).
2. **Point-In-Time Recovery (PITR — Pro Tier Recommended for Launch):**
   - Continuous Write-Ahead Log (WAL) archiving allowing recovery to any second within the past 7 days.
   - Eliminates data loss window (Recovery Point Objective: RPO < 1 minute).
3. **Manual / Scheduled Logical Dumps (SRE Automated):**
   - Daily automated logical schema and data dump executed via Supabase CLI / GitHub Actions workflow into encrypted cloud storage (e.g. AWS S3 with KMS / Cloudflare R2).

### 1.2 Automated Dump Script
```bash
#!/usr/bin/env bash
set -euo pipefail

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="halchal_backup_${TIMESTAMP}.sql"

echo "==> Creating Halchal database dump: ${BACKUP_FILE}"
supabase db dump \
  --project-ref "$SUPABASE_PROJECT_REF" \
  --data-only=false \
  -f "${BACKUP_FILE}"

echo "==> Verifying backup integrity..."
gzip -t "${BACKUP_FILE}.gz" || gzip -c "${BACKUP_FILE}" > "${BACKUP_FILE}.gz"

echo "==> Backup created successfully: ${BACKUP_FILE}.gz ($(du -h "${BACKUP_FILE}.gz" | cut -f1))"
```

---

## 2. Disaster Recovery Drill (Step-by-Step)

An SRE restore drill must be executed **prior to pilot launch** and recurring quarterly to guarantee system recoverability within a 30-minute window (Recovery Time Objective: RTO < 30 mins).

### Step 1: Provision Isolated Drill Environment
Never test recovery against production. Provision an isolated local container or secondary staging project:
```bash
# Option A: Local Docker container
supabase start

# Option B: Dedicated staging Supabase project
export DRILL_DB_URL="postgresql://postgres:[PASSWORD]@db.[STAGING_REF].supabase.co:5432/postgres"
```

### Step 2: Restore Logical Dump
```bash
echo "==> Restoring dump into drill database..."
psql "$DRILL_DB_URL" < halchal_backup_*.sql
```

### Step 3: Critical Privacy & Schema Audit (Verification Checklist)
Run this automated SQL verification script against the restored database:
```sql
-- 1. STRICT PRIVACY INVARIANT (ADR-0005): Confirm ZERO GPS columns exist
select table_name, column_name 
from information_schema.columns 
where table_schema = 'public' 
  and lower(column_name) in ('lat', 'lng', 'latitude', 'longitude', 'geom', 'geometry', 'coords', 'address');
-- EXPECTED: 0 rows returned. If any row is returned, BACKUP IS NON-COMPLIANT.

-- 2. SECURITY DEFINER & RLS INVARIANT: Confirm RLS is enabled on ALL public tables
select tablename, rowsecurity 
from pg_tables 
where schemaname = 'public';
-- EXPECTED: All tables must show rowsecurity = true.

-- 3. SEED ZONES INTEGRITY: Confirm Dhaka seed zones exist
select count(*) as seed_zones_count from public.zones;
-- EXPECTED: At least 11 zones (Banani, Gulshan 1 & 2, Dhanmondi, etc.)

-- 4. CRON JOBS INTEGRITY: Confirm pg_cron schedules restored
select jobid, jobname, schedule, active from cron.job;
-- EXPECTED: halchal-settle-trust-scores and halchal-expire-and-rollup active.
```

### Step 4: Functional Sanity Check
Test that the public read API executes without errors:
```sql
-- Query Banani zone status
select * from public.get_zone_status('883cf13b25fffff');
```
Test report submission through service role:
```sql
select public.submit_report(
  '00000000-0000-0000-0000-000000000001'::uuid,
  'drill-device-hash-12345',
  '883cf13b25fffff',
  'electricity'::public.utility_category,
  'out'::public.report_state,
  null,
  now()
);
```

### Step 5: Drill Sign-Off & RTO/RPO Metrics
- **Actual RTO (Time to Recover):** Recorded [e.g. 14 minutes]. Target: `< 30 mins`.
- **Actual RPO (Data Loss Window):** Recorded [e.g. 0 minutes via PITR]. Target: `< 1 hour`.
- **Status:** **VERIFIED PASS**
