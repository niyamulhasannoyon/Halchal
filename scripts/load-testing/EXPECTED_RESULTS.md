# Halchal (হালচাল) — Load & Abuse Testing: Expected Results Matrix

This document defines the strict pass/fail criteria and SRE invariants for the Halchal pilot launch performance suite.

---

## 1. Test Matrix Summary

| Test # | Test Script | Target Endpoint | Traffic / Load | Expected Pass Condition | Expected Failure Condition | SRE Latency Ceiling |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Test 1** | `1-read-status-cache.js` | `GET /api/zone/[h3]` | 2,000 VUs concurrent, 90% hit / 10% miss | `HTTP 200` with 4 categories & Bengali name | `< 1.0%` errors allowed | Cache Hit p95: `< 150ms`<br>Miss p95: `< 350ms` |
| **Test 2** | `2-cgnat-mass-reports.js` | `POST /api/report` | 300 reports/min from only 20 carrier IPs | **100% of distinct user reports must SUCCEED (HTTP 200)** | **0% false 429 drops** (CGNAT safety) | Submission p95: `< 500ms` |
| **Test 3** | `3-sybil-attack.js` | `POST /api/report` | 100 anonymous accounts from 1 device UUID | **Report #1: HTTP 200** | **Reports #2–100: MUST FAIL with HTTP 429 (`DEVICE_RATE_LIMIT`)** | Rate limit response p95: `< 100ms` |
| **Test 4A**| `4-replay-expired-tokens.js` | `POST /api/report` | Same user replaying within 15 min | First report: `HTTP 200` | Replayed report: **MUST FAIL with HTTP 429 (`USER_RATE_LIMIT`)** | Rejection p95: `< 100ms` |
| **Test 4B**| `4-replay-expired-tokens.js` | `POST /api/restore-vote`| Same signed action token replayed | First vote: `HTTP 200` | Replayed vote: **MUST FAIL with HTTP 400 (`TOKEN_ALREADY_USED`)** | Rejection p95: `< 100ms` |
| **Test 4C**| `4-replay-expired-tokens.js` | `POST /api/restore-vote`| Action token with `exp < now` | None | **MUST FAIL with HTTP 400 (`TOKEN_EXPIRED`)** | Rejection p95: `< 80ms` |

---

## 2. In-Depth Pass / Fail Invariants

### 2.1 Test 1: High-Volume Zone Status Reads (`1-read-status-cache.js`)
- **What Must Pass:**
  - Standard zone queries within the 60-second Redis TTL return HTTP 200 with header `Cache-Control: s-maxage=30, stale-while-revalidate=60`.
  - Upstash Redis absorbs > 90% of requests; database query rate remains flat (`< 15 QPS` to PostgreSQL even at 2,000 concurrent readers).
  - Client payload contains all 4 categories (`electricity`, `gas`, `water`, `lpg`) with valid states (`ok`, `low`, `out`, `unverified`, `unknown`).
- **What Must Fail:**
  - Queries for nonexistent or invalid H3 strings return `HTTP 400` or `HTTP 404` (`ZONE_NOT_FOUND`).
  - Total HTTP request failure rate must be `< 1%`.

### 2.2 Test 2: CGNAT Mass Outage Reporting (`2-cgnat-mass-reports.js`)
- **What Must Pass:**
  - During mass grid blackouts in Dhaka, subscribers of Grameenphone, Robi, and Banglalink share carrier-grade NAT public IPs.
  - Sourced from 20 IPs, each IP routes ~15 reports/minute. Because the coarse IP burst ceiling is set to 120 req/min per IP, **no legitimate user is blocked by IP-based rate limiting**.
  - All 300 reports/minute from distinct users succeed with `HTTP 200`.
- **What Must Fail:**
  - If a single IP exceeds 120 requests in a 60-second rolling window, it must be temporarily throttled with `HTTP 429` (`COARSE_IP_BURST_EXCEEDED`) to prevent volumetric DDoS.

### 2.3 Test 3: Sybil Attack Defense (`3-sybil-attack.js`)
- **What Must Pass:**
  - The very first report from the device is credited to the zone with `HTTP 200`.
- **What Must Fail:**
  - The subsequent 99 cloned accounts from the same physical device (`device_id`) are intercepted by the device pseudonymization hash (`device_id_hash = HMAC-SHA256(secret, device_id)`).
  - All 99 attempts return `HTTP 429` with error code `DEVICE_RATE_LIMIT` and Bengali message *"এই ডিভাইস থেকে ইতিমধ্যে একটি রিপোর্ট গ্রহণ করা হয়েছে। ১৫ মিনিট পর পুনরায় চেষ্টা করুন।"*.
  - **Zone Consensus Security:** The neighborhood status does NOT flip to `out` because `distinct_reporters` remains `1` (consensus requires `distinct_reporters >= 3` AND `weighted_trust_score >= 3.0`).

### 2.4 Test 4: Replayed Requests and Expired Action Tokens (`4-replay-expired-tokens.js`)
- **What Must Pass:**
  - Valid first reports and valid fresh action tokens within their 15-minute TTL return `HTTP 200`.
- **What Must Fail:**
  - Replayed reports by the same citizen within 15 minutes return `HTTP 429` (`USER_RATE_LIMIT`).
  - Replayed action tokens return `HTTP 400` with code `TOKEN_ALREADY_USED`.
  - Expired action tokens return `HTTP 400` with code `TOKEN_EXPIRED`.
