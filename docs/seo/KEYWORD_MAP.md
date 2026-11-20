# Halchal (হালচাল) — Search Intent & Keyword Mapping Architecture

> **Document Type:** SEO Architecture & Keyword Intent Mapping  
> **Target Market:** Bangladesh (Dhaka metropolitan pilot, expanding nationwide)  
> **Primary Language:** Bengali (`bn-BD`), with secondary Banglish and English phonetic transliterations  
> **Governance:** ADR-0017 (Technical SEO Foundation) & Human-Readable URL Architecture

---

## 1. Search Intent Overview & Philosophy

In Bangladesh, daily utility disruptions (electricity load-shedding, gas pressure drops, water supply cuts, and LPG cylinder price fluctuations) generate high-frequency, highly urgent mobile search queries. Because users often search under active blackout or kitchen disruption conditions on low-end 2G/3G connections, their search behavior spans three distinct script modalities:

1. **Native Bengali Script (Primary):** e.g., `মোহাম্মদপুর গ্যাস আছে কি`, `মিরপুর লোডশেডিং আজ`, `এলপিজি সিলিন্ডারের দাম আজ`
2. **Banglish / Phonetic Latin Transliteration:** e.g., `mohammadpur gas ache ki`, `mirpur load shedding aj`, `dhanmondi te current nai`
3. **English Utility Queries:** e.g., `dhaka load shedding schedule`, `lpg cylinder price bangladesh`, `wasa water supply problem mohammadpur`

### Search Intent Classification
- **Informational (Immediate Need):** Citizen needs immediate confirmation of whether an outage is localized to their building or widespread across their neighborhood.
- **Navigational (Area Hub):** Citizen seeks their neighborhood status hub or city-wide utility overview.
- **Transactional / Participatory:** Citizen wants to submit a report, register a complaint, or check regulatory benchmark prices (BERC LPG rate).

---

## 2. Intent Clusters & Master Keyword Map

> **Volume Policy:** Per strict editorial policy, search volumes are **NOT invented**. All volume entries are designated `TBD (verify in Google Search Console / Google Trends / autocomplete)`. A systematic verification protocol is detailed in Section 3.

| Cluster ID | Intent Cluster & Target Problem | Primary Phrase (Bengali) | Secondary Phrases (Bengali, Banglish, English) | Target Page Type | Route Pattern | Template Serving Route | Intent Type | Volume Status | Verification Method |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CL-GAS-01** | **Area Gas Pressure & Outage**<br>Citizen checking if gas is on in their neighborhood for cooking | `<এলাকা> গ্যাস আছে কি` / `<এলাকা> গ্যাসের চাপ কম` | • `<এলাকা>য় গ্যাস সংকট`<br>• `<area> gas ache ki`<br>• `<area> gas problem today`<br>• `তিতাস গ্যাস লাইভ খবর <এলাকা>` | Area Utility Hub / Area Gas Deep Dive | `/[city]/[area]`<br>`/[city]/[area]/gas` | `AreaPageTemplate`<br>`CategorySubpageTemplate` | Informational (Urgent) | `volume: TBD (verify in Google Search Console / Google Trends / autocomplete)` | GSC Query Report + Google Autocomplete prefix scan |
| **CL-PWR-02** | **Area Load Shedding & Power Outage**<br>Citizen checking ongoing power cuts or outage duration | `<এলাকা> লোডশেডিং আজ` | • `<এলাকা>য় কারেন্ট নাই`<br>• `<area> load shedding`<br>• `<area> current ache kina`<br>• `ডেসকো / ডিপিডিসি লোডশেডিং <এলাকা>` | Area Utility Hub / Area Electricity Deep Dive | `/[city]/[area]`<br>`/[city]/[area]/electricity` | `AreaPageTemplate`<br>`CategorySubpageTemplate` | Informational (Urgent) | `volume: TBD (verify in Google Search Console / Google Trends / autocomplete)` | Google Trends Geo BD + GSC Search Impressions |
| **CL-WTR-03** | **Area Water Shortage & WASA Supply**<br>Citizen checking water pump failure or dirty water | `<এলাকা> পানি আসছে না` | • `<এলাকা>য় ওয়াসা পানি সমস্যা`<br>• `<area> pani nai`<br>• `wasa water supply <area>`<br>• `<এলাকা> পানির প্রেসার কেমন` | Area Utility Hub / Area Water Deep Dive | `/[city]/[area]`<br>`/[city]/[area]/water` | `AreaPageTemplate`<br>`CategorySubpageTemplate` | Informational (Urgent) | `volume: TBD (verify in Google Search Console / Google Trends / autocomplete)` | GSC Query Filter `পানি আসছে না` + Autocomplete |
| **CL-LPG-04** | **National LPG Cylinder Price**<br>Citizen verifying fair market price vs BERC regulatory rate | `এলপিজি সিলিন্ডারের দাম আজ` | • `আজকের এলপিজি গ্যাস সিলিন্ডার রেট`<br>• `lpg price bangladesh`<br>• `lpg cylinder price today bd`<br>• `১২ কেজি সিলিন্ডারের সরকারি দাম` | National Explainer Hub | `/lpg-price` | `LpgExplainerTemplate` | Informational / Transactional | `volume: TBD (verify in Google Search Console / Google Trends / autocomplete)` | Google Trends (Topic: Liquefied petroleum gas) + GSC |
| **CL-GAS-05** | **Dhaka Citywide Gas Crisis**<br>Macro overview of gas shortfall across Dhaka metropolitan | `ঢাকায় গ্যাস সংকট` | • `ঢাকা গ্যাস প্রেসার আপডেট`<br>• `dhaka gas crisis today`<br>• `titas gas low pressure dhaka`<br>• `ঢাকায় কোন কোন এলাকায় গ্যাস নেই` | City Topic Hub | `/gas-crisis-dhaka` | `GasCrisisHubTemplate` | Informational / Navigational | `volume: TBD (verify in Google Search Console / Google Trends / autocomplete)` | Google News / Trends BD + GSC Geo Breakdown |
| **CL-PWR-06** | **Dhaka Citywide Load Shedding Summary**<br>Macro live summary of grid status across all Dhaka wards | `ঢাকায় লোডশেডিং লাইভ খবর` | • `ঢাকা লোডশেডিং আপডেট আজ`<br>• `dhaka load shedding live`<br>• `আজকের লোডশেডিং সূচি ঢাকা`<br>• `কোন এলাকায় কারেন্ট নেই` | City Topic Hub | `/load-shedding` | `LoadSheddingHubTemplate` | Informational / Navigational | `volume: TBD (verify in Google Search Console / Google Trends / autocomplete)` | GSC Impressions + Real-time Trends |
| **CL-CITY-07** | **City Metropolitan Hub**<br>Portal discovering all neighborhood utility statuses | `ঢাকা শহরের ইউটিলিটি হালচাল` | • `ঢাকা বিদ্যুৎ গ্যাস পানির খবর`<br>• `dhaka utility status`<br>• `dhaka live utility map`<br>• `ঢাকার বিভিন্ন এলাকার অবস্থা` | City Hub | `/[city]` (e.g. `/dhaka`) | `CityHubTemplate` | Navigational | `volume: TBD (verify in Google Search Console / Google Trends / autocomplete)` | GSC Brand + Navigational queries |
| **CL-REP-08** | **Citizen Outage Reporting**<br>Citizen wishing to report an active blackout or crisis | `এলাকার কারেন্ট গ্যাসের রিপোর্ট করুন` | • `হালচাল রিপোর্ট`<br>• `report power outage dhaka`<br>• `তিতাস গ্যাস অভিযোগ জানাতে চাই`<br>• `ওয়াসা পানি সমস্যা রিপোর্ট` | Machine & Interactive Reporting | `/` (Home)<br>`/[city]/[area]` (CTA)<br>`/z/[h3]` | `InteractiveReportSheet`<br>`AreaPageTemplate` | Transactional | `volume: TBD (verify in Google Search Console / Google Trends / autocomplete)` | GSC Action Queries + In-app Event Analytics |

---

## 3. Search Volume Verification Protocol

To prevent speculative search volume estimates, Halchal uses a 3-step empirical verification methodology:

### Step 1: Google Search Console (GSC) Production Query Harvest
- **Cadence:** Weekly review via GSC Search Results Performance Report.
- **Filters:**
  - Country: `Bangladesh (BGD)`
  - Query Regex: `(গ্যাস|কারেন্ট|লোডশেডিং|পানি|এলপিজি|gas|load shedding|current|wasa|lpg)`
- **Metrics Collected:** Impressions, Clicks, Average CTR, Average Position.
- **Promotion Threshold:** Any query generating >= 50 impressions/week is promoted from secondary to primary status in `KEYWORD_MAP.md`.

### Step 2: Google Trends Relative Indexing
- **Parameters:**
  - Region: `Bangladesh`
  - Timeframe: `Past 30 days` or `Past 90 days`
  - Category: `All categories` or `Home & Garden / Energy & Utilities`
- **Methodology:**
  - Pair head terms against baseline anchor term (e.g., `লোডশেডিং` vs `গ্যাস সংকট` vs `এলপিজি`).
  - Extract `Rising Queries` (`ব্রেকআউট` / Breakout queries) to detect emerging seasonal disruptions (e.g., winter gas pressure drops, summer heatwave load shedding).

### Step 3: Google Autocomplete / Suggestion Mining
- **Methodology:**
  - Query Google search with area prefixes in incognito session with location set to Bangladesh:
    - `"ধানমন্ডি গ্যাস "` -> extract completions (`ধানমন্ডি গ্যাস আছে কি`, `ধানমন্ডি গ্যাস সংকট`)
    - `"mirpur load "` -> extract completions (`mirpur load shedding schedule`, `mirpur load shedding update`)
  - Log extracted suggestions into the quarterly SEO backlog.

---

## 4. URL Architecture & Slug Governance

### 4.1 URL Hierarchy

```
/ (Home / Interactive Reporting Map)
│
├── /dhaka (City Hub — Crawlable index of all Dhaka areas)
│   ├── /dhaka/mohammadpur (Area Page — Server-rendered, ISR 60s)
│   │   ├── /dhaka/mohammadpur/gas (Distinct category deep-dive)
│   │   ├── /dhaka/mohammadpur/electricity (Distinct category deep-dive)
│   │   ├── /dhaka/mohammadpur/water (Distinct category deep-dive)
│   │   └── /dhaka/mohammadpur/lpg (Distinct category deep-dive)
│   ├── /dhaka/dhanmondi
│   ├── /dhaka/mirpur-10
│   └── ... (Other pilot areas)
│
├── /lpg-price (National Explainer & Regulatory BERC vs Market tracker)
├── /load-shedding (Dhaka live load-shedding overview)
├── /gas-crisis-dhaka (Dhaka live gas crisis overview)
│
└── /z/[h3] (Spatial machine/share route — Canonical points to matching /[city]/[area] when available)
```

### 4.2 Slug Transliteration Rules
1. **Latin Only:** Slugs MUST use lowercase ASCII alphanumeric characters with single hyphens (`^[a-z0-9]+(-[a-z0-9]+)*$`). Unicode Bengali in URLs is strictly forbidden because social sharing apps (WhatsApp, Messenger, Facebook) percent-encode Bengali characters into illegible, bloated strings (e.g., `%E0%A6%AE%E0%A7%8B...`).
2. **Bengali Content & Titles:** While the URL slug is Latin (`/dhaka/mohammadpur`), the `H1`, `<title>`, breadcrumbs, and body text are 100% native Bengali.
3. **Stability & 301 Redirects:** Slugs are immutable once indexed. If an administrative boundary changes, the old slug is added to `public.slug_redirects` and permanently redirected (301) to the new destination.
