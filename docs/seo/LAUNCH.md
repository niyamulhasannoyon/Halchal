# Halchal (হালচাল) — SEO Launch Runbook, Owner Checklist & Monitoring Framework

> **Document Type:** Production SEO Launch Runbook & Operational Governance  
> **Role / Perspective:** SEO Launch Engineer  
> **Target Audience:** Halchal Site Owner, Lead Engineer & Community Growth Team  
> **Governance:** ADR-0017 (Technical SEO Foundation), CLAUDE.md (Privacy & Performance Rules), KEYWORD_MAP.md  
> **Last Verified:** 2026-11-20

---

## 1. Executive Summary & Engineering Philosophy

Halchal is a hyperlocal, crowd-sourced live utility monitoring platform (electricity, gas, water, LPG) designed for Bangladesh. Because utility disruptions directly impact daily citizen livelihood (cooking, water pumping, medical devices, emergency battery charging), search traffic in this domain is **urgent, mobile-first, and heavily localized**.

### The Honesty & Reality Principle
- **No Ranking Is Ever Guaranteed:** Search engine algorithms (Google, Bing) rank pages based on relevance, geographic proximity, crawl frequency, speed, and real user utility. No agency, engineer, or code change can promise a #1 position.
- **Results Take Weeks to Months:** SEO is not a toggle switch. Search crawlers must first discover URLs, verify canonical consistency, assess mobile page speed under real-world Bangladeshi network latency, and observe historical report density before indexing and serving pages in top SERP positions.
- **Data Volume Dictates Authority:** Unlike static blogs, Halchal's area pages derive their organic authority from **authentic citizen reports and consensus reliability**. Thin or unverified pages will intentionally remain `noindex` until real community activity matures.

---

## 2. Automated SEO Tooling & Launch Infrastructure

Halchal includes a four-tier automated testing and verification suite built directly into the repository. The site owner can run these at any time:

| Automated Component | Script / Path | Purpose & Verification Standard | Run Command |
| :--- | :--- | :--- | :--- |
| **Production Env Verifier** | `scripts/check-production-env.mjs` | Verifies `NEXT_PUBLIC_SITE_URL`, HTTPS, HSTS, single canonical host redirects (http->https, www/non-www), `robots.txt`, sitemap reachability, and preview `noindex` isolation. | `node scripts/check-production-env.mjs --url https://<domain>` |
| **Post-Deploy Smoke Suite** | `web/tests/e2e/smoke-20-urls.spec.ts` | Playwright test auditing 28 representative URLs across all route types for HTTP 200, canonical tags, exactly 1 `<h1>`, unique `<title>`, valid JSON-LD `@graph`, and reachable OG images. | `npm run test:smoke -w web` |
| **Broken-Link & Redirect Crawler** | `scripts/crawl-sitemap-links.mjs` | Sitemap-driven recursive crawler extracting all internal/external `<a href>`, detecting 4xx/5xx errors, redirect loops, and generating a CSV audit log (`crawl-results.csv`). | `node scripts/crawl-sitemap-links.mjs --url https://<domain>` |
| **IndexNow Protocol Engine** | `web/src/lib/indexnow.ts`<br>`web/public/c7e19d3f8a4b2e650123456789abcdef.txt` | Automatically batches and pings Bing/participating engines when a zone crosses `shouldIndexZone` or undergoes a confirmed macro blackout/restoration. Rate-limited to 24h cooldown per URL. | Integrated in build & API pipelines (`web/src/lib/indexnow.test.ts`) |
| **Weekly Monitoring Action** | `.github/workflows/seo-monitoring.yml` | Weekly GitHub Action (every Monday at 06:00 UTC) running the environment check, crawler, Lighthouse CI, and smoke test; automatically opens a GitHub issue on regression. | GitHub Actions Tab / Scheduled Cron |

---

## 3. Site Owner Operational Checklist

While the engineering team has automated metadata, canonical tags, JSON-LD schemas, sitemaps, and crawlers, the tasks below **require manual action, legal authority, or community outreach by the site owner**.

### Checklist Overview Matrix

```
[ ] Step 1: Domain Acquisition, DNS Configuration & Search Console Setup
[ ] Step 2: Search Console Verification, Core Web Vitals & Keyword Map Alignment
[ ] Step 3: Phased Pilot Launch in ONE Area (Strict shouldIndexZone Gating)
[ ] Step 4: Privacy-Centric Analytics Setup (Zero Tracking / Full Compliance)
[ ] Step 5: Honest, Community-Driven Natural Link Building
[ ] Step 6: Monthly Performance Audit & Continuous SERP Optimization
```

---

### Step 1: Domain Acquisition, DNS Configuration & Search Console Setup

1. **Acquire & Lock Canonical Apex Domain:**
   - Secure the primary brand domain (recommended: `halchal.com.bd` or `halchal.bd`, fallback: `halchal.com` or `halchal.app`).
   - Decide on a single canonical host. Halchal is configured by default for apex **non-www** (e.g., `https://halchal.com.bd`).
2. **Configure DNS Records (Cloudflare or Managed Registrar):**
   - **A / AAAA / CNAME Records:** Point root and `www` to your production host (e.g. Vercel: `cname.vercel-dns.com` or custom server IP).
   - **Enforce Single Canonical Redirect:** Ensure `http://` and `www.` redirect with HTTP 301/308 Permanent Redirect to `https://<domain>`.
   - **Enable HSTS:** In Cloudflare / reverse proxy, enable `Strict-Transport-Security` (`max-age=63072000; includeSubDomains; preload`).
3. **Verify Google Search Console (GSC) Domain Property:**
   - In [Google Search Console](https://search.google.com/search-console), select **Domain Property** (e.g. `halchal.com.bd`) rather than URL Prefix. This monitors `http`, `https`, and all subdomains under a single dashboard.
   - Add the TXT verification record to your DNS zone.
4. **Set Up Bing Webmaster Tools & IndexNow Verification:**
   - In [Bing Webmaster Tools](https://www.bing.com/webmasters), import the verified GSC domain property or verify via DNS.
   - Halchal ships with an active IndexNow key: `c7e19d3f8a4b2e650123456789abcdef`.
   - Verify that `https://<your-domain>/c7e19d3f8a4b2e650123456789abcdef.txt` returns HTTP 200 with the key in plain text.
5. **Submit XML Sitemap:**
   - In both Google Search Console and Bing Webmaster Tools, submit:
     `https://<your-domain>/sitemap.xml`
   - Halchal automatically rewrites `/sitemap.xml` to `/sitemap/dhaka.xml` and scales dynamically across cities using Next.js `generateSitemaps()`.

---

### Step 2: Search Console Verification & Keyword Map Alignment

1. **Weekly Inspection of "Pages" (Index Coverage Report):**
   - Navigate to GSC > **Pages**.
   - Review the breakdown of **Indexed** vs **Not Indexed** pages:
     - **"Page with redirect":** Normal for legacy `/z/[area]` slugs that issue 301s to `/dhaka/[area]`.
     - **"Excluded by ‘noindex’ tag":** Expected for private routes (`/admin`, `/settings`) and seed zones with insufficient data (e.g. Badda, Lalbagh). Verify that no indexable area page is mistakenly listed here.
     - **"Crawled - currently not indexed":** Google visited the URL but chose not to index it. This indicates low content density or lack of recent citizen reports. Remediate using Step 6.
2. **Weekly Core Web Vitals (CWV) & Mobile Page Experience Audit:**
   - Navigate to GSC > **Core Web Vitals** > **Mobile Report**.
   - Over 90% of Halchal users access the service from low-cost Android phones on high-latency 2G/3G connections. Maintain:
     - **LCP (Largest Contentful Paint):** <= `2.5s` (P75)
     - **CLS (Cumulative Layout Shift):** <= `0.1` (P75)
     - **INP (Interaction to Next Paint):** <= `200ms` (P75)
   - Ensure 100% of URLs are categorized as **"Good"** on mobile.
3. **Align GSC Performance Queries with `docs/seo/KEYWORD_MAP.md`:**
   - In GSC > **Performance** > **Search Results**:
     - Filter: `Country = Bangladesh`.
     - Date Range: `Most recent 28 days`.
   - Export queries matching the 8 Intent Clusters (`CL-GAS-01` through `CL-REP-08`).
   - Replace placeholder entries (`volume: TBD (verify in Google Search Console / Google Trends / autocomplete)`) in `KEYWORD_MAP.md` with **real weekly impressions, clicks, and average CTR**.
   - Any query generating **>= 50 impressions/week** must be promoted to the primary keyword list in `KEYWORD_MAP.md`.

---

### Step 3: Phased Pilot Launch in ONE Area (Strict Gating)

> [!IMPORTANT]
> **Do not launch citywide simultaneously.** Mass-indexing hundreds of empty or low-report neighborhood pages dilutes site crawl budget and risks algorithmic "thin content" soft-404 penalties.

1. **Select ONE Pilot Launch Area:**
   - Recommended Pilot: **Dhanmondi (Ward 15)** or **Mohammadpur (Ward 31)**.
   - Reason: High population density, chronic gas pressure fluctuations during winter/morning cooking hours, and established seed zone baseline in `SEED_ZONE_METRICS`.
2. **Enforce `shouldIndexZone()` Quality Guardrails:**
   - Per ADR-0017, a zone page is indexable **ONLY** when:
     1. Confirmed utility data exists on at least **3 distinct days in the last 30 days** (`confirmedDaysLast30Days >= 3`).
     2. At least **10 distinct community reporters ever** have contributed (`distinctReportersEver >= 10`).
     3. State is NOT purely `unknown` or `unverified` without historical confirmation.
   - Pages failing these criteria automatically emit `<meta name="robots" content="noindex, follow">`, send `X-Robots-Tag: noindex, follow`, and are omitted from `sitemap.xml`.
3. **Controlled Expansion Cadence:**
   - **Week 1–4:** Pilot Area Only (Dhanmondi & Mohammadpur). Promote reporting via local neighborhood WhatsApp/Facebook groups.
   - **Week 5–8:** Secondary Dhaka Seed Hubs (Mirpur 10, Banani, Gulshan 1 & 2, Uttara Sector 3, Farmgate) as each crosses the 10-reporter threshold.
   - **Month 3+:** Expand to Chattogram, Sylhet, and Khulna once local community leads are established.

---

### Step 4: Privacy-Centric Analytics Setup (CLAUDE.md Compliant)

Halchal enforces strict privacy guardrails: **zero raw GPS coordinate storage, zero user identification, no commercial vendor tracking, and zero invasive third-party ad pixels (no Meta Pixel, no Google Analytics 4 user tracking)**.

1. **Deploy Privacy-Friendly Analytics:**
   - Use self-hosted **Umami**, privacy-first **Plausible**, or **Cloudflare Web Analytics**.
   - Must not use tracking cookies, cross-site identifiers, or persistent device fingerprints.
   - Script footprint must be `< 3 KB` to protect 2G/3G data budgets.
2. **Define & Track Mandatory Custom Events:**
   Every event must track civic participation without exposing personal identities:

| Event Name | Trigger Condition | Business & SEO Objective | Privacy Safety Guardrail |
| :--- | :--- | :--- | :--- |
| `report_started` | User taps any status reporting button ("আছে", "স্বল্প", "নেই"). | Measures top-of-funnel citizen engagement and page conversion. | No location or user ID attached. |
| `report_completed` | Edge Function returns HTTP 200 after successfully registering report. | Measures organic report conversion rate (KPI #6). | Emits only H3 hex index and utility category. |
| `share_clicked` | User clicks WhatsApp, Messenger, or Facebook share card button. | Tracks viral civic sharing and social referral velocity. | Tracks channel (`whatsapp`, `fb`, `native_share`). |
| `install_prompt_shown` | PWA installation prompt is displayed or accepted by citizen. | Measures app retention on Android home screens. | Boolean status (`accepted` or `dismissed`). |

---

### Step 5: Honest, Natural Community Link Building

> [!WARNING]
> **Zero Tolerance Policy:** Never buy backlinks, join private blog networks (PBNs), post spam comments on random blogs, or create fake reviews. Google's SpamBrain and manual review teams heavily penalize commercial link schemes.

Halchal's link building must be **100% natural, honest, and civic-minded**:

1. **Local Neighborhood & Society Facebook Groups:**
   - Share real-time status updates and daily summaries in verified community groups (e.g., *“Dhanmondi Society”*, *“Mohammadpur Resident Forum”*, *“Uttara Community”*, *“Mirpur Citizens”*).
   - Use Halchal's dynamic Bengali OpenGraph share cards (`/api/og?h3=...`), which automatically render clean visual status summaries.
2. **Local News & Hyperlocal Investigative Journalists:**
   - Reach out to energy, civic, and urban infrastructure reporters at leading daily newspapers (*Prothom Alo*, *The Daily Star*, *Dhaka Tribune*, *BDNews24*, *Samakal*).
   - Position Halchal as an **open civic-tech tool** providing real-time citizen-reported utility data during winter gas crises and summer heatwave load shedding.
3. **University Tech Clubs & Developer Communities:**
   - Introduce Halchal at university technology clubs (BUET CSE Society, Dhaka University IT Society, IUT Computer Society, BRACU, NSU).
   - Give talks on building offline-first progressive web applications, H3 spatial indexing, and Bengali web performance.
4. **Bangla Tech & Open-Data Networks:**
   - Share open architectural case studies in Bangladeshi tech forums, GitHub, and LinkedIn tech communities.
   - Collaborate with civic-tech groups (e.g. disaster management volunteers, public data transparency advocates).

---

### Step 6: Monthly Strategic Review & Continuous Optimization

Schedule a recurring monthly meeting (1st week of each month) to execute this 4-step optimization loop:

```
┌────────────────────────────────────────────────────────┐
│             MONTHLY SEO OPTIMIZATION CYCLE             │
├────────────────────────────────────────────────────────┤
│ 1. Harvest GSC queries with High Impressions / Low CTR │
│    ↳ Rewrite <title> and meta description in Bengali   │
├────────────────────────────────────────────────────────┤
│ 2. Audit "Crawled - Currently Not Indexed" pages       │
│    ↳ Either boost reporter volume OR maintain noindex  │
├────────────────────────────────────────────────────────┤
│ 3. Review Incoming Area Requests from Citizens         │
│    ↳ Provision seed H3 cells for expanding wards       │
├────────────────────────────────────────────────────────┤
│ 4. Run automated crawler and verify IndexNow health    │
│    ↳ Zero 404 broken links, zero redirect loops        │
└────────────────────────────────────────────────────────┘
```

1. **Title & Meta Description Optimization (High Impressions, Low CTR):**
   - Identify queries with `>= 100` impressions but `CTR < 4%`.
   - Update `H1` and `<title>` in `web/src/app/[city]/[area]/page.tsx` or topic hubs to match exact citizen phrasing (e.g. adding `আজকের আপডেট` or `লাইভ স্ট্যাটাস`).
2. **Remediate "Crawled - Currently Not Indexed" URLs:**
   - If an area page is not indexed, check its report history. If it has `< 3` confirmed days in the last month, Google considers it thin content. Do not attempt to force-index; focus local community outreach to generate real reports.
3. **Evaluate New Area Expansion Requests:**
   - Review user requests submitted via `/contact` or reporting searches for unmapped wards. Add new seed zones to `SEED_ZONE_METRICS` once local volunteers commit to regular reporting.

---

## 4. Key Performance Indicators (KPIs) & Target Milestones

Halchal tracks 7 core SEO KPIs. These metrics provide an objective assessment of search engine health and civic engagement:

| Metric ID | KPI Name | Definition / Data Source | Month 1 Target (Pilot) | Month 3 Target (Dhaka Metro) | Month 6 Target (National) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **KPI-01** | **Indexed Pages Ratio** | `(Indexed URLs in GSC / Total Sitemap URLs) * 100` | >= 80% (Pilot URLs) | >= 90% (Active Zones) | >= 95% (National Hubs) |
| **KPI-02** | **Organic Impressions** | Total monthly search impressions in Bangladesh (GSC) | 5,000+ | 35,000+ | 150,000+ |
| **KPI-03** | **Organic Search Clicks** | Total monthly search clicks from organic listings (GSC) | 350+ | 2,800+ | 15,000+ |
| **KPI-04** | **Average Organic CTR** | Overall search click-through rate across all queries (GSC) | >= 5.0% | >= 7.5% | >= 8.5% |
| **KPI-05** | **Intent Cluster Avg Position** | Average SERP rank for primary queries in `KEYWORD_MAP.md` | Top 15 (Pilot areas) | Top 5 (Dhaka areas) | Top 3 (National head terms) |
| **KPI-06** | **Organic Report Conversion** | `(report_completed from organic traffic / organic sessions) * 100` | >= 3.0% | >= 4.5% | >= 6.0% |
| **KPI-07** | **Core Web Vitals Pass Rate** | Percentage of URLs rated "Good" on mobile in GSC CWV report | 100% | 100% | 100% |

---

## 5. Emergency SEO Incident Runbook

If search traffic suddenly drops or Google issues a manual action / security alert:

1. **Diagnose Crawl & Indexation Drops in GSC:**
   - Navigate to GSC > **Settings** > **Crawl Stats**. Check for sudden host unreachable errors or 5xx server surges.
   - Check GSC > **Security & Manual Actions**. If a manual action is listed, review content immediately.
2. **Execute Automated Verification Suite:**
   ```bash
   # 1. Verify production environment, robots.txt, and canonical redirects
   node scripts/check-production-env.mjs --url https://<your-domain>

   # 2. Check for broken internal links or redirect chains
   node scripts/crawl-sitemap-links.mjs --url https://<your-domain>

   # 3. Verify that 28 sample URLs pass all SEO assertions
   npm run test:smoke -w web
   ```
3. **Verify Staging Isolation:**
   - Ensure preview or staging branches on Vercel are NOT indexing. Run:
     ```bash
     node scripts/check-production-env.mjs --staging --preview-url https://<preview-domain>
     ```
   - Must confirm `X-Robots-Tag: noindex, nofollow` and `robots.txt: Disallow: /`.

---

*This launch runbook is governed by ADR-0017 and maintained by the Halchal Engineering & Operations Team.*
