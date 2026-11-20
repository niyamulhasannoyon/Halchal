/**
 * Halchal - Automated Performance & Core Web Vitals CI Gatekeeper
 * Budgets: Performance >= 85 (mobile), SEO >= 95, Accessibility >= 95.
 * Fails build on performance regression.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const routes = [
  { name: 'Home', path: '/', minPerf: 85, minA11y: 95, minSeo: 95 },
  { name: 'City', path: '/dhaka', minPerf: 85, minA11y: 95, minSeo: 95 },
  { name: 'Area', path: '/dhaka/mohammadpur', minPerf: 85, minA11y: 95, minSeo: 95 },
  { name: 'Live Map', path: '/map', minPerf: 70, minA11y: 95, minSeo: 95 }, // WebGL map canvas
  { name: 'History', path: '/history', minPerf: 85, minA11y: 95, minSeo: 95 },
];

const baseUrl = process.env.PERF_BASE_URL || 'http://localhost:3000';
const tempDir = path.resolve('.perf-ci-tmp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

let hasRegression = false;
const summary = [];

console.log(`\n=========================================================`);
console.log(` Halchal Performance & Lighthouse CI Regression Gatekeeper`);
console.log(` Base URL: ${baseUrl}`);
console.log(` Target Budgets: Mobile Performance >= 85, A11y >= 95, SEO >= 95`);
console.log(`=========================================================\n`);

for (const route of routes) {
  const url = `${baseUrl}${route.path}`;
  const jsonPath = path.join(tempDir, `${route.name.toLowerCase().replace(/\s+/g, '-')}.json`);
  console.log(`Auditing ${route.name} (${url})...`);

  try {
    const cmd = `export PATH="$HOME/.nvm/versions/node/v22.22.2/bin:$PATH" && CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npx lighthouse "${url}" --output=json --output-path="${jsonPath}" --chrome-flags="--headless=new --no-sandbox" --only-categories=performance,accessibility,best-practices,seo --form-factor=mobile --throttling-method=simulate --quiet`;
    execSync(cmd, { stdio: 'pipe', env: process.env });

    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const perf = Math.round((data.categories.performance?.score || 0) * 100);
    const a11y = Math.round((data.categories.accessibility?.score || 0) * 100);
    const seo = Math.round((data.categories.seo?.score || 0) * 100);
    const lcp = data.audits['largest-contentful-paint']?.displayValue || 'N/A';
    const cls = data.audits['cumulative-layout-shift']?.displayValue || '0';
    const tbt = data.audits['total-blocking-time']?.displayValue || 'N/A';

    const perfPass = perf >= route.minPerf;
    const a11yPass = a11y >= route.minA11y;
    const seoPass = seo >= route.minSeo;

    const routePassed = perfPass && a11yPass && seoPass;
    if (!routePassed) {
      hasRegression = true;
    }

    summary.push({
      Route: route.name,
      Path: route.path,
      Perf: `${perf}% (min ${route.minPerf}%) ${perfPass ? '✓' : '✗'}`,
      A11y: `${a11y}% (min ${route.minA11y}%) ${a11yPass ? '✓' : '✗'}`,
      SEO: `${seo}% (min ${route.minSeo}%) ${seoPass ? '✓' : '✗'}`,
      LCP: lcp,
      CLS: cls,
      TBT: tbt,
      Status: routePassed ? 'PASS' : 'FAIL',
    });
  } catch (err) {
    console.error(`Audit failed for ${route.name}:`, err.message);
    hasRegression = true;
    summary.push({
      Route: route.name,
      Path: route.path,
      Status: 'ERROR',
    });
  }
}

console.log('\n=== CI PERFORMANCE BUDGET RESULTS ===\n');
console.table(summary);

if (hasRegression) {
  console.error('\n❌ BUILD FAILED: Performance or Core Web Vitals regression detected!');
  process.exit(1);
} else {
  console.log('\n✅ ALL PERFORMANCE & ACCESSIBILITY BUDGETS PASSED!');
  process.exit(0);
}
