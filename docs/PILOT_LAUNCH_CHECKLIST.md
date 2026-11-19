# Halchal (হালচাল) — Pilot Launch Checklist & Cost Guardrails

> **Target Area:** Single Pilot Area — Dhaka North City Corporation Ward 19 (Banani & Gulshan 2)  
> **Primary H3 Hexagons:** `883cf13b25fffff` (Banani) & `883cf13b27fffff` (Gulshan 2)  
> **Launch Target Date:** [Launch Date]  
> **Lead DevSecOps / SRE:** Principal DevSecOps Engineer

---

## 1. Cost Guardrails & Cloud Limits

Free-tier cloud offerings are subject to provider policy changes. To prevent unexpected service suspension or runaway billing during outage surges, strict guardrails must be established:

### 1.1 Supabase (PostgreSQL 15+)
- **Free Tier Limits:**
  - Database storage: 500 MB
  - Monthly Active Users (MAU): 50,000
  - Bandwidth: 2 GB / month
  - **CRITICAL INACTIVITY PAUSE RULE:** Free Supabase projects automatically pause if no incoming database queries occur for 7 consecutive days!
- **Guardrails & Pilot Action Plan:**
  - *Keep-Alive Automation:* A lightweight hourly healthcheck ping (`GET /api/zone/883cf13b25fffff`) prevents auto-pausing.
  - *Pilot Upgrade Recommendation:* For zero-downtime pilot operation, upgrade to **Supabase Pro Tier ($25/month)** which disables auto-pausing, enables 7-day Point-In-Time Recovery (PITR), and provides 8 GB database storage.
  - *Usage Alerts:* Configure email alerts at **70% (350 MB)**, **85% (425 MB)**, and **95% (475 MB)** storage utilization.

### 1.2 Upstash Redis (Cache & Anti-Spam Rate Limiter)
- **Free Tier Limits:**
  - Command volume: **10,000 commands / day**
  - Storage: 256 MB
  - Max throughput: 100 requests / second burst
- **Guardrails & Pilot Action Plan:**
  - *Outage Surge Risk:* 2,000 users reading status + 300 reports/min can deplete the 10,000 commands/day free limit within hours.
  - *Billing Cap:* Configure Upstash with **Pay-as-you-go ($0.20 / 100k commands)** with a **Hard Spending Limit of \$10.00 / month**. Once the cap is hit, Upstash drops to read-only rather than charging unexpected overages.
  - *Alerts:* Set Upstash console alert at **7,000 commands / day (70%)** and **9,000 commands / day (90%)**.

### 1.3 Vercel & Cloudflare (Frontend Edge & DNS)
- **Free Tier Limits:**
  - Bandwidth: 100 GB / month
  - Serverless function invocations: 1,000,000 / month
  - Edge Execution: Edge functions deployed in Singapore (`sin1`).
- **Guardrails & Pilot Action Plan:**
  - Ensure static assets and `/fonts/*` carry `Cache-Control: public, max-age=31536000, immutable`.
  - Service worker `/sw.js` and `/manifest.webmanifest` carry `max-age=0, must-revalidate`.
  - Set Vercel Spend Management notification at **\$5.00** and **\$10.00**.

---

## 2. Single Pilot Area Strategy (Banani & Gulshan 2)

### 2.1 Geographic Boundary Definition
- **City:** Dhaka (North City Corporation)
- **Ward:** Ward 19
- **Core Hexagons:**
  - `883cf13b25fffff`: Banani (Residential Block A–F, Kemal Ataturk Ave, Banani Bazar)
  - `883cf13b27fffff`: Gulshan 2 (Diplomatic & commercial zone, immediate k=1 ring neighbor)
- **Seeded Utility Profiles:**
  - Electricity: DPDC / DESCO feeder lines
  - Gas: Titas Gas Distribution Network
  - Water: Dhaka WASA MODS Zone 5
  - LPG: 12kg cylinder retail distribution

---

## 3. First 200 Users Acquisition & Onboarding Plan

| Timeline | Channel / Action | Target Audience | Target Sign-Ups |
| :--- | :--- | :--- | :--- |
| **Days 1–3** | **Banani Society & Resident Committees:** Direct meeting with apartment building managers and residential society WhatsApp groups. | Building caretakers, flat owners, residents | `50 users` |
| **Days 4–7** | **Hyperlocal QR Code Campaign:** Clean, laminated posters with QR code placed at local tea stalls, pharmacies, grocery stores, and mosque notice boards ("আপনার এলাকায় কারেন্ট বা গ্যাস আছে? হালচাল দেখুন"). | Daily shoppers, shopkeepers, local youth | `80 users` |
| **Days 8–10**| **Neighborhood Facebook & Community Groups:** "Banani Residents", "Gulshan Community" groups with zero-hype, problem-solving announcement. | Commuters, remote workers, homemakers | `50 users` |
| **Days 11–14**| **Outage Virality Loop:** First verified outage trigger sends Web Push alert; users share PWA card to local WhatsApp groups. | Organic neighborhood viral loop | `50+ users` |
| **Total** | **Target Cohort Size** | **Hyperlocal Banani Residents** | **230+ Users** |

---

## 4. Key Performance Indicators & Pilot Success Metrics

1. **Weekly Active Users (WAU) per Zone:**
   - **Target:** `>= 120` distinct weekly active citizens in Banani (`883cf13b25fffff`).
   - **Measurement:** Distinct active anonymous sessions querying status or reporting within 7 days.
2. **Report Accuracy vs. Later Consensus:**
   - **Target:** `>= 90%` of early reports agree with the final confirmed consensus state.
   - **Formula:** `(Total reports agreeing with settled consensus / Total settled reports) * 100`.
   - **Alert Condition:** If accuracy drops below `< 80%`, inspect possible malicious reporting or feeder line boundary mismatch.
3. **Day-7 Retention Rate:**
   - **Target:** `>= 40%` of users who submit a report or open the app return within 7 days.
   - **Formula:** `(Users active on Day 7 / Cohort size on Day 0) * 100`.

---

## 5. Pre-Launch Go / No-Go Checklist

### DevSecOps & Security
- [x] Strict Privacy: Zero raw GPS coordinates confirmed in DB schemas and telemetry (`ADR-0005`).
- [x] Account Deletion: `/api/user/delete` implemented, tested, and linked in `/settings`.
- [x] Anti-Abuse: Device rate limiting (15m), user rate limiting (15m), and CGNAT IP burst (120/min) verified.
- [x] Sybil Attack: k6 script `3-sybil-attack.js` passes (1 account succeeds, 99 blocked).
- [x] Single-Use Action Tokens: Nonce replay prevention verified (`TOKEN_ALREADY_USED`).

### Observability & SRE
- [x] Sentry initialized with strict PII scrubbing (IPs and coordinates stripped).
- [x] Structured logger emitting JSON logs without personal identity or raw coordinates.
- [x] Minimal Admin Dashboard (`/admin`) deployed with live reports/min, zones by state, rejection reasons, and Redis hit rate.
- [x] Production alert thresholds specified (5xx > 2%, Edge latency p95 > 800ms).

### Ops & Disaster Recovery
- [x] Supabase automated backup scripts and restore drill documented (`docs/BACKUP_AND_RESTORE_DRILL.md`).
- [x] Migration rollback down-scripts documented for all 7 migrations (`docs/MIGRATION_ROLLBACK_GUIDE.md`).
- [x] Incident response runbook published (`docs/RUNBOOK.md`).
- [x] Cost guardrails and usage alerts configured for Supabase, Upstash, and Vercel.

### Legal & Public Interface
- [x] Plain-language Bengali Privacy Policy published at `/privacy`.
- [x] Plain-language Bengali Terms of Service published at `/terms`.
- [x] Community disclaimer mandatory text displayed across views: *"নাগরিকদের তথ্যের ভিত্তিতে তৈরি, এটি কোনো অফিশিয়াল পরিমাপ নয়"*.
- [x] Absolute ban on names of individuals, shopkeepers, and dealers enforced.
- [x] Content abuse contact point published: `takedown@halchal.bd`.
- [x] Prominent notice recorded that drafts must be reviewed by an enrolled Bangladeshi cyber lawyer.
