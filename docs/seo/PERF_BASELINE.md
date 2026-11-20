# Halchal — Core Web Vitals & Performance Baseline (Pre-Optimization)

> **Test Environment:** Mobile Emulation (Moto G4 / Pixel 2, throttled simulated 3G/4G network: 1.6 Mbps down, 750 kbps up, 150 ms RTT, 4x CPU slowdown), Lighthouse 13.6.0 on Chrome 145 / macOS, Next.js 15.5.29 production build.  
> **Date:** November 20, 2026.  
> **Directive:** "Measure first, change second. Do not claim improvements without before/after numbers."

---

## 1. Executive Summary of Baseline Deficiencies

1. **JS Bundle Budget Breach:**  
   - Home route (`/`): **269 kB** First Load JS (Next.js build) / **307.2 KB** network JS transfer. Budget is **<= 150 KB** gzipped (CLAUDE.md Section 4.4).
   - Area route (`/dhaka/mohammadpur`): **189 kB** First Load JS / **297.4 KB** network JS transfer. Budget is **<= 150 KB** gzipped.
   - Primary cause: `h3-js` (~450 KB uncompressed) is statically imported inside `src/lib/zones.ts`, forcing it into the shared bundle loaded across every page.
2. **Home Route LCP Hijacked by Client-Side Consent Modal:**  
   - Home LCP is **4.5 seconds** (4,455 ms).
   - The LCP element is identified as `<span>আপনার এলাকার বিদ্যুৎ, গ্যাস ও পানির সঠিক লাইভ অবস্থা দেখাতে এবং ভুয়া রিপোর্ট প্রতিরোধ করতে অবস্থান জানা আবশ্যক।</span>` inside `ConsentScreen`.
   - On initial visit, client-side hydration mounts the modal asynchronously, displacing the server-rendered utility status cards and destroying the LCP score.
3. **Map Route Main-Thread Blocking (TBT):**  
   - `/map` has a Total Blocking Time of **4,280 ms** on simulated mobile CPU, dragging Performance score down to 69.
4. **Font Loading & Fallback Optimization:**  
   - Currently uses `Hind_Siliguri` via `next/font/google` with weights `['400', '500', '600', '700']`. Loading 4 weights increases font payload; fallback does not have size-adjust metrics to prevent layout shifts.
5. **Service Worker Pre-caching HTML:**  
   - `web/public/sw.js` pre-caches `/` in `STATIC_PRECACHE` and serves cached navigation requests without excluding crawlers or `/api/og` or dynamic sitemaps.

---

## 2. Baseline Metrics per Route

| Route | Route Type | First Load JS (Build) | JS Transfer (Network) | Total JS (Uncompressed) | LCP | FCP | TBT | CLS | Speed Index | Perf | A11y | SEO | LCP Element |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`/` (Home)** | Static/ISR | 269 kB | 307.2 KB | 995.8 KB | **4.5 s** | 0.8 s | 170 ms | 0.000 | 0.9 s | 82 | 91 | 100 | Consent modal paragraph (client flash) |
| **`/dhaka` (City)** | SSG/ISR | 107 kB | 297.4 KB | 965.4 KB | 0.8 s | 0.8 s | 140 ms | 0.000 | 0.8 s | 99 | 89 | 100 | H1 City summary text block |
| **`/dhaka/mohammadpur` (Area)** | SSG/ISR | 189 kB | 297.4 KB | 965.4 KB | 0.8 s | 0.8 s | 60 ms | 0.000 | 0.8 s | 100 | 94 | 100 | H1 Area summary text block |
| **`/map` (Live Map)** | Static | 110 kB | 587.5 KB | 2,541.5 KB | 0.8 s | 0.8 s | **4,280 ms** | 0.000 | 3.5 s | 69 | 87 | 100 | Header text block |
| **`/history` (Insights)** | Dynamic/ISR | 196 kB | 313.7 KB | 1,021.6 KB | 0.8 s | 0.8 s | 350 ms | 0.000 | 1.3 s | 92 | 89 | 100 | Trend insight quote text |

---

## 3. Bundle Breakdown Analysis (Next.js 15.5)

```
Route (app)                                      Size  First Load JS
┌ ○ /                                         5.63 kB         269 kB   [EXCEEDS 150 KB BUDGET]
├ ● /[city]                                     178 B         107 kB   [OK]
├ ● /[city]/[area]                            1.53 kB         189 kB   [EXCEEDS 150 KB BUDGET]
├ ● /[city]/[area]/[category]                   178 B         107 kB   [OK]
├ ○ /map                                      2.86 kB         110 kB   [OK - loads MapLibre chunk dynamically]
└ ƒ /history                                  14.9 kB         196 kB   [EXCEEDS 150 KB BUDGET]

+ First Load JS shared by all                  103 kB
  ├ chunks/1255-b84741b894bb9354.js           46.6 kB
  ├ chunks/4bd1b696-f785427dddbba9fb.js       54.2 kB
  └ other shared chunks (total)               2.51 kB
```

---

## 4. Key Target Improvements

1. **JS Budget Reduction:** Eliminate `h3-js` from the common bundle so Home and Area pages drop below **150 KB** First Load JS.
2. **LCP Restoration on `/`:** Ensure the status text block (or header) is the LCP element and server-rendered without consent modal flash; LCP target < **1.5 s** on mobile throttled.
3. **Accessibility & Contrast Improvements:** Push Accessibility score from 87–91 to **>= 95** across all routes.
4. **TBT Reduction on `/map` and `/history`:** Defer non-critical execution and optimize MapLibre initialization.
5. **Service Worker Hardening:** Eliminate HTML caching for crawlers, bypass `/api/og` and sitemaps, version cache keys.
