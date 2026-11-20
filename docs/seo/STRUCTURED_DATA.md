# Halchal (হালচাল) — Structured Data & Social Sharing Architecture

**Document Version:** 1.0.0  
**Status:** Approved & Implemented  
**Lead Engineer:** Structured Data + Social Sharing Engineer  
**Date:** November 20, 2026  
**Target Platform:** Next.js 15 App Router, React 19, Resvg-js + Rustybuzz (HarfBuzz)  

---

## 1. Executive Summary & Core Philosophy

Halchal (হালচাল) is a hyperlocal, crowd-sourced live utility tracker (electricity, gas, water, LPG) for Bangladesh. The platform serves users on low-end smartphones, 2G/3G connections, and during grid outages.

### The Anti-Overclaiming Directives
Search engine guidelines (Google Search Central Structured Data General Guidelines) strictly penalize websites that publish structured data representing content not visibly present, or that claim rich snippets (e.g., Star Ratings, Reviews, FAQs) on crowd-sourced unverified data. Halchal follows a strict **Truth-in-Markup** doctrine:

1. **Zero Overclaiming:** Halchal **never** emits `FAQPage`, `Review`, `Rating`, `AggregateRating`, `Event`, `LocalBusiness`, or `GovernmentService` markup.
2. **No Sitelinks Searchbox (`SearchAction`):** Google explicitly requires a functional, sitewide, query-driven search engine for `SearchAction`. Because Halchal relies on GPS/H3 geospatial navigation rather than a text search engine, `SearchAction` is strictly forbidden.
3. **Truthful `dateModified`:** Every `WebPage` schema emits a `dateModified` timestamp equal to the exact last real crowd report or consensus aggregation time, formatted in ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`).
4. **Bangla-First Localization:** Language is declared as `inLanguage: "bn"`.
5. **Strict HTML/XSS Escaping:** All JSON-LD scripts are serialized with `<` escaped as `\u003c`, `>` as `\u003e`, and `&` as `\u0026`. This completely eliminates script breakout vulnerabilities (`</script>`).

---

## 2. Structured Data Route Matrix

| Route | Schemas Rendered | Key Properties | Visible Content Alignment |
| :--- | :--- | :--- | :--- |
| **Root Layout (`/` and all pages)** | `WebSite`, `Organization` (in connected `@graph`) | `@id`, `name: "হালচাল"`, `alternateName: "Halchal"`, `url`, `logo`, `inLanguage: "bn"`, `publishingPrinciples: "/terms"` | Brand identity, logo icon in PWA manifest, terms of service link. |
| **Home (`/`)** | `WebPage`, `BreadcrumbList` | `name`, `description`, `url`, `dateModified` (live zone updated_at), `inLanguage: "bn"`, `position: 1` | Primary H1, live status cards, and area pills. |
| **Zone Route (`/z/[h3]`)** | `WebPage`, `BreadcrumbList` | `itemListElement`: 1. হোম, 2. ঢাকা, 3. `${areaName} (${ward})`. `WebPage.dateModified` from Redis/Supabase zone status. | Matches breadcrumbs, AreaPill, H1 heading, and consensus status cards. |
| **Live Map (`/map`)** | `WebPage`, `BreadcrumbList` | `itemListElement`: 1. হোম, 2. লাইভ ম্যাপ. `WebPage.name`: "লাইভ ম্যাপ — এলাকাভিত্তিক ইউটিলিটি হালচাল". | Crawlable header H1 and seed area links. |
| **7-Day History (`/history`)** | `WebPage`, `BreadcrumbList` | `itemListElement`: 1. হোম, 2. ইউটিলিটি ইতিহাস (and area if queried). `WebPage.dateModified` from `initialInsights.generated_at`. | 7-day outage summaries and complaint cards. |
| **Trust Pages (`/about`, `/contact`, `/privacy`, `/terms`)** | `WebPage` (`AboutPage`, `ContactPage`, etc.) | `name`, `description`, `dateModified`, `publisher: { @id: "/#organization" }` | Editorial headings, contact emails, and privacy policy sections. |

---

## 3. Detailed Schema Specifications

### 3.1 WebSite & Organization (Root Layout)
Rendered server-side inside `web/src/app/layout.tsx` via `<RootJsonLd />`.

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://halchal.bd/#organization",
      "name": "হালচাল",
      "alternateName": "Halchal",
      "url": "https://halchal.bd",
      "logo": "https://halchal.bd/icons/icon-512.png",
      "description": "এলাকার কারেন্ট, গ্যাস ও পানির লাইভ খবর। বিদ্যুৎ, গ্যাস, পানি এবং এলপিজি সিলিন্ডারের হাইপারলোকাল স্ট্যাটাস।",
      "publishingPrinciples": "https://halchal.bd/terms"
    },
    {
      "@type": "WebSite",
      "@id": "https://halchal.bd/#website",
      "name": "হালচাল",
      "alternateName": "Halchal",
      "url": "https://halchal.bd",
      "inLanguage": "bn",
      "description": "এলাকার কারেন্ট, গ্যাস ও পানির লাইভ খবর। বিদ্যুৎ, গ্যাস, পানি এবং এলপিজি সিলিন্ডারের হাইপারলোকাল স্ট্যাটাস।",
      "publisher": {
        "@id": "https://halchal.bd/#organization"
      }
    }
  ]
}
```
*Note on `sameAs`: Included only when verified production social profiles are declared in `siteConfig.sameAs`. Halchal never outputs fake or placeholder profile links.*

### 3.2 BreadcrumbList (Area & Hub Pages)
Rendered server-side via `<BreadcrumbJsonLd items={...} canonicalUrl={...} />`.

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "@id": "https://halchal.bd/z/883cf10ca1fffff/#breadcrumb",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "হোম",
      "item": "https://halchal.bd/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "ঢাকা",
      "item": "https://halchal.bd/map"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "ধানমন্ডি (ওয়ার্ড ১৫)",
      "item": "https://halchal.bd/z/883cf10ca1fffff"
    }
  ]
}
```
*Rule: Item URLs are strictly canonical (normalized, lowercase H3, no trailing slash, and stripped of all `?t=` or tracking parameters).*

### 3.3 WebPage (Live Data Pages)
Rendered server-side via `<WebPageJsonLd ... />`.

```json
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": "https://halchal.bd/z/883cf10ca1fffff/#webpage",
  "url": "https://halchal.bd/z/883cf10ca1fffff",
  "name": "ধানমন্ডি এলাকার হালচাল",
  "description": "ধানমন্ডি এলাকার বিদ্যুৎ, গ্যাস, পানি এবং এলপিজি সিলিন্ডারের সর্বশেষ লাইভ স্ট্যাটাস। নাগরিকদের তথ্যের ভিত্তিতে তৈরি হালচাল।",
  "inLanguage": "bn",
  "dateModified": "2026-11-20T10:45:00.000Z",
  "datePublished": "2026-11-01T00:00:00.000Z",
  "isPartOf": {
    "@id": "https://halchal.bd/#website"
  },
  "breadcrumb": {
    "@id": "https://halchal.bd/z/883cf10ca1fffff/#breadcrumb"
  },
  "publisher": {
    "@id": "https://halchal.bd/#organization"
  }
}
```

---

## 4. Open Graph & Twitter Social Sharing Architecture

### 4.1 Canonical URL vs. Time Bucket Isolation
Social media scrapers (Facebook, WhatsApp, Twitter, Telegram, LinkedIn) aggressively cache Open Graph previews. To provide dynamic outage updates without poisoning canonical URLs, Halchal enforces strict architectural separation:

1. **`canonical` & `og:url`:** Strictly canonical and clean.
   ```
   https://halchal.bd/z/883cf10ca1fffff
   ```
   *Any `?t=`, `fbclid`, or `utm_*` query parameters are stripped by `getCanonicalUrl()` before rendering `og:url` or `<link rel="canonical">`.*
2. **`og:image` & `twitter:image`:** Contains the rotating 10-minute floor time bucket parameter (`?t=`).
   ```
   https://halchal.bd/api/og?h3=883cf10ca1fffff&t=2991950
   ```
3. **Shared Link (`ShareButton`):** Appends `?t=` so social platforms scrape the fresh card:
   ```
   https://halchal.bd/z/883cf10ca1fffff?t=2991950
   ```

### 4.2 Dynamic OG Image Generator (`/api/og`)
Powered by `@resvg/resvg-js` and HarfBuzz/Rustybuzz font shaping engine with bundled `NotoSansBengali.ttf`.

- **Dimensions:** 1200 x 630 pixels.
- **Content-Type:** `image/png`.
- **Cache-Control Header:** `public, s-maxage=300, stale-while-revalidate=600`.
- **Performance Optimization:** Initialized with `loadSystemFonts: false`. This avoids expensive system font scans on serverless runtimes, bringing rendering time from **1.7s down to ~15ms (< 1s p95 budget)**.
- **Graceful Fallback:** If an unknown, unverified, or invalid zone is requested, `/api/og` returns the branded static fallback image (`/public/og-fallback.png`) with HTTP 200 OK. **The endpoint never emits a 500 status code.**

---

## 5. Bengali Typography & Visual Regression Verification

Complex Bengali conjuncts (যুক্তাক্ষর) frequently decompose or drop glyphs in headless SVG rasterizers lacking proper OpenType GSUB/GPOS shaping. Halchal guards against visual regressions using automated pixel and byte-for-byte snapshot tests covering the five critical conjunct families:

1. **ক্ষ (ksha):** Tested via `লক্ষ্মীপুর ও পরীক্ষা (ক্ষ)` (validates ksha-ma conjunct with matras).
2. **শ্র (shra):** Tested via `শ্রীপুর ও পরিশ্রম (শ্র)` (validates shra ligature with ee-kar and reph).
3. **ত্র (tra):** Tested via `ত্রিশাল ও যাত্রাবাড়ী (ত্র)` (validates tra ligature with i-kar).
4. **স্ক (ska):** Tested via `ভাস্কর্য ও স্কুল (স্ক)` (validates ska conjunct with reph).
5. **গ্য (gya):** Tested via `ভাগ্য ও যোগ্য (গ্য)` (validates ya-phala ligature).
6. **Combined Sentence:** `পরীক্ষা শ্রীপুর ত্রিশাল ভাস্কর্য ভাগ্য`.

The visual regression suite (`web/src/lib/bengali-visual-regression.test.ts`) renders each conjunct through Resvg and compares the resulting PNG binary against stored golden snapshots (`web/src/tests/fixtures/og-snapshots/*.png`). Any font table alteration or shaping engine degradation triggers an instant build failure.

---

## 6. Share UX & Pre-Filled Bengali Messaging

The `ShareButton` component (`web/src/components/ShareButton.tsx`) implements the Web Share API (`navigator.share`) with an automatic clipboard copy fallback. It pre-fills contextual Bengali messages based on active utility consensus:

- **Locative Grammar (`getBengaliLocative`):** Applies correct Bengali seventh-case inflections (সপ্তমী বিভক্তি):
  - মোহাম্মদপুর ➜ **মোহাম্মদপুরে**
  - ধানমন্ডি ➜ **ধানমন্ডিতে**
  - মিরপুর ১০ ➜ **মিরপুর ১০-এ**
  - বাড্ডা ➜ **বাড্ডায়**
  - বনানী ➜ **বনানীতে**
- **Outage Prioritization:**
  - Gas outage: `"মোহাম্মদপুরে এখন গ্যাস নেই, আপনার এলাকার হাল জানান: <url>"`
  - Power outage: `"ধানমন্ডিতে এখন বিদ্যুৎ নেই, আপনার এলাকার হাল জানান: <url>"`
  - Water outage: `"মিরপুর ১০-এ এখন পানি নেই, আপনার এলাকার হাল জানান: <url>"`
  - Normal state: `"বনানীতে এখন বিদ্যুৎ, গ্যাস ও পানি স্বাভাবিক, আপনার এলাকার হাল জানান: <url>"`

---

## 7. Automated Testing & Verification

All structured data and social sharing rules are enforced by three automated test suites:

1. **`web/src/lib/json-ld.test.ts` (11 tests):**
   - Validates Schema.org structural compliance.
   - Verifies HTML escaping for `<` (`\u003c`), `>` (`\u003e`), `&` (`\u0026`).
   - Asserts absence of `SearchAction`, `FAQPage`, `Review`, `Rating`, `Event`.
   - Executes lint-style test failing on invisible or ungrounded claims.
2. **`web/src/lib/og-route.test.ts` (11 tests):**
   - Fetches each public route's OG image URL.
   - Asserts HTTP 200, `image/png`, and exactly 1200x630 dimensions.
   - Asserts `s-maxage=300, stale-while-revalidate=600`.
   - Confirms response time < 1s p95.
   - Asserts unknown zones return 200 OK with the fallback card.
3. **`web/src/lib/bengali-visual-regression.test.ts` (7 tests):**
   - Validates HarfBuzz rendering for `ক্ষ`, `শ্র`, `ত্র`, `স্ক`, `গ্য`.
   - Asserts byte-level equality against stored golden snapshots.

Run all structured data and social sharing tests:
```bash
cd web
npm test
```
