# Halchal (হালচাল) — SRE Incident Response Runbook

> **Scope:** Production Operations, SRE On-Call, and DevSecOps Procedures  
> **Target Environment:** Halchal Pilot Launch (Dhaka North - Ward 19: Banani & Gulshan 2)  
> **Last Updated:** 2026-11-19

---

## 1. Incident Severity Classification

| Severity | Definition | Target MTTA | Target MTTR | Examples |
| :--- | :--- | :--- | :--- | :--- |
| **SEV-1 (Critical)** | Core service unavailable; database down; data corruption; security breach. | `< 5 mins` | `< 30 mins` | PostgreSQL down; API 500 error rate > 5%; Sybil attack successfully flips status. |
| **SEV-2 (High)** | Degradation of critical feature; push notifications completely failing; edge latency > 1500ms. | `< 15 mins` | `< 2 hours` | WebPush / FCM provider offline; Redis unreachable; report submission queue backlog. |
| **SEV-3 (Medium)** | Minor feature impaired; isolated zone anomaly; single-carrier network issue. | `< 1 hour` | `< 6 hours` | BERC LPG price sync failure; non-critical UI asset loading errors. |

---

## 2. Playbook 1: A Zone is Spammed / Targeted by False Reports

### Symptoms & Alerts
- Alert: `Spike in Reports/Minute in Single H3 Zone (> 50 reports/min)`.
- Alert: `Spike in 429 Device Rate Limit Rejections (> 30/min from single device)`.
- User complaint: Status suddenly flipped to "out" without an actual power or gas failure.

### Immediate Containment Steps (0–5 minutes)
1. **Identify the Target H3 Cell & Attacker Signatures:**
   Check SRE Admin Dashboard (`/admin`) or query recent reports in Supabase SQL editor:
   ```sql
   select h3_index, count(*), count(distinct device_id_hash) as devices, count(distinct user_id) as users
   from public.reports
   where received_at >= now() - interval '15 minutes'
   group by h3_index
   order by count(*) desc
   limit 5;
   ```
2. **If single device is flooding (`devices = 1`, `count > 20`):**
   The built-in device rate limit is already intercepting attempts with HTTP 429. Confirm that `distinct_reporters` in `zone_category_status` has NOT reached 3:
   ```sql
   select * from public.zone_category_status where h3_index = '<SPAMMED_H3>';
   ```
3. **Emergency Zone Cooldown Lock (Via Upstash Redis):**
   If an attack is actively underway, enforce a temporary 30-minute lock in Redis to freeze consensus changes:
   ```bash
   # Lock zone notifications and state updates
   redis-cli -u $UPSTASH_REDIS_REST_URL SET "notif:lock:<SPAMMED_H3>:electricity:interactive" "1" EX 1800
   ```
4. **Purge Fraudulent Reports:**
   If fraudulent reports bypassed limits (e.g. distributed botnet), delete reports from the identified device hashes:
   ```sql
   delete from public.reports
   where h3_index = '<SPAMMED_H3>'
     and device_id_hash in ('<ABUSIVE_HASH_1>', '<ABUSIVE_HASH_2>')
     and received_at >= now() - interval '1 hour';
   ```
5. **Force Recomputation & Cache Eviction:**
   Recompute zone status using the service role:
   ```sql
   select public.recompute_zone_category('<SPAMMED_H3>', 'electricity');
   ```
   Evict Redis cached zone status:
   ```bash
   redis-cli -u $UPSTASH_REDIS_REST_URL DEL "zone:status:<SPAMMED_H3>"
   ```

---

## 3. Playbook 2: Push Notification Provider Fails (WebPush / FCM)

### Symptoms & Alerts
- Alert: `Notification Delivery Failure Rate > 20% over 15 minutes`.
- Log entry: `WEBPUSH_DELIVERY_FAILED` or `FCM_OAUTH_TOKEN_ERROR`.
- Citizens not receiving restoration confirmation prompts.

### Root Cause Diagnosis (0–10 minutes)
1. **Check Error Codes in Edge Logs:**
   - `401 Unauthorized / 403 Forbidden`: Expired VAPID keys or rotated FCM Service Account JSON.
   - `410 Gone / 404 Not Found`: Expired user browser subscription (Halchal auto-prunes these; normal behavior).
   - `429 Too Many Requests`: Push service quota exhausted.
2. **Verify VAPID Configuration:**
   Ensure environment variables are populated in Supabase Edge Functions:
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT` (must be `mailto:notifications@halchal.bd`)
3. **Verify FCM Service Account:**
   Ensure `FIREBASE_SERVICE_ACCOUNT_JSON` contains valid private key for FCM HTTP v1 API.

### Remediation Steps
1. **If VAPID Key Corrupted or Expired:**
   Regenerate VAPID keypair:
   ```bash
   npx web-push generate-vapid-keys
   ```
   Update Supabase secrets:
   ```bash
   supabase secrets set VAPID_PUBLIC_KEY="..." VAPID_PRIVATE_KEY="..."
   ```
   *Note:* Changing VAPID keys invalidates existing WebPush tokens; users will be prompted to re-subscribe after their next report.
2. **Graceful Client Fallback (Zero Impact on Read/Report):**
   - Push delivery failure NEVER blocks report submissions or status reading.
   - PWA clients continue polling `/api/zone/[h3]` on app resume.

---

## 4. Playbook 3: PostgreSQL Database is Down or Paused

### Symptoms & Alerts
- Alert: `Supabase 5xx Error Rate > 5%`.
- Sentry error: `Connection refused` or `Project is paused`.
- Route `/api/report` returns HTTP 500.

### Urgent Diagnostic & Recovery
1. **Check if Supabase Free Project Auto-Paused (Inactivity):**
   - Free-tier Supabase projects automatically pause after 7 days without database activity.
   - Go to Supabase Dashboard (`https://supabase.com/dashboard/project/<PROJECT_REF>`) and click **"Restore Project"**.
   - Restoration takes 1–3 minutes.
2. **Check Connection Pool Exhaustion:**
   - If PostgreSQL max connections reached (`FATAL: remaining connection slots are reserved`):
   - Switch Edge Functions and Next.js serverless functions to use Supabase Transaction Pooler (Port `6543`) instead of direct connection (Port `5432`).
3. **Degraded Mode Resilience:**
   - **Status Reads:** Next.js `/api/zone/[h3]` serves cached responses from Upstash Redis (`zone:status:{h3}`) with HTTP header `Cache-Control: s-maxage=30, stale-while-revalidate=60`. Users can continue reading status for up to 60 seconds after DB outage.
   - **Report Writes:** Web and Flutter clients automatically save reports in their local offline queue (`halchal_offline_report_queue` in IndexedDB / Hive CE) with `client_ts`.
   - Queued reports automatically flush once PostgreSQL connectivity recovers.
4. **Post-Recovery Verification:**
   Verify pg_cron background jobs resume:
   ```sql
   select * from cron.job_run_details order by start_time desc limit 5;
   ```
