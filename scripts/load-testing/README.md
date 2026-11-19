# Halchal (হালচাল) — Load & Abuse Testing Suite

This directory contains the production-readiness k6 performance and abuse simulation test scripts for Halchal's pilot launch.

## Test Scripts Overview

1. `1-read-status-cache.js`: 2,000 concurrent users reading status in one zone with 90% cache hit / 10% miss mix.
2. `2-cgnat-mass-reports.js`: 300 reports/minute in one zone originating from only 20 carrier NAT IPs (Bangladeshi mobile operators).
3. `3-sybil-attack.js`: 100 anonymous accounts generated from ONE device attempting to manipulate consensus.
4. `4-replay-expired-tokens.js`: Replayed report requests and expired/replayed one-tap notification action tokens.

## Prerequisites

Install Grafana k6 (macOS):
```bash
brew install k6
```

Or run via Docker:
```bash
docker run --rm -i grafana/k6 run - < scripts/load-testing/1-read-status-cache.js
```

## Running the Tests

### Test 1: 2,000 Readers Cache Hit/Miss
```bash
k6 run --env TARGET_URL=http://localhost:3000 scripts/load-testing/1-read-status-cache.js
```

### Test 2: CGNAT Mass Outage Reports (300/min from 20 IPs)
```bash
k6 run --env TARGET_URL=http://localhost:3000 scripts/load-testing/2-cgnat-mass-reports.js
```

### Test 3: Sybil Attack Defense
```bash
k6 run --env TARGET_URL=http://localhost:3000 scripts/load-testing/3-sybil-attack.js
```

### Test 4: Replayed & Expired Action Tokens
```bash
k6 run --env TARGET_URL=http://localhost:3000 scripts/load-testing/4-replay-expired-tokens.js
```

## Automated In-Memory Verification

If k6 is not installed on your system, you can run the programmatic verification simulation:
```bash
deno task test
# or
npm --prefix web run test
```
See `scripts/load-testing/EXPECTED_RESULTS.md` for exact pass/fail criteria and `docs/LOAD_TEST_REPORT_TEMPLATE.md` for the executive SRE report template.
