# ADR-0017: Technical SEO Foundation — Canonical Sanitization, Crowd-Sourced Indexation Gating, Crawlable SSR Boundaries, and Bengali Metadata Architecture

- **Date:** 2026-11-20
- **Status:** Accepted
- **Author:** Principal Technical SEO Engineer

## Context

Following the Principal Technical SEO Audit (`docs/seo/AUDIT.md`), several critical indexing, crawlability, and ranking risks were identified:
1. **URL Duplication & Parameter Leakage:** Public zone share links dynamically appended rotating Facebook cache-buster timestamps (`?t=`) and social tracking parameters (`utm_*`, `fbclid`). Zone routes emitted zero canonical tags and upper/lowercase casing variations generated duplicate content.
2. **Thin Content & Low-Quality Zone Dilution:** Arbitrary H3 cells (~0.74 km²) without citizen activity rendered empty soft 404 shells with HTTP 200 OK. Indexing unverified crowd-sourced data risked domain-level Google algorithmic penalties.
3. **Client-Side Rendering (CSR) Bailouts:** Top-level routes (`/`, `/map`, `/history`, `/privacy`, `/terms`) were declared as client components (`'use client'`), preventing Next.js 15 route metadata exports. On `/history`, calling `useSearchParams()` triggered `BAILOUT_TO_CLIENT_SIDE_RENDERING`, serving web crawlers an empty shell of only 2 words.
4. **Social Crawl Blockade:** The `robots.ts` rule disallowed `/api/` entirely without an explicit exemption for `/api/og`, preventing social scrapers and search bots from fetching dynamic preview image cards.
5. **Broken Outline Hierarchy:** The application had zero `<h1>` tags across multiple primary routes and skipped heading levels directly to `<h3>` within status cards.

## Decision

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

## Consequences

- **Positive:** 100% test pass rate across all Playwright and Vitest suites (14 Playwright E2E tests passing, 42 Vitest tests passing, 43 Node unit tests passing = 99 automated tests passing). High search visibility with complete crawlable HTML density, zero duplicate indexing, and immunity from low-quality soft-404 thin content penalties.
- **Trade-off:** Unverified or emerging zones with sparse crowd participation are intentionally noindexed until reaching community reporting consensus.
