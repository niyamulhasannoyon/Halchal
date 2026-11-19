# Halchal (হালচাল) — DevSecOps Observability & Alerting Specification

> **SRE Guideline:** Distributed Tracing, Zero-PII Structured Logging, and Production Alert Rules  
> **Target Pilot Area:** Dhaka North - Ward 19 (Banani & Gulshan 2)  
> **Last Updated:** 2026-11-19

---

## 1. Observability Architecture Overview

Halchal's observability stack is built to provide deep real-time system visibility while adhering strictly to **Zero Raw GPS Storage** and **Absolute Citizen Anonymity** (ADR-0005).

```
[ PWA Web Client ] -----> [ Vercel Next.js 15 (sin1) ] -----> [ Upstash Redis (sin1) ]
         |                              |                               |
         | (Sentry Web SDK)             | (Structured JSON Logs)        | (Hit/Miss Stats)
         v                              v                               v
[ Sentry (Scrubbed) ]         [ Vercel / Logflare ]            [ SRE Admin Dashboard ]
         ^                              ^                               ^
         | (Sentry Flutter)             |                               |
[ Android Flutter Client ] ---> [ Supabase Edge Functions ] ---> [ PostgreSQL 15+ (sin1) ]
```

---

## 2. Sentry Configuration (Web & Mobile)

### 2.1 Web Implementation (`@sentry/nextjs`)
- Configured via:
  - `web/sentry.client.config.ts`
  - `web/sentry.server.config.ts`
  - `web/src/instrumentation.ts`
- **PII Scrubbing Policy (`sendDefaultPii: false`):**
  - All client IPs are completely stripped (`user.ip_address = null`).
  - Request headers: `Authorization`, `Cookie`, `CF-Connecting-IP`, and `X-Forwarded-For` are deleted before event transmission.
  - Coordinate scrubbing: Any key matching `lat`, `lng`, `latitude`, `longitude`, `coords` is deleted from breadcrumbs and extra context.
  - Sample Rates: `tracesSampleRate: 0.1` (10% of client transactions), `0.2` (20% of serverless routes) to stay safely within free quotas.

### 2.2 Mobile Implementation (Flutter — Planned Phase)
For the native Android app in `mobile/`:
1. Add `sentry_flutter: ^8.12.0` to `mobile/pubspec.yaml`.
2. Wrap `main()` in `SentryFlutter.init()`:
   ```dart
   await SentryFlutter.init(
     (options) {
       options.dsn = const String.fromEnvironment('SENTRY_DSN');
       options.sendDefaultPii = false;
       options.tracesSampleRate = 0.1;
       options.beforeSend = (event, {hint}) {
         // Scrub any coordinate breadcrumbs
         event.breadcrumbs?.removeWhere((b) => 
           b.data?.containsKey('latitude') == true ||
           b.data?.containsKey('longitude') == true
         );
         return event;
       };
     },
     appRunner: () => runApp(const HalchalApp()),
   );
   ```

---

## 3. Zero-PII Structured Logging Specification

Both Next.js routes (`web/src/lib/logger.ts`) and Supabase Edge Functions (`supabase/functions/_shared/logger.ts`) emit uniform JSON lines:

### 3.1 Log Format Schema
```json
{
  "timestamp": "2026-11-19T14:32:10.145Z",
  "level": "INFO",
  "event": "REPORT_SUBMITTED",
  "service": "halchal-web",
  "correlation_id": "9b5760d8-bd82-4ae8-9de2-d591e967cac7",
  "h3_index": "883cf13b25fffff",
  "category": "electricity",
  "status_code": 200,
  "duration_ms": 142,
  "meta": {
    "ip": "103.205.0.0/16",
    "accuracy_m": 25,
    "state": "out"
  }
}
```

### 3.2 Automated Sanitization Rules
1. **IP Masking:** Subnets zeroed (`103.205.0.0/16`) for CGNAT compatibility without individual tracking.
2. **Phone & Email Redaction:** Matched against BD phone regex (`(\+?880|01)[3-9]\d{8}`) and replaced with `[PHONE_REDACTED]`.
3. **GPS Redaction:** Raw lat/lng values replaced with `[GPS_SCRUBBED_ADR0005]`. Only the H3 Resolution 8 cell index is preserved.

---

## 4. Production Alert Rules & Thresholds

| Alert Name | Metric / Condition | Evaluation Window | Severity | Action Triggered |
| :--- | :--- | :--- | :--- | :--- |
| **High 5xx Error Rate** | `HTTP 5xx Rate > 2.0%` | 5 minutes rolling | **P1 (Critical)** | PagerDuty / Telegram on-call alert; trigger Playbook 3 (Database check). |
| **High Edge Function Latency** | `p95 Latency > 800ms` | 5 minutes rolling | **P2 (High)** | Slack alert; inspect database connection pool and cold-starts. |
| **Redis Cache Hit Rate Drop** | `Hit Rate < 80.0%` | 10 minutes rolling | **P2 (High)** | Slack alert; check Redis connectivity and key TTL invalidation loops. |
| **Zone Spam Spike** | `> 50 reports/min in 1 H3 cell` | 5 minutes rolling | **P2 (High)** | Slack alert; check SRE Dashboard `/admin` for Sybil attack (Playbook 1). |
| **Push Delivery Failure Spike** | `Failed / Target > 20%` | 15 minutes rolling| **P3 (Medium)** | Check VAPID and FCM credentials (Playbook 2). |

---

## 5. SRE Admin Dashboard (`/admin`)

- **URL:** `https://halchal.bd/admin` (or `/admin` locally)
- **Protection:** Requires `ADMIN_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY`.
- **Live Observability Panels:**
  - Reports/minute (1m, 5m average, 1h)
  - Zones by state count (`ok`, `low`, `out`, `unverified`, `unknown`)
  - Unverified zone count prominently alerted
  - Rejection reasons breakdown (`USER_RATE_LIMIT_15M`, `DEVICE_RATE_LIMIT_15M`, etc.)
  - Push notification delivery stats (24h sends, active subscribers)
  - Redis cache hit rate percentage gauge
  - Edge Function p50/p95/p99 latency tracking.
