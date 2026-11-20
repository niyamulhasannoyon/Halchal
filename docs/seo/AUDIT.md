# Halchal (হালচাল) — Principal Technical SEO Audit & Architecture Review

**Auditor:** Principal Technical SEO Engineer  
**Date:** November 20, 2026  
**Target Platform:** Next.js 15.5.29 App Router (React 19, TypeScript 5.9.3, Tailwind CSS 4)  
**Repository State:** Production-Ready PWA Baseline (`main` branch)  
**Strict Directives:** Read-Only Codebase Audit; Strict Compliance with `CLAUDE.md` Privacy Rules (Zero Raw GPS, Absolute Anonymity, No Commercial Identification).

---

## 1. Executive Summary

Halchal (হালচাল) is architected as a high-performance, resilient, Bengali-first live utility tracker (electricity, gas, water, LPG) for Bangladesh. The application relies on Uber H3 Resolution 8 spatial cells (~0.74 km²), Supabase Edge Functions with PostgreSQL, Upstash Redis caching, and a Next.js 15 App Router Progressive Web Application (PWA).

This technical SEO audit was conducted via direct empirical inspection of the codebase, Next.js production build artifacts (`.next/`), network payload measurements, and raw HTML curl responses from a locally hosted production server (`next start -p 3001`) without JavaScript execution.

### Key Audit Findings:
1. **Critical Metadata Deficit:** RootLayout (`web/src/app/layout.tsx`) sets `metadataBase` and `lang="bn"`, but leaves Open Graph, Twitter, and canonical tags completely undefined. Because all top-level routes (`/`, `/map`, `/history`, `/privacy`, `/terms`) are declared as client components (`'use client'`), they cannot export route-specific metadata and inherit identical generic fallback title and description tags.
2. **Dynamic URL Duplication & Canonical Absence:** The public zone route (`/z/[h3]`) dynamically embeds a rotating 10-minute cache-busting timestamp parameter (`?t=`) into its `openGraph.url` property (`/z/[h3]?t=2991946`). The route defines **zero canonical tags**, resulting in infinite duplicate URLs in search engine indexes. Furthermore, reading `searchParams` inside `generateMetadata` de-optimizes the route from Incremental Static Regeneration (ISR `revalidate = 60`) into dynamic on-demand rendering with `Cache-Control: private, no-cache, no-store`.
3. **Severe Crawlability & CSR Bailout Gaps:**
   - On `/history`, calling `useSearchParams()` inside `<Suspense>` triggers Next.js `BAILOUT_TO_CLIENT_SIDE_RENDERING`. Crawlers fetching raw HTML receive an empty shell displaying only `"৭ দিনের তথ্য লোড হচ্ছে..."` (2 words total).
   - On `/map`, `MapLibreView` is dynamically imported with `ssr: false`, serving a static loading placeholder with zero internal links.
   - The primary navigation component (`BottomNav`) and the area selector (`AreaPickerModal`) render exclusively HTML `<button>` elements with JavaScript `onClick` handlers rather than semantic `<Link>` / `<a href="...">` tags. Without the XML sitemap, all zone pages (`/z/[h3]`), `/map`, and `/history` are completely orphaned from web crawler link discovery.
4. **JS Budget Breach vs CLAUDE.md Mandate:** `CLAUDE.md` Section 4.4 locks the home route JS budget to `< 150 KB` gzipped. Empirical measurement of the production build reveals an initial JS payload of **1,034.9 KB raw (309.5 KB gzipped)**, or **270.8 KB gzipped** excluding polyfills—nearly double the mandated budget.
5. **Accessibility & Heading Hierarchy Failure:** There is **no `<h1>` tag** on `/`, `/map`, `/history` (during SSR), or `/z/[h3]`. On both the home route and zone routes, heading hierarchy skips levels 1 and 2, starting directly at `<h3>` within the utility status cards.

---

## 2. In-Depth Technical SEO Breakdown

### 2.1 Metadata Architecture

| Route | Title | Description | Canonical Tag | Robots Meta Tag | Open Graph Tags | Twitter Tags |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`/` (Home)** | `হালচাল — এলাকার লাইভ ইউটিলিটি খবর` *(layout default)* | `এলাকার কারেন্ট, গ্যাস ও পানির লাইভ খবর...` *(layout default)* | **Missing** | **Missing** | **Missing** | **Missing** |
| **`/z/[h3]`** | `${areaName} এলাকার হালচাল — লাইভ ইউটিলিটি খবর` | `${areaName} এলাকার বিদ্যুৎ, গ্যাস, পানি...` | **Missing** | **Missing** | Set, but `og:url` binds to `/z/[h3]?t=${timeBucket}` | Set (`summary_large_image`) |
| **`/map`** | `হালচাল — এলাকার লাইভ ইউটিলিটি খবর` *(layout default)* | `এলাকার কারেন্ট, গ্যাস ও পানির লাইভ খবর...` *(layout default)* | **Missing** | **Missing** | **Missing** | **Missing** |
| **`/history`** | `হালচাল — এলাকার লাইভ ইউটিলিটি খবর` *(layout default)* | `এলাকার কারেন্ট, গ্যাস ও পানির লাইভ খবর...` *(layout default)* | **Missing** | **Missing** | **Missing** | **Missing** |
| **`/privacy`** | `হালচাল — এলাকার লাইভ ইউটিলিটি খবর` *(layout default)* | `এলাকার কারেন্ট, গ্যাস ও পানির লাইভ খবর...` *(layout default)* | **Missing** | **Missing** | **Missing** | **Missing** |
| **`/terms`** | `হালচাল — এলাকার লাইভ ইউটিলিটি খবর` *(layout default)* | `এলাকার কারেন্ট, গ্যাস ও পানির লাইভ খবর...` *(layout default)* | **Missing** | **Missing** | **Missing** | **Missing** |

#### Evidence & Analysis:
- **`metadataBase` Configuration:** In `web/src/app/layout.tsx:16`, `metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://halchal.bd')` is correctly configured. In local environments with `.env.local`, this resolves to `https://halchal420.vercel.app`.
- **HTML Language:** In `web/src/app/layout.tsx:59`, `<html lang="bn" className={hindSiliguri.variable} suppressHydrationWarning>` correctly establishes `lang="bn"` for Bengali localization.
- **Client Component Constraint:** Because `web/src/app/page.tsx:1`, `web/src/app/map/page.tsx:1`, and `web/src/app/history/page.tsx:1` all declare `'use client'`, Next.js App Router forbids exporting `metadata` or `generateMetadata` from these files. Consequently, all static pages share the exact same generic metadata fallback defined in `layout.tsx`.
- **Zone Route Metadata Flaw:** In `web/src/app/z/[h3]/page.tsx:55`, `openGraph.url` is constructed as:
  ```ts
  url: `/z/${h3}?t=${timeBucket}`,
  ```
  where `timeBucket = t || String(Math.floor(Date.now() / 600000));`. Because `timeBucket` rotates every 10 minutes, search engines encountering shared links receive divergent OG URLs for the same canonical entity. Crucially, `alternates: { canonical: ... }` is omitted in `generateMetadata`, leaving search engines without an authoritative canonical URL.

---

### 2.2 Crawlability & Rendering Boundaries

#### Robots & Sitemap Configuration:
- **`robots.ts` (`web/src/app/robots.ts:3-14`):**
  - Allows: `['/', '/map', '/history', '/privacy', '/terms', '/z/']`.
  - Disallows: `['/api/', '/admin/', '/auth/']`.
  - **Flaw 1 (OG Image Blocking):** Open Graph share cards are generated dynamically via `/api/og?h3=...`. Disallowing `/api/` without an explicit preceding `Allow: /api/og` blocks Googlebot-Image, Twitterbot, and Facebook External Hit from crawling the dynamically rendered social images.
  - **Flaw 2 (Leakage of Internal Routes):** Sensitive or thin routes including `/settings`, `/notifications`, `/login`, and `/design-preview` are omitted from `disallow`, leaving them open to crawler indexation.
- **`sitemap.ts` (`web/src/app/sitemap.ts:4-49`):**
  - Indexes 5 static routes (`/`, `/map`, `/history`, `/privacy`, `/terms`) and all 10 seed Dhaka zones (`/z/[h3]`).
  - **Flaw:** Line 6 sets `const now = new Date();` and applies it as `lastModified: now` for all entries. On every HTTP fetch to `/sitemap.xml`, the sitemap dynamically outputs the current second as `lastmod`. Search engines disregard rapidly mutating, non-verifiable `lastmod` headers.

#### Server vs Client Rendering & Zero-JS Visibility:
Empirical inspection of the raw HTML generated by the production build (`next start -p 3001`) reveals stark rendering disparities:

1. **Route `/` (Home):**
   - Renders 32 visible Bengali strings in raw HTML.
   - Outputs the header, default Dhanmondi area pill, 4 default status cards (all initialized to "খবর নেই" / 0 reports), report CTA button, and community disclaimer.
   - *Limitation:* The actual live status of the user's selected zone is only fetched client-side in `useEffect` via `fetchStatus(h3)`. A crawler without JavaScript always sees 4 "খবর নেই" cards.
2. **Route `/z/[h3]` (Zone):**
   - Renders 34 visible Bengali strings in raw HTML.
   - Server-side pre-renders the zone status cards based on Redis/Supabase state.
   - Good SSR content density for the 10 seed zones.
3. **Route `/map`:**
   - Renders **only 7 visible text tokens**.
   - Because `MapLibreView` is dynamically imported with `{ ssr: false }`, the canvas is completely omitted from SSR. The raw HTML contains only the loading skeleton: `"লাইভ হেক্স ম্যাপ লোড হচ্ছে..."`.
4. **Route `/history` (Complete Empty Shell):**
   - Renders **only 2 visible text tokens**: `"হালচাল — এলাকার লাইভ ইউটিলিটি খবর"` and `"৭ দিনের তথ্য লোড হচ্ছে..."`.
   - In `web/src/app/history/page.tsx:26`, calling `useSearchParams()` inside `<Suspense>` forces Next.js to inject `<template data-dgst="BAILOUT_TO_CLIENT_SIDE_RENDERING"></template>`.
   - The entire 7-day heatmap, outage summary, LPG price tracking, and complaint modal are client-rendered only. Search crawlers receive an empty loading shell.

---

### 2.3 URL Design & Canonicalization

1. **H3 Spatial Addressing:**
   - Zone URLs use Uber H3 Resolution 8 hexadecimal representations (e.g., `/z/883cf10ca1fffff`).
   - Resolution 8 guarantees ~0.74 km² spatial granularity, strictly upholding privacy by abstracting exact coordinates.
2. **Hexadecimal Case Sensitivity Risk:**
   - In `web/src/lib/zones.ts:165`, zone lookup is executed via:
     ```ts
     DHAKA_SEED_ZONES.find((z) => z.h3_index === h3Index)
     ```
     where all seed indexes are lowercase.
   - If an external user or crawler requests `/z/883CF10CA1FFFFF` (uppercase), `h3.isValidCell` succeeds, but `getZoneMetadata` returns `null`. The page degrades to a generic "ঢাকা এলাকা" fallback with default empty cards, generating duplicate content variations of the same geographic zone.
3. **Query Parameter Pollution (`?t=`):**
   - The dynamic cache buster `?t=${timeBucket}` on `/z/[h3]?t=...` is shared across social media and messaging channels.
   - Without a canonical tag, every shared link creates a distinct indexable URL in search engine discovery queues.
4. **Canonical Strategy:**
   - `web/src/app/layout.tsx` must define an `alternates.canonical: './'` rule or enforce canonical resolution per route.
   - On `/z/[h3]`, `generateMetadata` must explicitly emit:
     ```ts
     alternates: {
       canonical: `/z/${h3.toLowerCase()}`,
     }
     ```
     stripping all query parameters (`?t=`, tracking tokens).

---

### 2.4 Rendering, Caching & Data-Deficient Zone Handling

1. **ISR Defeat via `searchParams`:**
   - In `web/src/app/z/[h3]/page.tsx:15`, `export const revalidate = 60;` is declared to establish a 60-second Incremental Static Regeneration cache.
   - However, in `generateMetadata` (`web/src/app/z/[h3]/page.tsx:28-31`), awaiting `searchParams` (`const { t } = await searchParams;`) dynamically opts the page out of static caching in Next.js 15.
   - Verification via `curl -s -D - http://localhost:3001/z/883cf10ca1fffff` confirmed the server returns:
     ```http
     Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
     ```
     The 60-second ISR cache header is entirely bypassed.
2. **Soft 404 / Thin Content Risk on Arbitrary Zones:**
   - In `web/src/app/z/[h3]/page.tsx:83-85`, the code checks `if (!isValidH3Zone(h3)) notFound();`.
   - However, any mathematically valid H3 Resolution 8 index anywhere in the world passes `isValidH3Zone`.
   - If an arbitrary resolution 8 cell is accessed (e.g. outside Dhaka or in an unmonitored rural region), `getZoneMetadata` returns `null` and `statusData` initializes to `createDefaultZoneStatus(h3)`.
   - The route returns **HTTP 200 OK** with empty default cards ("তথ্য নেই", 0 reporters).
   - This exposes the domain to programmatic spam attacks and soft 404 penalties from search engines indexing thousands of empty coordinate cells.

---

### 2.5 Structured Data (JSON-LD)

- **Audit Result:** **Zero JSON-LD structured data exists in the entire repository.**
- Searching for `application/ld+json` across `web/src/` returns no matches.
- **Recommended Schema Graph:**
  1. **Root (`/`):** `WebSite` schema with `name: "Halchal (হালচাল)"`, `alternateName: "হালচাল"`, `inLanguage: "bn"`, and a `SearchAction` target.
  2. **Organization:** De-identified civic platform schema (`NGO` or civic platform `Organization`) defining community service mission and editorial verification standards.
  3. **Zone Routes (`/z/[h3]`):** `BreadcrumbList` schema linking `Home > ঢাকা > ${areaName}`.
  4. **Privacy Strictness (`CLAUDE.md` Rule 3):** Under no circumstances should `LocalBusiness` or commercial entity schema be injected. Commercial entities, shops, and dealer names are strictly forbidden by project privacy directives.

---

### 2.6 Performance & Core Web Vitals (2G/3G Optimization)

#### 1. Font Loading (Hind Siliguri):
- In `web/src/app/layout.tsx:7-13`, `Hind_Siliguri` is loaded with weights `['400', '500', '600', '700']` and `subsets: ['bengali']`.
- Inspection of the preloaded chunks in `.next/static/media/` shows that Next.js injects **4 separate `.woff2` font files** into `<head>`, totaling **~155.7 KB**:
  - `88f8bd08eee39201-s.p.woff2`: 40.2 KB
  - `a2026c2855f26d92-s.p.woff2`: 35.8 KB
  - `b799e40d1da4cba6-s.p.woff2`: 40.2 KB
  - `ffe82e8670ea94ea-s.p.woff2`: 39.6 KB
- While `display: 'swap'` prevents Flash of Invisible Text (FOIT), loading 4 weights simultaneously on congested 2G/3G networks in Bangladesh creates bandwidth contention during critical first contentful paint (FCP).

#### 2. Image Handling:
- The app utilizes zero `<img>` tags and zero `next/image` components.
- UI icons are lightweight inline SVGs from `lucide-react` or native Unicode emojis.
- The only image generation occurs on `/api/og` via `@resvg/resvg-js`, returning 1200x630 PNGs cached for 600 seconds.

#### 3. JavaScript Bundle Size vs Mandated Budget:
- `CLAUDE.md` Section 4.4 explicitly defines:
  > **Home Route JS Budget:** `< 150 KB` gzipped initial JavaScript bundle.
- Analysis of the 18 JavaScript chunks preloaded by `web/.next/server/app/index.html`:
  - **Total Uncompressed JS:** **1,034.9 KB**
  - **Total Gzipped JS:** **309.5 KB**
  - **Total Gzipped JS (excluding `noModule` polyfills):** **270.8 KB**
- The Home Route JS bundle exceeds the 150 KB budget by **+120.8 KB (+80.5%)**.
- **Root Cause:** Heavy client modal components (`ConsentScreen`, `AreaPickerModal`, `OneTapReportSheet`, `PushNotificationOptInModal`, `AuthModal`, `@supabase/supabase-js`, and `@sentry/nextjs`) are statically imported at the top of `HomePage.tsx` instead of being code-split with `next/dynamic`.

#### 4. Service Worker Pre-cache Behavior:
- In `web/src/lib/pwa.ts:20`, the Service Worker registration is properly deferred until `window.addEventListener('load')`, preventing first-paint contention.
- However, in `web/public/sw.js:17`, the service worker precache includes `/fonts/NotoSansBengali.ttf` (**463.7 KB raw**).
- Immediately upon initial page load completion, the background service worker downloads nearly half a megabyte of font data, saturating low-bandwidth mobile connections.

---

### 2.7 Indexing Risks & Thin Content

1. **Internal Styleguide Leakage (`/design-preview`):**
   - `web/src/app/design-preview/page.tsx` renders internal component sandboxes and color-blind filters.
   - It is neither disallowed in `robots.ts` nor tagged with `<meta name="robots" content="noindex, nofollow">`.
2. **Authenticated / Private Flow Leakage:**
   - `/login`, `/settings`, `/notifications`, and `/auth/callback` are indexable in their current state. They contain personalized or transactional interfaces offering zero search value.
3. **Data-Deficient Zone Indexation:**
   - `CLAUDE.md` Section 2.2 defines the `unknown` state:
     > `unknown` must NEVER be rendered as green. The absence of reports is not evidence of active utility service.
   - Indexing thousands of empty H3 zones where all 4 utilities are `unknown` dilutes site quality and risks algorithmic low-quality penalties (Google Helpful Content / thin content updates).
   - Zones without confirmed reports (`distinct_reporters < 3`) should emit `<meta name="robots" content="noindex, follow">`.

---

### 2.8 Internal Linking & Crawl Architecture

```
[Search Engine Crawler]
        │
        ▼
   Home Route (/)
        │
   (Only 1 link in HTML: <a href="/settings">)
        │
        ▼
  Settings (/settings)
   ┌────┴─────────────────┐
   ▼                      ▼
Privacy (/privacy)   Terms (/terms)
```

#### The Orphaned Zones Problem:
- Inspection of `web/.next/server/app/index.html` revealed **exactly one HTML link**:
  ```html
  <a aria-label="নোটিফিকেশন সেটিংস" href="/settings">...</a>
  ```
- **Zero internal links exist from `/` to any zone page (`/z/[h3]`).**
- The area picker (`AreaPickerModal.tsx:84-96`) outputs `<button type="button" onClick={...}>` instead of semantic `<Link href={'/z/' + zone.h3_index}>`.
- The global navigation bar (`BottomNav.tsx:94-100`) uses `<button type="button" onClick={() => handleTabClick(tab.id)}>` instead of `<Link>` tags for `/`, `/map`, and `/history`.
- The Live Map (`/map`) triggers navigation exclusively via MapLibre canvas clicks (`router.push('/z/' + h3)`).
- **Result:** Without reading the XML sitemap, search engine web crawlers are completely unable to discover any zone page, the live map, or the history dashboard through natural link graph traversal.

---

### 2.9 Accessibility Items Overlapping with SEO

1. **Heading Hierarchy (WCAG 2.1 & HTML5 Outline):**
   - **Route `/`:** Has **zero `<h1>`** and **zero `<h2>`**. The site name in the HUD header is enclosed in a `<span>` (`web/src/app/page.tsx:262`). The first headings encountered in the DOM are four `<h3>` elements inside `StatusCard.tsx:82` (`<h3>বিদ্যুৎ</h3>`, `<h3>গ্যাস</h3>`, etc.).
   - **Route `/z/[h3]`:** Has **zero `<h1>`** and **zero `<h2>`**. Headings skip directly to `<h3>`.
   - **Route `/map`:** Has **zero headings of any level**.
   - **Route `/history`:** During SSR, has **zero headings** due to CSR bailout.
2. **Interactive Element Semantics:**
   - In `StatusCard.tsx:70-82`, the component applies `role="button"` to a `<div>` that encloses an `<h3>`. Placing heading elements inside button roles creates accessibility parsing conflicts for screen readers and breaks semantic DOM outlines.
3. **Link vs Button Semantics:**
   - Navigation elements in `BottomNav` represent destination URLs (`/`, `/map`, `/history`), yet are coded as script buttons rather than navigational anchors (`<a>`).

---

## 3. Comprehensive Table of Findings

| ID | Area | Evidence (`file:line`) | Severity | Recommended Fix |
| :--- | :--- | :--- | :--- | :--- |
| **MET-01** | Metadata | `web/src/app/z/[h3]/page.tsx:55` | **High** | Remove `?t=${timeBucket}` from `openGraph.url`. Set canonical URL strictly to `/z/${h3.toLowerCase()}` without query parameters. |
| **MET-02** | Metadata | `web/src/app/layout.tsx:15-27` | **High** | Add base `openGraph`, `twitter`, and `alternates.canonical` definitions to `RootLayout`. |
| **MET-03** | Metadata | `web/src/app/page.tsx:1`<br>`web/src/app/map/page.tsx:1`<br>`web/src/app/history/page.tsx:1` | **High** | Split client components into Server Component wrappers (`page.tsx`) with dedicated static `Metadata` exports, delegating interactive logic to client views. |
| **CRW-01** | Crawlability | `web/src/app/history/page.tsx:26-36` | **High** | Eliminate `BAILOUT_TO_CLIENT_SIDE_RENDERING`. Pre-fetch default/zone insights on the server in a Server Component wrapper and pass as initial props. |
| **CRW-02** | Crawlability | `web/src/app/robots.ts:10` | **Med** | Update robots rules to `allow: ['/api/og']` before `disallow: ['/api/']`. Add `/admin/`, `/auth/`, `/settings`, `/notifications`, `/login`, and `/design-preview` to disallow. |
| **CRW-03** | Crawlability | `web/src/app/sitemap.ts:6` | **Med** | Remove dynamic `new Date()` timestamp on every fetch. Bind `lastModified` to build time or true zone update timestamps. |
| **URL-01** | URL Design | `web/src/app/z/[h3]/page.tsx:26-72` | **High** | Enforce lowercase H3 normalization in `page.tsx` and emit `<link rel="canonical" href="https://halchal.bd/z/${h3.toLowerCase()}">`. |
| **RND-01** | Caching | `web/src/app/z/[h3]/page.tsx:28-31` | **High** | Remove `searchParams` from `generateMetadata` on `/z/[h3]`. Let OG image routes use deterministic hashes to restore 60-second ISR caching (`x-nextjs-cache: HIT`). |
| **RND-02** | Thin Content | `web/src/app/z/[h3]/page.tsx:118-120` | **High** | When an arbitrary H3 cell has zero data or is unseeded, emit `<meta name="robots" content="noindex, follow">` or return 404 to avoid indexing empty soft 404 shells. |
| **STR-01** | Structured Data | `web/src/app/layout.tsx`<br>`web/src/app/z/[h3]/page.tsx` | **Med** | Inject validated JSON-LD `WebSite` schema on root and `BreadcrumbList` schema on zone pages. Strictly avoid commercial entities per `CLAUDE.md`. |
| **CWV-01** | CWV / Budget | `web/src/app/page.tsx:13-33`<br>`web/.next/server/app/index.html` | **High** | Code-split non-critical modals (`ConsentScreen`, `AreaPickerModal`, `OneTapReportSheet`, `AuthModal`) using `next/dynamic` to reduce initial gzipped JS from 271 KB to < 150 KB. |
| **CWV-02** | Font Loading | `web/src/app/layout.tsx:7-13` | **Low** | Subset font weights to `['400', '700']` on initial load (reducing preloaded font payload by ~75 KB). Load intermediate weights asynchronously. |
| **LNK-01** | Internal Linking | `web/src/components/BottomNav.tsx:94-100` | **High** | Refactor `BottomNav` buttons to semantic Next.js `<Link>` components (`href="/"`, `href="/map"`, `href="/history"`). |
| **LNK-02** | Internal Linking | `web/src/components/AreaPickerModal.tsx:84-96` | **High** | Add crawlable semantic `<Link href={'/z/' + zone.h3_index}>` anchors or provide a crawlable HTML zone directory in the footer. |
| **A11Y-01** | Headings | `web/src/app/page.tsx:262`<br>`web/src/app/z/[h3]/ZoneViewClient.tsx` | **High** | Add a semantic `<h1>` to `/` (`<h1>হালচাল — এলাকার লাইভ ইউটিলিটি খবর</h1>`) and `/z/[h3]` (`<h1>${areaName} এলাকার লাইভ ইউটিলিটি হালচাল</h1>`). |
| **A11Y-02** | Headings | `web/src/components/StatusCard.tsx:82` | **Med** | Change `<h3>` inside `StatusCard` to `<h2>` (or semantic `<span>`), resolving the skipped heading hierarchy. Remove headings from within interactive `role="button"` elements. |

---

## 4. Prioritized Action Plan

### Phase 1: Critical Fixes (P0 — Immediate Deploy)
1. **Fix Canonical & OpenGraph Parameter Leakage (`/z/[h3]`):**
   - In `web/src/app/z/[h3]/page.tsx`, remove `?t=${timeBucket}` from `openGraph.url`.
   - Add explicit canonical tags:
     ```ts
     alternates: {
       canonical: `/z/${h3.toLowerCase()}`,
     }
     ```
   - Stop reading `searchParams` in `generateMetadata` so ISR caching (`revalidate = 60`) functions properly.
2. **Add Missing `<h1>` Elements Across All Key Routes:**
   - Add accessible, visually polished (or screen-reader accessible where appropriate) `<h1>` headings to `/` and `/z/[h3]`.
   - Promote `<h3>` in `StatusCard` to `<h2>` so the heading hierarchy is unbroken (`h1 > h2`).
3. **Exempt OG Image Route from Robots Disallow:**
   - Update `web/src/app/robots.ts` to allow `/api/og` so social platforms and image search engines can crawl share cards:
     ```ts
     rules: {
       userAgent: '*',
       allow: ['/', '/map', '/history', '/privacy', '/terms', '/z/', '/api/og'],
       disallow: ['/api/', '/admin/', '/auth/', '/settings', '/notifications', '/login', '/design-preview'],
     }
     ```

### Phase 2: Crawlability & Architecture Upgrades (P1 — Next Release)
1. **Eliminate Client-Only Shell on `/history`:**
   - Convert `web/src/app/history/page.tsx` into a Server Component that fetches initial 7-day insights for the default zone (or requested `h3`), passing pre-rendered data to a client interactive view. This eliminates Next.js `BAILOUT_TO_CLIENT_SIDE_RENDERING`.
2. **Convert Navigation to Semantic `<Link>` Elements:**
   - In `web/src/components/BottomNav.tsx`, replace `<button onClick>` with `<Link href="...">`.
   - In `web/src/app/page.tsx`, add a crawlable footer or seed zone navigation links (`ধানমন্ডি`, `মিরপুর`, `গুলশান`, etc.) so crawlers can discover all 10 seed zones directly from the home page.
3. **Noindex Guard for Empty / Unverified Zones:**
   - In `web/src/app/z/[h3]/page.tsx`, check if the zone is unseeded or has zero confirmed reports. If so, emit `robots: { index: false, follow: true }` to protect domain crawl budget and avoid thin content penalties.

### Phase 3: Performance & CWV Optimization (P2)
1. **Enforce 150 KB Home Route JS Budget (`CLAUDE.md` Mandate):**
   - Apply `next/dynamic` to `OneTapReportSheet`, `AreaPickerModal`, `ConsentScreen`, `PushNotificationOptInModal`, and `AuthModal`.
   - These components are only visible upon user action and should not be bundled in the initial page chunk. This will reduce initial gzipped JS from **270.8 KB** to well under **150 KB**.
2. **Add Structured Data (JSON-LD):**
   - Inject static JSON-LD for `WebSite` in `layout.tsx` and `BreadcrumbList` in `ZonePage`. Ensure strict compliance with `CLAUDE.md` privacy rules (no vendor/shop schema).

### Phase 4: Hygiene & Maintenance (P3)
1. **Sitemap Hygiene:**
   - Fix `web/src/app/sitemap.ts` to use real zone update timestamps instead of `new Date()` on every request.
2. **Font Weight Trimming:**
   - Limit `Hind_Siliguri` preloading to weights `400` and `700`, deferring weights `500` and `600`.

---

## 5. Items Not Verified & Why

During this read-only audit, the following external production factors could not be verified:

1. **Google Search Console (GSC) Performance & Index Coverage:**
   - Access to live GSC data for `halchal.bd` or `halchal420.vercel.app` is unavailable in the local environment. Actual indexing status, excluded URLs, and crawl error logs (404, 5xx) could not be observed.
2. **Real-User Core Web Vitals (CrUX Field Data):**
   - Laboratory measurements were taken from the local production build. However, true Chrome User Experience Report (CrUX) field data—reflecting actual low-end Android devices on 2G/3G networks in Dhaka and rural Bangladesh—requires live origin traffic monitoring over a 28-day aggregation window.
3. **Edge CDN Cache Invalidation in Multi-Region Production:**
   - While local headers confirmed that `searchParams` prevents local ISR caching, edge CDN behaviors (e.g. Vercel Edge Network or Cloudflare cache-tag invalidation rules) depend on cloud deployment configuration not accessible from local static analysis.
4. **Googlebot HarfBuzz Bengali Conjunct Rendering Latency:**
   - Googlebot's Web Rendering Service (WRS) renders pages using a headless Chromium instance. While the local server confirmed SVG conjunct rendering via `@resvg/resvg-js`, the exact WRS render queue latency and font fallback timing on Google's headless rendering fleet cannot be simulated locally.
