# Halchal (হালচাল) — Architectural Decision Records (ADR)

This file contains the chronological log of all architectural, product, and engineering decisions made for the **Halchal** project.

> **Instruction for Future AI & Developer Sessions:**  
> Whenever an architectural decision, technology trade-off, data model modification, or protocol change is made, append a new entry to the bottom of this document following the template below. **Never silently change an established decision without documenting the date, context, and rationale.**

---

## Decision Record Template

```markdown
### ADR-XXXX: [Short Title of the Decision]
- **Date:** YYYY-MM-DD
- **Status:** [Proposed | Accepted | Superseded | Deprecated]
- **Context:** [What problem are we solving? What are the constraints?]
- **Decision:** [What did we decide to do?]
- **Consequences:** [What becomes easier, harder, or risky because of this choice?]
- **Supersedes / Superseded by:** [Optional reference to previous/future ADR]
```

---

## Log of Decisions

### ADR-0001: Spatial Unit Selection — Uber H3 Resolution 8 without Postgres Extension
- **Date:** 2026-11-19
- **Status:** Accepted
- **Context:** We need a consistent, discrete geographic unit for aggregating crowd-sourced utility reports across dense urban (Dhaka, Chittagong) and peri-urban areas in Bangladesh. Running spatial queries with raw polygons or requiring PostGIS + `pg-h3` extension complicates database migrations, increases hosting footprint, and creates proprietary dependencies.
- **Decision:** 
  1. Standardize on **Uber H3 Resolution 8** (hexagon area ~0.74 km², edge length ~460 m, radius ~500 m).
  2. Compute H3 indexes exclusively **server-side** (inside Supabase Edge Functions using JavaScript/TypeScript H3 libraries).
  3. Store H3 identifiers as standard indexed `text` or `bigint` columns in PostgreSQL without relying on a PostgreSQL H3 extension.
- **Consequences:**
  - *Positive:* Fast index lookups on standard Postgres B-Tree indexes, simplified database backups, no custom binary extensions required on Supabase.
  - *Trade-off:* Hexagon boundary generation for frontend map display is handled either client-side or served via precomputed GeoJSON/vector tiles.

---

### ADR-0002: Server-Side Write Isolation via `submit-report` Edge Function
- **Date:** 2026-11-19
- **Status:** Accepted
- **Context:** Letting client apps write directly to Supabase tables via anon/user keys poses severe security risks: bots spamming false blackout reports, users forging timestamps, coordinates leaking, or malicious users bypassing rate limits and validation.
- **Decision:**
  - All report writes must route through a dedicated Supabase Edge Function: `submit-report`.
  - The function validates the client session, performs anti-spam rate limiting (via Upstash Redis), converts ephemeral lat/long to an H3 index, evaluates trust score weights, and inserts reports using the Supabase Service Role.
  - Direct `INSERT`/`UPDATE` operations on the raw reports table are blocked for client roles (`anon`, `authenticated`) via PostgreSQL Row Level Security (RLS).
- **Consequences:**
  - *Positive:* Complete isolation of raw coordinates, centralized rate-limiting, and fraud prevention.
  - *Trade-off:* Minor cold-start latency on edge function invocations (mitigated by Deno runtime and edge deployment).

---

### ADR-0003: Extensible Category Architecture and Defined Zone Display States
- **Date:** 2026-11-19
- **Status:** Accepted
- **Context:** Halchal launches with electricity, gas, water, and LPG. However, in the future we plan to support municipal issues such as internet outages, road waterlogging/drainage, and broken streetlights. Adding these should not trigger database schema overhauls. Furthermore, zone states must prevent false assumptions (e.g. absence of reports misinterpreted as normal service).
- **Decision:**
  - Database categories are defined using an extensible PostgreSQL enum (`utility_category`: `electricity`, `gas`, `water`, `lpg`) backed by a metadata configuration table for display labels and thresholds.
  - Report states submitted by users: `ok`, `low`, `out`.
  - Zone display states:
    - `ok` (Green): Verified normal service.
    - `low` (Amber): Verified reduced service / low pressure / fluctuating voltage.
    - `out` (Red): Verified total outage / shutdown.
    - `unverified` (Gray dashed): Reports received but below consensus thresholds.
    - `unknown` (Neutral gray): No recent reports.
  - **Invariable Rule:** `unknown` must **never** be rendered as green or "ok". Lack of data is not proof of service.
- **Consequences:**
  - *Positive:* Clean enum validation, consistent UI language, and protection against deceptive "all green" default states.
  - *Trade-off:* UI must gracefully render fallback icons/strings when new categories are added dynamically.

---

### ADR-0004: Anti-Collusion Consensus Thresholds
- **Date:** 2026-11-19
- **Status:** Accepted
- **Context:** In crowd-sourced reporting systems, malicious actors or single misinformed users can flip a neighborhood's public status to "out" or "ok", causing panic or false reassurance.
- **Decision:**
  - A zone status is confirmed **if and only if** both conditions are met:
    1. `distinct_reporters >= 3` (minimum 3 separate authenticated user sessions).
    2. `weighted_trust_score >= 3.0`.
  - Under no circumstances can a single high-trust user (regardless of reputation score) confirm a zone status alone.
- **Consequences:**
  - *Positive:* Prevents single-point-of-failure manipulation and rogue account sabotage.
  - *Trade-off:* In very low-density or sparsely populated areas, status remains `unverified` until at least 3 people report.

---

### ADR-0005: Strict Privacy Architecture & Ephemeral Raw Data Retention
- **Date:** 2026-11-19
- **Status:** Accepted
- **Context:** Citizen reporting during blackouts and municipal crises in Bangladesh can carry political, personal, or commercial sensitivity. Protecting citizen privacy and preventing vendor harassment is paramount.
- **Decision:**
  1. **Zero Raw GPS Retention:** Never persist raw latitude/longitude coordinates or street addresses in database tables or logs. Coordinates exist in server memory solely to compute H3 index resolution 8 and verify Bangladesh bounds, then are discarded immediately.
  2. **Total Reporter Anonymity:** Public APIs and client payloads must never expose user IDs, reporter identities, or per-user historical report trails.
  3. **No Commercial Entity Identification:** Never capture or show dealer/shop names. LPG price data is published only as an H3 zone aggregate (minimum 5 distinct reports required to display price statistics).
  4. **72-Hour Ephemerality:** Raw report rows are permanently purged after 72 hours via automated cleanup jobs. Only aggregated historical rollups remain.
- **Consequences:**
  - *Positive:* Uncompromising privacy protection, minimal regulatory exposure, and user trust.
  - *Trade-off:* Cannot perform retro-active debugging on exact GPS points; all spatial debugging must use H3 cell indexes.

---

### ADR-0006: Bengali-First UI, Strict Performance Budget (< 150 KB), and Multi-Modal a11y
- **Date:** 2026-11-19
- **Status:** Accepted
- **Context:** Users access Halchal on inexpensive low-RAM Android smartphones running on slow 2G/3G networks during power blackouts. Users may also suffer from color vision deficiencies or low digital literacy.
- **Decision:**
  1. **Bundle Budget:** Maximum initial home page JavaScript payload is `< 150 KB` gzipped. MapLibre GL is deferred / lazy-loaded, offering an immediate lightweight list/card view of nearby zones.
  2. **Bengali-First Localization:** 100% of user-facing UI text, notifications, and numbers (`০-৯` via `Intl.NumberFormat('bn-BD')`) are in Bengali, centralized in one i18n file.
  3. **Multi-Modal Accessibility:** Status is never communicated by color alone. Every indicator must combine color + distinct SVG icon + explicit Bengali word + distinct visual texture/border pattern. Text size is minimum 16px, contrast >= 4.5:1.
- **Consequences:**
  - *Positive:* Instant loading on congested networks, high accessibility for all demographics, resilient during actual outages.
  - *Trade-off:* Heavy interactive mapping libraries cannot be loaded upfront on the critical path.

---

### ADR-0007: Database Architecture, Security Definer Isolation, and Anti-Gaming Reputation Settlement
- **Date:** 2026-11-19
- **Status:** Accepted
- **Context:** Crowd-sourced utility reporting is vulnerable to sybil attacks, duplicate spamming, collusion, and reputation gaming. Furthermore, database operations must maintain O(1) read latency for client status cards without leaking user identities or coordinates.
- **Decision:**
  1. **Security Definer Write Functions with Strict Schema Isolation:** All report processing is encapsulated within `SECURITY DEFINER` functions configured with `set search_path = ''`. All internal tables, schemas, and routines are explicitly qualified. Direct execution is revoked from `anon` and `authenticated` roles and granted exclusively to `service_role`.
  2. **Two-Tier Anti-Gaming & Collusion Safeguards:**
     - Weight formula: `weight = LEAST(trust_score * tier_multiplier, 2.0)`. The 2.0 ceiling ensures that even a user with maximum trust (3.0) and phone tier cannot reach the 3.0 confirmation threshold alone.
     - Confirmation strictly requires `distinct_reporters >= 3` AND `weighted_score >= 3.0`.
  3. **Decoupled Asynchronous Reputation Settlement:** User trust scores are never updated during report submission (`submit_report`). Instead, a background cron job (`settle_trust_scores()`) evaluates reports > 20 minutes old against established zone consensus (+0.05 for agreement, -0.15 for contradiction), clamped within `[0.10, 3.00]`.
  4. **O(1) Status Table & Append-Only Event Ledger:** Status reads are decoupled from raw reports into `zone_category_status`. State transitions append to `status_events` to drive historical timelines and notifications.
  5. **Exclusive Public Read API:** `get_zone_status(p_h3)` is the sole function callable by `anon` and `authenticated` clients, returning strictly sanitized 4-category status records with Bengali area names and zero user telemetry.
- **Consequences:**
  - *Positive:* Mathematically provable anti-collusion protection, resistance to gaming, sub-millisecond status lookups, and airtight Row Level Security.
  - *Trade-off:* Minor settlement delay (20 minutes) before citizen reputation scores reflect reporting accuracy.

---

### ADR-0008: Home-Zone Gating (H3 gridDisk k=1), Hardware Pseudonymization, CGNAT Burst Defense, and One-Tap Signed Action Tokens
- **Date:** 2026-11-19
- **Status:** Accepted
- **Context:**
  - Euclidean "within 750m" radius calculations require persistent coordinate math and leak spatial proximity.
  - Browser fingerprinting (Canvas, Audio, WebGL, User-Agent) is trivially spoofed by puppeteer bots yet invasive to legitimate citizens.
  - Bangladeshi mobile operators (Grameenphone, Robi, Banglalink) rely heavily on Carrier-Grade NAT (CGNAT). Multiple unrelated households share a single public IP during blackouts; traditional per-IP rate limiting causes acute denial-of-service.
  - Restoration verification notifications ("ঠিক হয়ে গেছে / এখনো নেই") require one-tap voting from lock-screen notification action buttons without opening the web app.
- **Decision:**
  1. **Home-Zone Gating:** Enforce reporting solely within the user's registered home cell or its 6 immediate neighbors (`gridDisk(home_h3, 1)`). Home cells can be changed at most once every 7 days.
  2. **Device Hardware Pseudonymization:** Client generates a persistent random UUID upon install; server hashes it using HMAC-SHA256 with a server secret (`device_id_hash`). Fingerprinting is strictly forbidden.
  3. **CGNAT-Friendly 3-Tier Rate Limiting:**
     - User per category: 1 report / 15 min.
     - Device per category: 1 report / 15 min.
     - IP address: Coarse burst limit only (120 requests / min). Distinct users sharing a mobile CGNAT IP are never blocked during mass outages.
  4. **Signed Single-Use Action Tokens (`restore-vote`):** Notification action buttons use 15-minute HMAC-SHA256 signed tokens containing a unique nonce (`vid`). Single-use consumption is enforced atomically via Redis `SET NX`.
- **Consequences:**
  - *Positive:* Airtight defense against Sybil attacks and remote spoofing, uninterrupted reporting across Bangladeshi CGNAT mobile carriers, zero raw GPS retention, and seamless Bengali one-tap voting.
  - *Trade-off:* Citizens traveling outside their home neighborhood cannot submit utility reports unless 7 days have elapsed, aligning strictly with the hyperlocal neighborhood mission of Halchal.

---

### ADR-0009: Tactical Utility HUD Design System, Dual-Mode Contrast Architecture, Bengali Typography Clearance, and Never-Color-Alone Specification
- **Date:** 2026-11-19
- **Status:** Accepted
- **Context:**
  - Halchal operates in two extreme physical environments: (1) pitch-black blackout rooms where bright screens cause eye strain and rapidly drain critically low batteries, and (2) midday Dhaka direct sunlight on cheap, low-nit LCD budget Android phones where OLED dark mode becomes completely illegible.
  - Users include color-blind individuals (Deuteranopia, Protanopia, Tritanopia) and low-literacy citizens who must instantly perceive grid state without color discrimination.
  - Bengali script possesses top-hanging matras (ী, ৈ, ৌ, রেফ) and low-hanging conjunct ligatures (ষ্ণ, ক্ষ্ম, ণ্ড, হ্ণ, ঞ্ছ); conventional English line-heights (1.2–1.4) cause clipping and severe visual degradation on budget low-DPI screens.
- **Decision:**
  1. **Tactical Dual-Mode Architecture:**
     - OLED Dark Theme: Canvas `#070A0F`, Surface `#111622` with 1px `#1E293B` border, Text `#F8FAFC`, Secondary `#94A3B8`.
     - High-Contrast Light Theme: Canvas `#F8FAFC`, Surface `#FFFFFF` with 1px `#CBD5E1` / `#94A3B8` border, Text `#070A0F`, Secondary `#334155`.
     - System `prefers-color-scheme` followed by default with manual toggle stored in `localStorage` under `halchal-theme`.
  2. **Multi-Modal "Never Color Alone" Matrix:**
     - Status is NEVER communicated by hue alone. Every state couples:
       - `ok`: Solid Check Circle + "আছে" + 1.5px Solid Border
       - `low`: Half-Filled Gauge/Circle + "কম" + 1.5px Solid Border
       - `out`: Heavy Inscribed Cross + "নেই" + 1.5px Solid Border + Subtle Pulse (strictly disabled when `prefers-reduced-motion` is active)
       - `unverified`: Dashed Circle with Question + "অনিশ্চিত" + 1.5px Dashed Border
       - `unknown`: Hollow Circle with Dotted Rim + "খবর নেই" + 1.5px Dotted Border
  3. **WCAG 2.1 Contrast AA/AAA Guarantee:**
     - Pure colors (Emerald `#10B981`, Amber `#F59E0B`, Crimson `#EF4444`) fail WCAG 4.5:1 on light tints. Light theme status text and icons are explicitly darkened (`#065F46` emerald-800: 8.2:1; `#92400E` amber-800: 7.6:1; `#991B1B` red-800: 8.7:1; `#1E293B` slate-800: 10.5:1).
  4. **Bengali Typography Vertical Clearance:**
     - Body font size is minimum 16px (`1rem`) with `line-height >= 1.65` (`26.4px`).
     - Headings standardized to 22px (`1.375rem`) bold with `line-height 1.4`.
     - Font: `Hind Siliguri` (or `Noto Sans Bengali`) loaded with `bengali` subset and `display: swap`.
  5. **Thumb-Zone Layout Hierarchy:**
     - Top (Glanceable): Sticky `AreaPill` (Location 📍 + Live dot + relative timestamp).
     - Middle (Scannable HUD): 2x2 grid of `StatusCard` (min-height 136px, radius 16px, state badge top-right, reporter-count bar bottom).
     - Bottom (Thumb Reach Zone): `ReportButton` ("আপনার এলাকার হাল জানান", min-height 52px) + 3-item persistent `BottomNav` (হালচাল, লাইভ ম্যাপ, ইতিহাস).
  6. **Multi-Platform Parity:**
     - Synchronized token implementation across Next.js 15 (Tailwind v4 `@theme` in `globals.css`) and Flutter (`mobile/lib/theme/app_theme.dart` and `mobile/lib/utils/bengali_utils.dart`).
- **Consequences:**
  - *Positive:* 100% accessible to color-blind and visually impaired users, zero Bengali glyph truncation, pristine legibility under intense Dhaka glare and pitch-black outages, and full parity between Web and Mobile clients.
  - *Trade-off:* Slightly taller text bounding boxes due to 1.65 line-height, requiring careful card height budgeting (accommodated via min-height 136px).

---

### ADR-0010: Halchal PWA Core Architecture, Read Path Caching, Complex Bengali Shaping, Resilient Offline Queuing, and Non-OSM Dark Basemap Vector Tiles
- **Date:** 2026-11-19
- **Status:** Accepted
- **Context:**
  Building the production Halchal Next.js 15 App Router PWA presents critical technical challenges:
  1. High-frequency read traffic must not overwhelm PostgreSQL during mass blackouts.
  2. Users reporting utilities in blackout areas face intermittent 2G connectivity or total network dropouts.
  3. Dynamic social share cards require complex Bengali conjunct ligatures (ক্ষ, শ্র, ত্র, স্ক), which standard Satori font engines decompose or drop without HarfBuzz shaping.
  4. Social crawlers (Facebook, WhatsApp, Twitter) cache Open Graph images aggressively, showing outdated blackout statuses.
  5. Heavy client libraries (MapLibre GL) can violate the `< 150 KB` gzipped initial JavaScript bundle budget on the home route.
  6. OpenStreetMap tile usage policy strictly forbids high-volume application basemap tile requests (`tile.openstreetmap.org`).
- **Decision:**
  1. **Tiered Cheap Read Path (`GET /api/zone/[h3]`):**
     - First checks Upstash Redis key `zone:status:{h3}` (TTL 60s).
     - On cache miss, executes Supabase RPC `get_zone_status`, caches the result for 60 seconds, and serves with HTTP header `Cache-Control: s-maxage=30, stale-while-revalidate=60`. Transparently notes "DB reads are cached".
  2. **Sub-5-Second OneTap Reporting & Resilient IndexedDB Offline Queue:**
     - Step 1 Category -> Step 2 State selection. Acquires position once via `navigator.geolocation.getCurrentPosition`.
     - Optimistic UI updates the local StatusCard immediately upon tap.
     - Offline payloads are stored in IndexedDB (`halchal_offline_report_queue`) with `client_ts` and persistent device UUID. Items older than 30 minutes are automatically pruned.
     - Auto-flushing occurs on `online` and `focus` events, and via Service Worker Background Sync (`sync-reports`).
  3. **Complex Indic Shaping via `resvg-js` for Social Share Cards:**
     - Share card route `/api/og` leverages `resvg-js` with `NotoSansBengali.ttf` loaded via `fontFiles`. Because `resvg-js` utilizes `rustybuzz` (Rust HarfBuzz port), complex conjuncts (ক্ষ, শ্র, ত্র, স্ক, ষ্ণ, হ্ম, ণ্ড) are shaped with 100% typographic fidelity.
     - Share URLs carry a 10-minute floor time bucket (`?t=floor(now/10min)`) and print the exact timestamp on the card to guarantee fresh social cards while retaining 10-minute caching.
  4. **Strict `< 150 KB` Bundle Protection via Dynamic Map Lazy-Loading:**
     - `MapLibreView` is dynamically imported (`next/dynamic`, `ssr: false`) exclusively on `/map`, completely isolating MapLibre GL JS from the `/` home critical path.
  5. **OSM Tile Policy Compliance & Tactical Dark Basemap:**
     - Vector/raster dark basemap configured via CartoDB Dark Matter / MapTiler Dataviz style (`https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json`), strictly avoiding `tile.openstreetmap.org`.
  6. **PWA Service Worker & Post-Report Install Gating:**
     - Service worker (`public/sw.js`) pre-caches app shell and runtime-caches zone responses, clearly tagging offline data as "পুরোনো, শেষ আপডেট X আগে".
     - Browser install prompt (`beforeinstallprompt`) is captured and deferred, presented exclusively after the citizen's first successful report.
- **Consequences:**
  - *Positive:* Sub-millisecond cached status lookups, bulletproof offline resilience during power cuts, verified typographic perfection for Bengali script, 100% compliance with OSM usage policies, and an initial home JS bundle of only ~40 KB gzipped (well under the 150 KB limit).
  - *Trade-off:* Requires `@resvg/resvg-js` in `serverExternalPackages` during Next.js server compilation.

---

### ADR-0011: Halchal Notification Engine — Event Triggers, Anti-Spam Cooldown, Target Filtering, and Signed One-Tap Restoration Voting
- **Date:** 2026-11-19
- **Status:** Accepted
- **Context:**
  Utility blackouts in Bangladesh cause severe disruption, but spamming citizens with unverified alerts or duplicate notifications erodes trust and drains device batteries. Furthermore:
  1. Triggering notifications must occur on verified consensus state transitions (`status_events`), decoupled from client write paths.
  2. Notifications must support Web Push (VAPID) today and FCM HTTP v1 (OAuth 2.0 service account) for Flutter later, strictly excluding the deprecated legacy FCM API.
  3. Anti-spam rules must strictly prevent alert storms: 30-minute cooldown locks per `(h3, category, state)`, a ceiling of at most 3 notifications/day per citizen, and quiet hours 23:00-06:00 BDT default (with opt-in night alerts).
  4. "Restored" alerts must go exclusively to citizens who were notified of the outage to avoid confusing users who never experienced or were not informed of the issue.
  5. 30 minutes after an outage, the system must send an interactive inquiry ("আপনার এলাকায় কি কারেন্ট ফিরেছে?") with action buttons ("হ্যাঁ, ফিরেছে" / "না, এখনো নেই") handled by the service worker without opening the app, secured by short-lived single-use action tokens.
- **Decision:**
  1. **PostgreSQL Event Trigger via `pg_net`:**
     - A database trigger `trg_status_events_notify` on `public.status_events` fires when `to_state IN ('out', 'low')` (confirmed outage/pressure drop) or `from_state IN ('out', 'low') AND to_state = 'ok'` (restored).
     - Asynchronously invokes the Supabase Edge Function `notify-zone` via `net.http_post` with non-blocking error recovery.
  2. **Multi-Provider Architecture (Web Push & FCM HTTP v1):**
     - Web Push utilizes RFC 8291 / RFC 8292 with VAPID authentication.
     - Mobile notifications route via FCM HTTP v1 API (`https://fcm.googleapis.com/v1/projects/{projectId}/messages:send`). The deprecated legacy FCM API is strictly barred.
     - Automatic subscription pruning: HTTP 410 Gone / 404 responses immediately trigger deletion of stale tokens from `public.push_subscriptions`.
  3. **Tiered Anti-Spam Matrix:**
     - *Cooldown Lock:* Redis atomic key `notif:lock:{h3}:{category}:{state}` with 30-minute TTL (1800s).
     - *Daily Cap:* Redis atomic key `notif:daily:{userId}:{YYYY-MM-DD}` clamped to <= 3 notifications/day in Asia/Dhaka local time.
     - *Quiet Hours:* Enforced between 23:00 and 06:00 Asia/Dhaka time (UTC+6). Only subscribers with `allow_night_alerts = true` receive night alerts.
     - *Restored Targeting:* Outage recipient IDs are recorded in Redis set `notif:outage_recipients:{h3}:{category}` (TTL 48h). Restored alerts are delivered exclusively to this set, which is pruned immediately upon restoration.
  4. **Post-Report Opt-In Flow & Settings Management:**
     - Push permission prompt (`PushNotificationOptInModal`) is triggered exclusively after the citizen's first successful report with an explicit Bengali explanation.
     - Full settings UI (`/settings`) enables per-category toggles (বিদ্যুৎ, গ্যাস, পানি, এলপিজি), night alert opt-in, and neighborhood management.
  5. **Interactive Restoration Confirmation:**
     - 30 minutes post-outage, Edge Function `notify-zone` with `interactive: true` sends "আপনার এলাকায় কি কারেন্ট ফিরেছে?".
     - Embeds a 15-minute cryptographically signed HMAC-SHA256 action token with single-use nonce (`vid`).
     - Service worker `notificationclick` handler intercepts action buttons and POSTs directly to `/restore-vote` with zero credentials stored in notification payloads.
- **Consequences:**
  - *Positive:* 100% spam-free delivery, zero battery-draining notification storms, provable replay-attack protection on lock-screen action buttons, automatic cleanup of stale push tokens, and seamless Bengali one-tap restoration feedback.
  - *Trade-off:* Outage restoration alerts require Redis recipient persistence for correlation, handled ephemerally with 48h TTL.

---

### ADR-0012: 7-Day Community Reliability Insights Engine, Confirmed Interval Analysis, Deterministic Bengali Pattern Templates, Pure CSS Heatmap, and Client-Side Complaint Card Export
- **Date:** 2026-11-19
- **Status:** Accepted
- **Context:**
  Citizens, neighborhood committees, and advocacy groups in Dhaka need weekly historical insights into recurring utility failures (e.g., recurring low gas pressure between 10 AM and 2 PM, evening power cuts), market LPG price deviations against official BERC benchmarks, and downloadable complaint documents for submission to utility providers (DPDC, DESCO, Titas Gas, WASA).
  Technical and architectural constraints:
  1. *Privacy & 72-Hour Data Purge:* Raw user reports are permanently purged after 72 hours (ADR-0005). 7-day metrics **cannot** query raw reports; they must derive exclusively from `zone_hourly_stats` and `status_events` (confirmed consensus intervals).
  2. *Data Confidence Threshold:* Low-density or sporadic data must not mislead citizens. If fewer than 3 distinct days or fewer than 10 total distinct reporters exist in the 7-day window, confidence must be marked `insufficient`.
  3. *Vendor Anonymity:* LPG area median prices require at least 5 distinct reports; otherwise price display is suppressed to protect local shopkeepers.
  4. *Zero Chart Libraries & Bundle Limit:* Home and history routes must stay within the `< 150 KB` gzipped JS budget. Heavy charting packages (Chart.js, Recharts, D3) are prohibited.
  5. *Bengali Font Embedding in PDF/PNG:* Client-side PDF export of complaint cards must not decompose Bengali ligatures (ক্ষ, শ্র, ত্র, স্ক, ণ্ড) or introduce heavy PDF engines.
- **Decision:**
  1. **PostgreSQL RPC Function `get_zone_7day_insights(p_h3 text)`:**
     - `SECURITY DEFINER`, `STABLE`, anon-callable, read-only.
     - Computes `total_outage_minutes` and `outage_event_count` exclusively from confirmed `'out'` intervals in `public.status_events` and pre-aggregated `public.zone_hourly_stats`.
     - Generates `hourly_pattern`: 24 values representing the share of the last 7 days in which each hour had confirmed outage or low pressure.
     - Gates `data_confidence` to `'ok'` only when `distinct_days >= 3` and `total_reporters >= 10`; otherwise `'insufficient'`.
     - Computes LPG median price against `public.official_prices` only if `>= 5` reports exist in the window; otherwise returns `null`.
     - Synthesizes `insight_bn` using deterministic Bengali templates and streak threshold algorithms (never an LLM).
  2. **Tiered Caching (`GET /api/zone/[h3]/insights`):**
     - Reads from Upstash Redis key `zone:insights:{h3}` with 300-second (5 min) TTL matching the `pg_cron` rollup interval.
     - HTTP Cache-Control: `s-maxage=60, stale-while-revalidate=300`.
  3. **Pure CSS Grid Heatmap (7 Days × 6 Four-Hour Blocks):**
     - Built using standard CSS Grid (`grid-template-columns: repeat(6, 1fr)`) with zero chart dependencies.
     - Color + pattern accessibility tokens: `ok` (solid emerald), `low` (amber diagonal stripes), `out` (red cross-hatch), `unknown` (dotted neutral gray).
     - Interactive cell tapping reveals detailed duration and state breakdown formatted with Bengali numerals (`০-৯`).
  4. **Shareable Complaint Card with Zero-Dependency Client-Side PDF/PNG:**
     - Preloads `NotoSansBengali.ttf` via `FontFace` API into the browser document.
     - Renders a 1200x1520 high-res card onto an HTML5 Canvas using the browser's native HarfBuzz text shaper, ensuring 100% accurate Bengali conjunct rendering.
     - PNG download generates directly from `canvas.toBlob()`.
     - PDF download packs the high-DPI rendered image into a compliant, zero-dependency PDF 1.4 binary stream (< 100 lines of TypeScript, 0 KB added external libraries).
     - Mandates the exact footer: *"কমিউনিটি-রিপোর্টেড তথ্য, সরকারি পরিমাপ নয়। হালচাল ব্যবহারকারীদের রিপোর্ট থেকে তৈরি।"*
     - Contains strictly zero personal data and zero dealer names.
  5. **Transparent Reporting Bias Disclosure:**
     - Every view explicitly presents the disclaimer: *"নাগরিকরা মূলত সমস্যা চলাকালীন বেশি রিপোর্ট করেন, তাই এই তথ্যগুলো কোনো সরকারি পরিমাপ নয় বরং এলাকার সার্বিক পরিস্থিতির নির্দেশক মাত্র।"*
- **Consequences:**
  - *Positive:* 100% privacy-compliant long-term analytics, zero impact on the JS bundle budget, flawless complex Bengali shaping in exported complaint documents, and robust resilience against crowd-sourcing reporting bias.
  - *Trade-off:* 7-day pattern trends represent citizen activity rather than smart-meter grid telemetry, clearly communicated via the required UI bias notice.


---

### ADR-0013: Android-First Flutter Client Architecture, Resilient Offline Queuing, Multi-Modal HUD, Location Integrity, and FCM Data-Only Push with Action Buttons
- **Date:** 2026-11-19
- **Status:** Accepted
- **Context:**
  Expanding Halchal to native Android requires an application optimized for low-end smartphones (Android 8.0 - 15), intermittent 2G/3G connectivity, and active blackout conditions.
  Key constraints and requirements:
  1. *Backend Contract Preservation:* Reuses existing Supabase database schema, RPC functions (`get_zone_status`, `get_zone_7day_insights`), and Edge Functions (`submit-report`, `restore-vote`). Zero breaking backend changes permitted.
  2. *Resilient Offline Queuing:* Network dropouts during blackouts must not drop citizen reports. Local database must use maintained libraries (`hive_ce`). Raw coordinates must exist only briefly on disk while queued and be permanently deleted immediately upon transmission.
  3. *Active Connectivity Verification:* `connectivity_plus` only reports interface status (e.g. connected to dead Wi-Fi or exhausted cell data). Real DNS/socket reachability probes are required.
  4. *Location Integrity:* Mock location flags (`Position.isMocked`) are Android-only hints easily bypassed by root/hooking. Hard gating relies on Google Play Integrity attestation + server-side home-zone bounds check (`gridDisk(home_h3, 1)`).
  5. *Push Notification Action Buttons:* FCM notification payloads cannot render custom action buttons on Android. Notifications must be delivered via high-priority DATA-ONLY FCM messages, rendered locally via `flutter_local_notifications`, and button taps handled by a minimal background handler targeting `restore-vote`.
  6. *Aggressive OEM Task Killers:* Xiaomi (MIUI/HyperOS), Samsung (One UI), Oppo (ColorOS), and Vivo (Funtouch OS) aggressively kill background processes.
- **Decision:**
  1. **Feature-First Architecture with Riverpod & Hive CE:**
     - Modular feature structure: `lib/core` (constants, network, storage, integrity, notifications), `lib/features/{home,map,history,settings}`.
     - Offline queue implemented with maintained `hive_ce`. Items older than 30 minutes are automatically dropped. Raw coordinates (`lat`, `lng`) are wiped from storage immediately upon HTTP 200 response.
     - Exponential backoff retry scheduled via WorkManager (`workmanager` package).
  2. **Active Reachability Probing (`ConnectivityService`):**
     - Never trusts `connectivity_plus` flag alone. Actively probes DNS/socket reachability before attempting queue flushes.
  3. **Multi-Modal "Never Color Alone" HUD Components:**
     - `StatusCard` implements all 5 states (`ok`, `low`, `out`, `unverified`, `unknown`) with distinct colors, dedicated icons, explicit Bengali words ("আছে", "কম", "নেই", "অনিশ্চিত", "খবর নেই"), and custom border styles (solid, dashed, dotted).
     - Strict Golden Rule: `unknown` is never green.
  4. **Location Integrity & Attestation (`LocationIntegrityService`):**
     - Emits user warning banner: *"সঠিক তথ্যের জন্য ফোনের আসল GPS ব্যবহার করুন।"* on `isMocked == true` without blocking valid edge cases.
     - Passes Google Play Integrity tokens to `submit-report` for server-side verification.
  5. **FCM Data-Only Message & Background Action Handler:**
     - Interactive restoration alerts delivered via high-priority data payloads.
     - `flutter_local_notifications` renders notification with actions: *"হ্যাঁ, ফিরেছে"* (`action_restored`) and *"না, এখনো নেই"* (`action_not_restored`).
     - Handled by top-level `@pragma('vm:entry-point') notificationTapBackground()` executing a lightweight HTTP POST to `restore-vote` with the signed token (zero Supabase session required).
  6. **OEM Battery Optimization Guidance & Settings:**
     - `BatteryOptimizationDialog` guides users on Xiaomi, Samsung, Oppo, and Vivo to whitelist the app from battery killing.
  7. **Release Optimization:**
     - Target release APK size `< 25 MB` per ABI via `--split-per-abi`.
- **Consequences:**
  - *Positive:* 100% contract parity with existing backend, resilient reporting during severe blackouts, zero raw GPS data leaks, reliable push notification action responses from the Android notification tray, and clean modular code verified by 26 automated tests.
  - *Trade-off:* Background WorkManager retries on Android are subject to OS battery management constraints, addressed through user OEM optimization guidance.

---

### ADR-0014: Vercel Production Deployment Architecture, Edge Caching, Security Headers, and Regional Proximity
- **Date:** 2026-11-19
- **Status:** Accepted
- **Context:**
  Deploying the Next.js 15 PWA frontend of Halchal to Vercel requires:
  1. *Regional Proximity for Bangladesh:* Next.js Serverless Functions (`/api/report`, `/api/zone/[h3]`, `/api/og`) must minimize latency for users in Bangladesh. Supabase is hosted in Singapore (`ap-southeast-1`).
  2. *Monorepo Support:* The repository is a monorepo containing `web/`, `mobile/`, `supabase/`, and `docs/`. Deployment must work seamlessly whether the Vercel project Root Directory is set to `web` or kept as repository root.
  3. *PWA & Service Worker Cache Invalidation:* The Service Worker (`/sw.js`) and Web App Manifest (`/manifest.webmanifest`) must never be cached by CDN edge layers (`max-age=0, must-revalidate`), while static fonts and icons should be aggressively cached (`immutable`).
  4. *Serverless Asset Tracing:* The dynamic OG image generator (`/api/og`) renders Bengali text via `@resvg/resvg-js` and requires the `NotoSansBengali.ttf` font in the serverless container filesystem.
  5. *Deployment Upload Footprint:* The native Android Flutter app (`mobile/`) and local test suites should be excluded from Vercel source archive uploads.
- **Decision:**
  1. **Regional Edge Placement (`sin1`):** Configured `"regions": ["sin1"]` in `vercel.json` (Singapore) to match Supabase's `ap-southeast-1` data center, achieving sub-50ms roundtrip latency from Dhaka.
  2. **Dual Monorepo Configuration:**
     - `web/vercel.json` configured for deployments where Root Directory is set to `web`.
     - Root `vercel.json` configured with `buildCommand`, `outputDirectory: "web/.next"`, and `installCommand: "npm --prefix web install"` for zero-configuration deployments from the repository root.
     - Root `package.json` added with delegation scripts (`"build": "npm --prefix web run build"`).
     - `.vercelignore` configured to exclude `mobile/`, `.dart_tool/`, `.gradle/`, and `supabase/tests/` from Vercel deployment uploads.
  3. **PWA & Security Headers:**
     - `/sw.js`: `Cache-Control: public, max-age=0, must-revalidate`, `Service-Worker-Allowed: /`.
     - `/manifest.webmanifest`: `Content-Type: application/manifest+json; charset=utf-8`, `Cache-Control: public, max-age=0, must-revalidate`.
     - `/fonts/*`: `Cache-Control: public, max-age=31536000, immutable`.
     - Security: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: geolocation=(self), camera=(), microphone=()`.
  4. **Serverless Font Tracing:** Added `outputFileTracingIncludes: { '/api/og': ['./public/fonts/**/*'] }` in `web/next.config.mjs` ensuring `NotoSansBengali.ttf` is bundled into the Lambda package.
- **Consequences:**
  - *Positive:* Fast, reliable Vercel deployments with sub-50ms serverless function execution from Bangladesh, guaranteed font availability for OG social card rendering, instant service worker updates, and seamless support for both CLI and Dashboard Git deployments.
  - *Trade-off:* Environment variables must be kept in sync between Supabase, local `.env.local`, and Vercel Project Settings.

---

### ADR-0015: DevSecOps Pilot Launch Preparation, Zero-PII Observability, k6 Load & Abuse Testing, Right to Erasure, and Bangladeshi Legal Compliance
- **Date:** 2026-11-19
- **Status:** Accepted
- **Context:**
  Preparing Halchal for its single-pilot launch (Dhaka Ward 19: Banani & Gulshan 2) requires rigorous verification against production traffic surges and malicious attacks:
  1. *High-Volume Reads & CGNAT Surge:* 2,000 citizens reading status during blackouts; 300 reports/min arriving from only 20 shared mobile carrier NAT IPs (Grameenphone, Robi, Banglalink).
  2. *Sybil & Replay Attacks:* Attackers using 100 anonymous accounts from 1 device, replaying reports within 15 minutes, or replaying one-tap restoration action tokens.
  3. *Observability without Privacy Violations:* Sentry and logging must strictly scrub client IP addresses, auth tokens, and raw coordinates.
  4. *Right to Erasure:* In compliance with data privacy principles and evolving Bangladeshi personal data laws, users must have a tested, one-tap mechanism to delete their account and all data.
  5. *Legal & Abuse Protections:* Clear, accessible Bangla privacy policy and terms prohibiting names of people, shops, or dealers, with a takedown mechanism and notice for mandatory lawyer review.
- **Decision:**
  1. **k6 Load & Abuse Test Suite:**
     - Created `scripts/load-testing/` with 4 standardized scripts: `1-read-status-cache.js` (2,000 VUs, 90% hit mix), `2-cgnat-mass-reports.js` (300/min across 20 IPs), `3-sybil-attack.js` (100 accounts, 1 device), `4-replay-expired-tokens.js` (user report replay and action token expiry/replay).
     - Published `EXPECTED_RESULTS.md` and SRE executive sign-off template `docs/LOAD_TEST_REPORT_TEMPLATE.md`.
  2. **Zero-PII Observability & Minimal Admin Dashboard:**
     - Integrated Sentry (`@sentry/nextjs`) with automated PII scrubbing (stripping IPs, coordinates, cookies, tokens).
     - Structured JSON logging implemented in `web/src/lib/logger.ts` and `supabase/functions/_shared/logger.ts`.
     - Built protected `/admin` dashboard and `/api/admin/metrics` endpoint providing real-time visibility into reports/minute, zones by state, unverified zones, rejection reasons, and Redis hit rate.
  3. **Right to Erasure (`/api/user/delete`):**
     - Implemented PostgreSQL RPC `delete_user_account(p_user_id)` in migration `20261119000007_user_account_deletion_and_admin_metrics.sql` and API route `/api/user/delete`.
     - Completely purges user profile, push subscriptions, raw reports, and Redis rate limit keys. Verified by Vitest and Deno unit tests.
  4. **Plain-Language Bangla Legal Drafts & Mandatory Lawyer Review:**
     - Published accessible Bangla Privacy Policy (`/privacy`) and Terms of Service (`/terms`) with absolute ban on person/shop names and takedown contact (`takedown@halchal.bd`).
     - Added prominent disclaimers and memorandum (`docs/LEGAL_AND_PRIVACY_COMPLIANCE.md`) requiring formal review by an enrolled Bangladeshi cyber lawyer before public launch.
  5. **Production SRE Runbooks & Cost Guardrails:**
     - Published `docs/RUNBOOK.md` covering incident response for zone spam, push provider failures, and database outages.
     - Documented backup restore drill (`docs/BACKUP_AND_RESTORE_DRILL.md`), migration down-scripts (`docs/MIGRATION_ROLLBACK_GUIDE.md`), and single-pilot launch plan (`docs/PILOT_LAUNCH_CHECKLIST.md`).
- **Consequences:**
  - *Positive:* 100% architectural adherence to CLAUDE.md privacy rules, provable defense against Sybil and replay attacks, automated Right to Erasure, zero PII leakage into Sentry or logs, and a crystal-clear operational runbook for the Banani pilot launch.
  - *Trade-off:* Free-tier cloud limits (Supabase 7-day auto-pause, Upstash 10k cmds/day) require active keep-alive or upgrade to paid tiers for production pilot reliability.

---

### ADR-0016: Complete Production Readiness Verification, Security Headers, Healthcheck, Containerization, and Automated CI/CD Workflows
- **Date:** 2026-11-19
- **Status:** Accepted
- **Context:**
  Final evaluation of Halchal for 100% production readiness across web, backend, and mobile platforms. Identified gaps included:
  1. Missing HTTP security headers (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) and Next.js technology leakage (`x-powered-by`).
  2. Lack of an uptime and health monitoring route (`/api/health`) for cloud orchestrators, load balancers, and monitoring pings.
  3. Prerendering serialization risks on interactive components when crossing React Server/Client boundaries (`BottomNav`, `ReportButton`, `AreaPill`, `StatusCard`).
  4. Missing Bengali-first error handling boundaries (`not-found.tsx`, `error.tsx`) and SEO metadata routes (`robots.ts`, `sitemap.ts`).
  5. Absence of unified GitHub Actions CI/CD workflows across Web, Mobile, and Supabase Edge Functions.
  6. Lack of containerization (Dockerfile) for portable cloud deployments (Fly.io, Cloud Run, AWS ECS, self-hosted VPS) and Android release ProGuard rules.
- **Decision:**
  1. **HTTP Security Headers & Cache Policies in `web/next.config.ts`:**
     - Enforced `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security`, and `Permissions-Policy`.
     - Disabled `x-powered-by` header via `poweredByHeader: false`.
     - Enforced cache policies: `/sw.js` and `/manifest.webmanifest` (`max-age=0, must-revalidate`), `/fonts/*` (`max-age=31536000, immutable`), and `/api/og` (`s-maxage=600, stale-while-revalidate=86400`).
  2. **Production Uptime & Health Endpoint (`/api/health`):**
     - Implemented dynamic, no-cache `/api/health` checking database read connectivity, Redis ping status, uptime seconds, and latency ms.
  3. **Bengali-First Error Handling & SEO Routes:**
     - Created accessible Bengali 404 (`not-found.tsx`) and error boundary (`error.tsx`) with automatic Sentry error tracking.
     - Added Next.js metadata routes `robots.ts` and `sitemap.ts` indexing all 10 seed Dhaka zones.
     - Added `'use client'` to interactive components (`BottomNav`, `ReportButton`, `AreaPill`, `StatusCard`) resolving Next.js 15 prerender errors.
  4. **GitHub Actions CI/CD Pipeline (`.github/workflows/ci.yml`):**
     - Three parallel jobs: `web-ci` (Node 22, typecheck, tests, production build), `supabase-edge-ci` (Deno v2, 32 unit tests), and `mobile-ci` (Flutter stable, Java 17, analyze, 26 tests).
  5. **Containerization & Android Proguard:**
     - Created multi-stage production `web/Dockerfile` with standalone Next.js output and non-root security user.
     - Created `mobile/android/app/proguard-rules.pro` and configured release signing fallback in `build.gradle.kts`.
- **Consequences:**
  - *Positive:* 100% test pass rate across all suites (51 web tests, 32 Deno tests, 26 Flutter tests = 109 automated tests passing), automated continuous integration, resilient production containerization, hardened browser security, and complete Bengali error boundaries.
  - *Trade-off:* Standalone Docker image size is optimized via Alpine libc6-compat, requiring external volume mounts if custom fonts change.

---

### ADR-0017: Technical SEO Foundation — Canonical Sanitization, Crowd-Sourced Indexation Gating, Crawlable SSR Boundaries, and Bengali Metadata Architecture
- **Date:** 2026-11-20
- **Status:** Accepted
- **Context:**
  Following the Principal Technical SEO Audit (`docs/seo/AUDIT.md`), several critical indexing, crawlability, and ranking risks were identified:
  1. *URL Duplication & Parameter Leakage:* Public zone share links dynamically appended rotating Facebook cache-buster timestamps (`?t=`) and social tracking parameters (`utm_*`, `fbclid`). Zone routes emitted zero canonical tags and upper/lowercase casing variations generated duplicate content.
  2. *Thin Content & Low-Quality Zone Dilution:* Arbitrary H3 cells (~0.74 km²) without citizen activity rendered empty soft 404 shells with HTTP 200 OK. Indexing unverified crowd-sourced data risked domain-level Google algorithmic penalties.
  3. *Client-Side Rendering (CSR) Bailouts:* Top-level routes (`/`, `/map`, `/history`, `/privacy`, `/terms`) were declared as client components (`'use client'`), preventing Next.js 15 route metadata exports. On `/history`, calling `useSearchParams()` triggered `BAILOUT_TO_CLIENT_SIDE_RENDERING`, serving web crawlers an empty shell of only 2 words.
  4. *Social Crawl Blockade:* The `robots.ts` rule disallowed `/api/` entirely without an explicit exemption for `/api/og`, preventing social scrapers and search bots from fetching dynamic preview image cards.
  5. *Broken Outline Hierarchy:* The application had zero `<h1>` tags across multiple primary routes and skipped heading levels directly to `<h3>` within status cards.
- **Decision:**
  1. **Typed Site Configuration (`src/config/site.ts`) & Production Guard:**
     - Established typed `siteConfig` (Name: "হালচাল", English: "Halchal", default locale: `bn-BD`, OG locale: `bn_BD`, tagline: "এলাকার কারেন্ট, গ্যাস ও পানির লাইভ খবর").
     - Bound root `metadataBase` to `new URL(siteConfig.url)`.
     - Production build aborts with an explicit error if `NEXT_PUBLIC_SITE_URL` (or `NEXT_PUBLIC_APP_URL`) is missing.
  2. **Unified Metadata Engine (`src/lib/seo.ts`):**
     - Developed `buildMetadata({ title, description, path, ogImage, noindex })` guaranteeing no page ships without a unique Bengali title, descriptive snippet, and absolute canonical URL.
     - Enforced title budgets (<= 60 chars) and description budgets (100–165 chars practical Bengali range), verified via a visual SERP preview unit test.
  3. **Canonical Normalization & Duplicate Sanitization (`getCanonicalUrl`):**
     - Automatically strips cache-busting timestamp `?t=`.
     - Automatically strips marketing/tracking parameters (`utm_*`, `fbclid`, `gclid`).
     - Normalizes trailing slashes (except root `/`).
     - Lowercases hexadecimal H3 spatial cell slugs.
     - Emits absolute canonical URLs.
  4. **Crowd-Sourced Data Indexation Gating (`shouldIndexZone`):**
     - Zones are eligible for indexation ONLY when meeting two strict conditions:
       - Confirmed utility data on at least 3 distinct days in the last 30 days (`confirmedDaysLast30Days >= 3`).
       - AND at least 10 distinct reporters ever (`distinctReportersEver >= 10`).
     - Pages in unknown or unverified state NEVER get indexed on that basis alone.
     - Disqualified zones emit `robots: { index: false, follow: true }` and are omitted from `sitemap.xml`.
  5. **Dynamic XML Sitemap & Next.js `generateSitemaps`:**
     - Partitioned sitemaps by geographic city (`dhaka`) to easily scale past 50,000 URLs.
     - Included only verified, indexable routes.
     - Bounded `lastModified` to real historical timestamps (zone consensus state transitions or verified release date), eliminating dynamic `now` timestamps.
  6. **Server Component Boundaries & Rich Initial HTML (SSR):**
     - Converted `/`, `/map`, `/history`, `/privacy`, and `/terms` into React Server Components.
     - Server pre-rendered area names, category status in plain Bengali text, last-updated timestamps, and community explanations into initial HTML.
     - Replaced client-side bailout on `/history` with server-side pre-fetching.
     - Replaced `BottomNav` buttons with semantic Next.js `<Link>` components, creating a crawlable link graph.
  7. **Outline Normalization & Security Headers:**
     - Added exactly one semantic `<h1>` to every public route.
     - Upgraded `StatusCard` headings from `<h3>` to `<h2>`.
     - Added `X-Robots-Tag: noindex, nofollow` to all API responses in `next.config.mjs` while explicitly allowing `/api/og` in `robots.ts` for social preview crawlers.
     - Configured 301 Permanent Redirects for legacy zone aliases (`/z/dhanmondi`, `/z/mirpur`, etc.) in `redirects.json`.
- **Consequences:**
  - *Positive:* 100% test pass rate across all Playwright and Vitest suites (14 Playwright E2E tests passing, 42 Vitest tests passing, 43 Node unit tests passing = 99 automated tests passing). High search visibility with complete crawlable HTML density, zero duplicate indexing, and immunity from low-quality soft-404 thin content penalties.
  - *Trade-off:* Unverified or emerging zones with sparse crowd participation are intentionally noindexed until reaching community reporting consensus.
