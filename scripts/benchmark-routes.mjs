import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const targetMode = process.argv[2] || 'optimized';
const outputDir = path.resolve(`${targetMode}-reports`);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const routes = [
  { name: 'Home (/)', url: 'http://localhost:3000/' },
  { name: 'City (/dhaka)', url: 'http://localhost:3000/dhaka' },
  { name: 'Area (/dhaka/mohammadpur)', url: 'http://localhost:3000/dhaka/mohammadpur' },
  { name: 'Live Map (/map)', url: 'http://localhost:3000/map' },
  { name: 'History (/history)', url: 'http://localhost:3000/history' },
];

const results = [];

for (const route of routes) {
  const safeName = route.name.replace(/[^a-zA-Z0-9]/g, '_');
  const jsonPath = path.join(outputDir, `${safeName}.json`);
  console.log(`Auditing ${route.name} at ${route.url}...`);

  const cmd = `export PATH="$HOME/.nvm/versions/node/v22.22.2/bin:$PATH" && CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npx lighthouse "${route.url}" --output=json --output-path="${jsonPath}" --chrome-flags="--headless=new --no-sandbox" --only-categories=performance,accessibility,best-practices,seo --form-factor=mobile --throttling-method=simulate --quiet`;
  
  execSync(cmd, { stdio: 'inherit', env: process.env });

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const lcpAudit = data.audits['largest-contentful-paint'];
  const fcpAudit = data.audits['first-contentful-paint'];
  const tbtAudit = data.audits['total-blocking-time'];
  const clsAudit = data.audits['cumulative-layout-shift'];
  const speedIndexAudit = data.audits['speed-index'];

  // LCP element
  const lcpBreakdown = data.audits['lcp-breakdown-insight'];
  let lcpElementSnippet = 'N/A';
  if (lcpBreakdown?.details?.items) {
    const nodeItem = lcpBreakdown.details.items.find(i => i.type === 'node');
    if (nodeItem) {
      lcpElementSnippet = nodeItem.nodeLabel || nodeItem.snippet || 'Found';
    }
  }

  // Network requests for JS transfer size
  const networkItems = data.audits['network-requests']?.details?.items || [];
  const jsRequests = networkItems.filter(item => item.resourceType === 'Script');
  const totalJsTransferBytes = jsRequests.reduce((sum, item) => sum + (item.transferSize || 0), 0);
  const totalJsResourceBytes = jsRequests.reduce((sum, item) => sum + (item.resourceSize || 0), 0);

  results.push({
    route: route.name,
    url: route.url,
    perf: Math.round((data.categories.performance?.score || 0) * 100),
    a11y: Math.round((data.categories.accessibility?.score || 0) * 100),
    bestPractices: Math.round((data.categories['best-practices']?.score || 0) * 100),
    seo: Math.round((data.categories.seo?.score || 0) * 100),
    fcp: fcpAudit?.displayValue || `${Math.round(fcpAudit?.numericValue || 0)} ms`,
    lcp: lcpAudit?.displayValue || `${Math.round(lcpAudit?.numericValue || 0)} ms`,
    lcpMs: Math.round(lcpAudit?.numericValue || 0),
    tbt: tbtAudit?.displayValue || `${Math.round(tbtAudit?.numericValue || 0)} ms`,
    tbtMs: Math.round(tbtAudit?.numericValue || 0),
    cls: clsAudit?.displayValue || `${(clsAudit?.numericValue || 0).toFixed(3)}`,
    speedIndex: speedIndexAudit?.displayValue || `${Math.round(speedIndexAudit?.numericValue || 0)} ms`,
    jsTransferKb: (totalJsTransferBytes / 1024).toFixed(1),
    jsResourceKb: (totalJsResourceBytes / 1024).toFixed(1),
    lcpElement: lcpElementSnippet.slice(0, 80),
  });
}

console.log(`\n=== ${targetMode.toUpperCase()} SUMMARY ===\n`);
console.table(results);
fs.writeFileSync(`${targetMode}-summary.json`, JSON.stringify(results, null, 2));
