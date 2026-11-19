# Halchal (হালচাল)

> **"এলাকার কারেন্ট, গ্যাস ও পানির লাইভ খবর"**  
> Hyperlocal, crowd-sourced live utility status platform (electricity, gas, water, LPG) for Bangladesh, engineered for low-cost Android smartphones, 2G/3G networks, and active grid blackout conditions.

---

## ⚡ Architecture & Core Capabilities

- **Next.js 15 App Router PWA:** React 19, TypeScript, Tailwind CSS v4, Bengali-first interface.
- **Cheap & Fast Read Path (`GET /api/zone/[h3]`):** Tiered caching via Upstash Redis (`zone:status:{h3}`, TTL 60s) with on-miss fallback to Supabase RPC `get_zone_status`. Served with `Cache-Control: s-maxage=30, stale-while-revalidate=60`.
- **Sub-5-Second OneTap Reporting:** Step 1 Category ➜ Step 2 State (ok/low/out) with optional LPG price chips. Immediate Optimistic UI.
- **Offline-First Resilience:** Offline reports are safely stored in IndexedDB (`idb-keyval`) with `client_ts` and persistent device UUID. Auto-prunes items older than 30 minutes. Auto-flushes upon reconnection, window focus, or Service Worker Background Sync (`sync-reports`).
- **Live Hex Map (`/map`):** Interactive MapLibre GL hex grid using Uber H3 Resolution 8 (`gridDisk k=3`). Dynamically lazy-loaded to preserve the `< 150 KB` gzipped initial home page bundle budget.
- **Non-OSM Dark Basemap:** Uses CartoDB Dark Matter / MapTiler Dataviz dark vector/raster styles, strictly adhering to OpenStreetMap's usage policy by completely avoiding `tile.openstreetmap.org`.
- **Typographically Verified Share Card (`/api/og`):** Renders high-fidelity 1200x630 Open Graph PNGs with `resvg-js` and `NotoSansBengali.ttf`. Leverages Rustybuzz (HarfBuzz port) to ensure 100% correct shaping of complex Bengali conjuncts (ক্ষ, শ্র, ত্র, স্ক, ষ্ণ, হ্ম, ণ্ড). Share URLs carry a 10-minute floor time bucket (`?t=floor(now/10min)`) to prevent stale social media crawler caches.
- **PWA Service Worker:** Pre-caches app shell, fonts, and zone statuses. Clear indicator for offline/stale data (`"পুরোনো, শেষ আপডেট X আগে"`). Browser install prompt is deferred and displayed exclusively after the user's first successful report.

---

## 🛠️ Repository Structure

```
Halchal/
├── CLAUDE.md                    # Core project rules & architectural directives
├── docs/
│   └── DECISIONS.md             # Chronological Architectural Decision Records (ADR-0001 - ADR-0010)
├── supabase/                    # Backend migrations, RLS, & Edge Functions
│   ├── migrations/              # Database schema & security definer RPCs
│   └── functions/
│       └── submit-report/       # Single write gateway Edge Function
└── web/                         # Next.js 15 PWA frontend
    ├── public/
    │   ├── fonts/               # Noto Sans Bengali TrueType font
    │   ├── icons/               # 192x192, 512x512, maskable PWA icons
    │   └── sw.js                # Offline Service Worker with background sync
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx         # Home HUD route (Consent -> StatusCards -> Report)
    │   │   ├── z/[h3]/          # Public shareable zone page (ISR revalidate 60s)
    │   │   ├── map/page.tsx     # Lazy-loaded live hex map
    │   │   ├── history/page.tsx # 7-day insights clean stub route
    │   │   ├── manifest.ts      # Web App Manifest
    │   │   └── api/
    │   │       ├── zone/[h3]/   # Fast cached zone status route handler
    │   │       ├── report/      # Write gateway proxy route handler
    │   │       └── og/          # Resvg-powered dynamic OG image generator
    │   ├── components/          # Reusable tactical UI components
    │   └── lib/                 # H3 utilities, offline queue, device ID, Supabase, Redis
    ├── tests/
    │   └── e2e/                 # Playwright E2E test suites
    ├── package.json
    └── playwright.config.ts
```

---

## 🚀 Local Development Setup

### 1. Prerequisites
- **Node.js:** v20+ (recommended v20.12+)
- **npm:** v10+

### 2. Install Dependencies
```bash
cd web
npm install
```

### 3. Environment Variables
Create `.env.local` inside `web/` (refer to `.env.example` in root):

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Upstash Redis (Optional for local dev - has built-in in-memory fallback)
UPSTASH_REDIS_REST_URL=https://your-upstash.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token

# Map Basemap Style (CartoDB Dark Matter - No OSM Tile Violation)
NEXT_PUBLIC_MAP_STYLE_URL=https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json

# Development & Test Flags
HALCHAL_TEST_MODE=true
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build & Start
```bash
npm run build
npm run start
```

---

## 🧪 Testing & Verification

### Run Unit Tests
Verifies Bengali numerals, relative time formatting, H3 spatial math, 30-minute offline queue expiry, and HarfBuzz complex conjunct shaping (ক্ষ, শ্র, ত্র, স্ক):
```bash
npm test
```

### Run Playwright E2E Tests
Runs headless Chromium testing the full user journey:  
`Open ➜ Location Consent ➜ Manual Area Picker ➜ 2x2 StatusCards ➜ OneTap Report ➜ Optimistic UI Update ➜ Public Zone Route ➜ Map/History Navigation`:
```bash
npm run test:e2e
```

---

## 🗺️ Map Basemap Vendor & Style Choice

Per project specifications, `tile.openstreetmap.org` is **strictly prohibited** to comply with OpenStreetMap's Tile Usage Policy for production applications.

Halchal utilizes the **CartoDB Dark Matter** GL Vector/Raster basemap (`https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json`) with an option to configure **MapTiler** or self-hosted **Protomaps PMTiles** on Cloudflare R2 via `NEXT_PUBLIC_MAP_STYLE_URL`. This provides an authentic tactical OLED dark theme while fully adhering to third-party tile policies.

---

## 📄 License & Community Disclaimer

নাগরিকদের তথ্যের ভিত্তিতে তৈরি, এটি কোনো অফিশিয়াল পরিমাপ নয়।  
Licensed under the MIT License.
