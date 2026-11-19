# Halchal (হালচাল) — Project Rules & Architectural Directives

> **Tagline:** "এলাকার কারেন্ট, গ্যাস ও পানির লাইভ খবর"  
> **Mission:** Hyperlocal, crowd-sourced live utility status platform (electricity, gas, water, LPG) for Bangladesh, designed for cheap Android smartphones, 2G/3G networks, and active blackout conditions.

---

## 1. Core Product & Operating Context

1. **One-Tap Reporting:** Users tap a single button to report the utility state of their area.
2. **Hyperlocal Visibility:** Neighbors view real-time color- and pattern-coded statuses mapped by geographic area.
3. **Bengali-First Interface:** All UI text, notifications, badges, numbers, and dates must be natively rendered in Bengali.
4. **Extreme Resilience:** Optimized for low-end hardware, high-latency 2G/3G connectivity, and operation during prolonged grid blackouts.
5. **Community Disclaimer:** Every view must clearly state that all displayed statuses are **"community-reported, not an official measurement"** (`নাগরিকদের তথ্যের ভিত্তিতে তৈরি, এটি কোনো অফিশিয়াল পরিমাপ নয়`).

---

## 2. Locked Decisions

These decisions are binding and must not be altered without explicit human approval recorded in `docs/DECISIONS.md`.

### 2.1 Spatial Unit & Coordinates (Uber H3 Res 8)
- **Resolution:** Uber H3 Resolution 8 (average cell area ~0.74 km², edge length ~460 m).
- **Computation:** H3 index is computed **server-side** from raw latitude/longitude inside the Edge Function.
- **Database Independence:** **DO NOT** depend on a PostgreSQL H3 extension (`pg-h3`). Store H3 cell identifiers as native text/bigint columns in Postgres.

### 2.2 Category & Report States (Extensible Enums)
- **Utility Categories (Enum):**
  - `electricity`
  - `gas`
  - `water`
  - `lpg`
  - *Extensibility Rule:* Adding future categories (e.g., `internet`, `drain`, `streetlight`) must require only an enum value addition and a configuration table row. **Never redesign the schema for new categories.**
- **User Report States (Enum):**
  - `ok` (স্বাভাবিক / আছে)
  - `low` (স্বল্প / চাপ কম / সমস্যা)
  - `out` (নেই / বন্ধ)
- **Zone Display States Shown to Users (Enum):**
  - `ok` — **Green** (স্বাভাবিক / সচল)
  - `low` — **Amber** (স্বল্প / চাপ কম)
  - `out` — **Red** (বন্ধ / সংযোগ বিচ্ছিন্ন)
  - `unverified` — **Gray with dashed border/pattern** (অনিশ্চিত — reports exist but do not meet confirmation threshold)
  - `unknown` — **Neutral gray** (তথ্য নেই — no recent reports)
  - *Golden Rule:* **`unknown` must NEVER be rendered as green.** The absence of reports is not evidence of active utility service.

### 2.3 Consensus & Confirmation Thresholds
A zone state changes from `unverified` or `unknown` to a confirmed state (`ok`, `low`, or `out`) **ONLY** when both conditions are satisfied:
1. `distinct_reporters >= 3` (at least 3 separate user accounts)
2. `weighted_trust_score >= 3.0`
- **Collusion Guard:** **A single high-trust user can NEVER confirm a state alone.** Both conditions are strictly mandatory.

### 2.4 Technology Stack
- **Database & Auth:** Supabase (PostgreSQL 15+, Supabase Auth, Row Level Security, Edge Functions).
- **Caching & Rate Limiting:** Upstash Redis (rate limiting, distributed locks, hot zone cache).
- **Web Client:** Next.js 15 App Router PWA (TypeScript, React 19).
- **Styling:** Tailwind CSS.
- **Mapping:** MapLibre GL JS (lazy-loaded, client-side vector/raster tiles).
- **Mobile (Future):** Flutter (Android-first, to be built in `mobile/`).

### 2.5 Auth & User Trust Lifecycle
- **First Open:** Supabase Anonymous Auth session is provisioned immediately.
  - Read access is 100% free and unrestricted.
  - Anonymous users are permitted to submit reports, but their trust weight is low (e.g., weight = 1.0).
- **Account Upgrade:** Seamless upgrade path to Google Sign-In or SMS/WhatsApp Phone OTP to earn higher trust weights.

### 2.6 Server-Side Write Isolation
- **All writes must route through the Supabase Edge Function `submit-report`** executing with the service role.
- **Clients must NEVER insert or update report tables directly.**
- Direct client `INSERT`/`UPDATE` policies on the raw report tables are disabled via Row Level Security (RLS).

---

## 3. Non-Negotiable Privacy Rules

Any pull request or code change violating these rules will be rejected immediately:

1. **Zero Raw GPS Storage:**
   - Never persist raw GPS coordinates (`latitude`, `longitude`) or street addresses in any database table, log, or telemetry stream.
   - Lat/Lng is passed into `submit-report`, converted to an H3 index in volatile memory, checked against Bangladesh geographic bounds, and immediately dropped from memory.
2. **Absolute Anonymity Between Users:**
   - Reports are completely anonymous to other users.
   - User IDs, device fingerprints, auth metadata, and per-user historical reports must never be exposed via public APIs, Realtime channels, or client payloads.
3. **No Commercial Entity Identification:**
   - Never store or display shop names, dealer identities, or private vendor locations.
   - LPG cylinder prices are displayed exclusively as H3 area-level averages/medians with a minimum threshold of **at least 5 distinct reports**. If fewer than 5 reports exist, suppress the price display.
4. **72-Hour Raw Data TTL:**
   - Raw individual user reports must be permanently deleted after 72 hours via automated cleanup jobs (pg_cron / Supabase scheduled functions).
   - Only aggregated, de-identified H3 zone statistics remain long-term.

---

## 4. Engineering & Code Quality Rules

### 4.1 Language & Type Safety
- **Strict TypeScript:** `"strict": true`, `"noImplicitAny": true`. The use of `any` is forbidden; use `unknown` with type guards or strict Zod schemas.
- **SQL via Migrations Only:** All database schemas, RLS policies, views, triggers, and functions must be stored as versioned `.sql` files inside `supabase/migrations/` managed via Supabase CLI. Never apply manual unversioned SQL.

### 4.2 Automated Testing Mandate
- Every business rule must have automated test coverage:
  - **SQL & Postgres Functions:** Tested via `pgTAP` in `supabase/tests/`.
  - **Consensus, Trust Scores, Expiry, Rate Limits, Edge Functions:** Tested via Vitest.
  - No pull request should alter consensus rules without passing regression tests.

### 4.3 Secrets Management
- All credentials, API keys, and service tokens must reside in environment variables.
- Maintain an accurate `.env.example` in both root and subdirectories.
- Service role keys, Upstash admin tokens, and private database credentials must **never** be imported into client-side bundles (no `NEXT_PUBLIC_` prefix for secrets).

### 4.4 Performance & Network Budgets (2G/3G Optimization)
- **Home Route JS Budget:** `< 150 KB` gzipped initial JavaScript bundle.
- **Map Lazy-Loading:** The MapLibre GL canvas must be lazy-loaded on user request or deferred until initial critical HTML/CSS renders.
- Provide a fast, zero-JS or minimal-JS fallback view (zone status cards/list) for slow 2G connections before the map loads.
- Aggressive caching: Zone summary responses should be cached via Upstash / HTTP edge caching with stale-while-revalidate headers.

### 4.5 Accessibility (a11y) & Visual Standards
- **Color Independence:** Status must **never** be communicated by color alone. Every indicator must combine:
  - Color (Green / Amber / Red / Gray)
  - Dedicated SVG Icon (Check / Exclamation / Cross / Question mark)
  - Explicit Bengali label ("স্বাভাবিক", "স্বল্প", "বন্ধ", "অনিশ্চিত", "তথ্য নেই")
  - Distinct border pattern or fill texture (e.g., solid, striped, dashed).
- **Legibility:** Minimum body text size is `16px`.
- **Contrast:** Contrast ratio >= `4.5:1` for normal text against its background.
- **Motion:** Respect `prefers-reduced-motion` media query; disable transitions and pulsing animations when requested.

### 4.6 Internationalization (i18n) & Bengali Localization
- All customer-facing strings must be in Bengali and centralized in a single dictionary file (e.g., `web/src/locales/bn.json` or `web/src/lib/i18n/bn.ts`).
- English strings are forbidden in user UI components.
- Numbers, timestamps, and durations must be formatted with Bengali numerals (`০-৯`) using `Intl.NumberFormat('bn-BD')` and `Intl.DateTimeFormat('bn-BD')`.

---

## 5. Repository Structure

```
Halchal/
├── CLAUDE.md                    # This document (binding project instructions)
├── docs/                        # Architecture, specs, and decision records
│   ├── DECISIONS.md             # Chronological architectural decision records
│   └── ARCHITECTURE.md          # System design diagrams and flowcharts
├── supabase/                    # Backend database & edge functions
│   ├── config.toml              # Supabase CLI configuration
│   ├── migrations/              # Sequential, versioned SQL migrations
│   ├── functions/               # Deno-based Supabase Edge Functions
│   │   └── submit-report/       # Single write gateway for user reports
│   └── tests/                   # pgTAP and database integration tests
├── web/                         # Next.js 15 PWA frontend
│   ├── public/                  # Manifest, icons, offline fallback
│   ├── src/
│   │   ├── app/                 # App Router pages and layouts
│   │   ├── components/          # Reusable accessible UI components
│   │   ├── lib/                 # H3 utilities, Supabase client, i18n
│   │   └── styles/              # Tailwind CSS configuration
│   ├── package.json
│   └── tsconfig.json
├── mobile/                      # Flutter app (Android-first; planned for later phase)
└── .env.example                 # Template for required environment variables
```

---

## 6. Rules for Future AI Sessions

1. **Verify Before Suggesting:** Before introducing any new library or refactoring existing pipelines, check compatibility with the `< 150 KB` gzipped bundle budget and strict privacy guidelines.
2. **Never Create Tables for New Utility Types:** If asked to support water pumps or internet providers, use the extensible enum/configuration table mechanism.
3. **Never Allow Direct DB Writes:** Do not write frontend code that calls `supabase.from('reports').insert(...)`. Always point to the `submit-report` Edge Function.
4. **Document Every Architectural Decision:** If a new architectural trade-off or technical decision is made during a session, record it in `docs/DECISIONS.md` following the standard format (Date, Status, Context, Decision, Consequences).
