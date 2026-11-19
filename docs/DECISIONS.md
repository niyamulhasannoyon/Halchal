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
