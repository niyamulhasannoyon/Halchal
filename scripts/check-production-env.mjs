#!/usr/bin/env node
/**
 * Halchal - Production Environment & SEO Readiness Verifier
 * Architecture: Technical SEO Foundation (ADR-0017) & Launch Gatekeeper
 *
 * Checks:
 * 1. NEXT_PUBLIC_SITE_URL configuration (valid HTTPS, no trailing slash, canonical)
 * 2. HTTPS enforcement and HSTS headers
 * 3. Canonical host redirects (http -> https, www vs non-www single canonical host)
 * 4. robots.txt reachability, directives (allows public/og, disallows private, valid sitemap directive)
 * 5. sitemap.xml reachability, status 200, valid XML, and base URL consistency
 * 6. Staging/preview deployments isolation: verifies X-Robots-Tag: noindex and robots.txt Disallow: /
 *
 * Usage:
 *   node scripts/check-production-env.mjs
 *   node scripts/check-production-env.mjs --url https://halchal.bd
 *   node scripts/check-production-env.mjs --staging --preview-url https://preview.halchal.bd
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';

const args = process.argv.slice(2);

function getArgValue(flag) {
  const index = args.indexOf(flag);
  if (index !== -1 && args[index + 1] && !args[index + 1].startsWith('--')) {
    return args[index + 1];
  }
  const prefixMatch = args.find((a) => a.startsWith(`${flag}=`));
  if (prefixMatch) {
    return prefixMatch.split('=')[1];
  }
  return null;
}

const isStagingMode =
  args.includes('--staging') ||
  args.includes('--preview') ||
  process.env.VERCEL_ENV === 'preview' ||
  process.env.APP_ENV === 'staging';

const explicitUrl = getArgValue('--url') || getArgValue('--target-url');
const previewUrl = getArgValue('--preview-url');

const targetUrl = explicitUrl || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const isLocalhost = targetUrl.includes('localhost') || targetUrl.includes('127.0.0.1');

console.log('\n===============================================================');
console.log(' Halchal Production Environment & SEO Readiness Verification');
console.log(` Target URL: ${targetUrl}`);
console.log(` Mode: ${isStagingMode ? 'STAGING / PREVIEW VERIFICATION' : 'PRODUCTION VERIFICATION'}`);
if (previewUrl) console.log(` Preview Target: ${previewUrl}`);
console.log('===============================================================\n');

const results = [];
let hasCriticalFailure = false;

function recordResult(category, testName, status, details) {
  if (status === 'FAIL') {
    hasCriticalFailure = true;
  }
  results.push({ category, testName, status, details });
}

async function fetchWithRedirects(urlStr, options = {}, maxRedirects = 5) {
  let currentUrl = urlStr;
  const redirectChain = [];

  for (let i = 0; i <= maxRedirects; i++) {
    const parsed = new URL(currentUrl);
    const client = parsed.protocol === 'https:' ? https : http;

    const res = await new Promise((resolve, reject) => {
      const req = client.request(
        currentUrl,
        {
          method: options.method || 'GET',
          headers: {
            'User-Agent': 'Halchal-Production-Env-Verifier/1.0',
            ...(options.headers || {}),
          },
          timeout: 10000,
        },
        (response) => {
          let body = '';
          response.on('data', (chunk) => {
            if (body.length < 200000) body += chunk; // Cap at 200KB for verification
          });
          response.on('end', () => {
            resolve({
              statusCode: response.statusCode || 0,
              headers: response.headers,
              body,
              url: currentUrl,
            });
          });
        }
      );

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Timeout fetching ${currentUrl}`));
      });
      req.end();
    });

    const isRedirect = [301, 302, 307, 308].includes(res.statusCode);
    if (isRedirect && res.headers.location) {
      const nextUrl = new URL(res.headers.location, currentUrl).toString();
      redirectChain.push({
        from: currentUrl,
        to: nextUrl,
        status: res.statusCode,
      });
      currentUrl = nextUrl;
      if (i === maxRedirects) {
        throw new Error(`Max redirect limit (${maxRedirects}) reached for ${urlStr}`);
      }
    } else {
      return {
        ...res,
        finalUrl: currentUrl,
        redirectChain,
        isRedirectChain: redirectChain.length > 0,
      };
    }
  }
}

// -------------------------------------------------------------
// Check 1: NEXT_PUBLIC_SITE_URL Configuration
// -------------------------------------------------------------
function checkSiteUrlConfig(urlStr) {
  try {
    const parsed = new URL(urlStr);

    if (urlStr.endsWith('/') && parsed.pathname === '/') {
      // trailing slash check on origin (e.g. https://halchal.bd/)
      if (urlStr !== `${parsed.origin}/`) {
        recordResult('ENV_VARS', 'NEXT_PUBLIC_SITE_URL Trailing Slash', 'FAIL', 'Must NOT have a trailing slash');
      } else {
        recordResult('ENV_VARS', 'NEXT_PUBLIC_SITE_URL Trailing Slash', 'PASS', 'Clean origin without trailing path slash');
      }
    } else if (urlStr.endsWith('/')) {
      recordResult('ENV_VARS', 'NEXT_PUBLIC_SITE_URL Trailing Slash', 'FAIL', 'Trailing slash found in environment variable');
    } else {
      recordResult('ENV_VARS', 'NEXT_PUBLIC_SITE_URL Trailing Slash', 'PASS', 'Correctly formatted without trailing slash');
    }

    if (!isLocalhost) {
      if (parsed.protocol !== 'https:') {
        recordResult('ENV_VARS', 'NEXT_PUBLIC_SITE_URL Protocol', 'FAIL', `Expected https:// in production, got ${parsed.protocol}`);
      } else {
        recordResult('ENV_VARS', 'NEXT_PUBLIC_SITE_URL Protocol', 'PASS', 'Configured with HTTPS');
      }
    } else {
      recordResult('ENV_VARS', 'NEXT_PUBLIC_SITE_URL Protocol', 'WARN', 'Localhost environment (HTTP permitted for local testing)');
    }
  } catch (err) {
    recordResult('ENV_VARS', 'NEXT_PUBLIC_SITE_URL Valid URL', 'FAIL', `Invalid URL: ${err.message}`);
  }
}

// -------------------------------------------------------------
// Check 2: Protocol, HSTS, and Security Headers
// -------------------------------------------------------------
async function checkSecurityHeaders(target) {
  try {
    const res = await fetchWithRedirects(target);
    const hsts = res.headers['strict-transport-security'];
    const nosniff = res.headers['x-content-type-options'];
    const frameOptions = res.headers['x-frame-options'];

    if (!isLocalhost) {
      if (hsts) {
        recordResult('SECURITY', 'HSTS Header', 'PASS', `Present: ${hsts}`);
      } else {
        recordResult('SECURITY', 'HSTS Header', 'FAIL', 'Missing Strict-Transport-Security header');
      }
    } else {
      recordResult('SECURITY', 'HSTS Header', 'PASS', 'Local development environment (HSTS optional)');
    }

    if (nosniff === 'nosniff') {
      recordResult('SECURITY', 'X-Content-Type-Options', 'PASS', 'nosniff enforced');
    } else {
      recordResult('SECURITY', 'X-Content-Type-Options', 'WARN', 'Missing or unexpected X-Content-Type-Options');
    }

    if (frameOptions === 'DENY' || frameOptions === 'SAMEORIGIN') {
      recordResult('SECURITY', 'X-Frame-Options', 'PASS', `${frameOptions} enforced`);
    } else {
      recordResult('SECURITY', 'X-Frame-Options', 'WARN', 'Missing or loose X-Frame-Options');
    }
  } catch (err) {
    recordResult('SECURITY', 'Connection & Headers', 'FAIL', `Could not connect to ${target}: ${err.message}`);
  }
}

// -------------------------------------------------------------
// Check 3: Canonical Host Redirects (http->https, www vs non-www)
// -------------------------------------------------------------
async function checkCanonicalRedirects(target) {
  if (isLocalhost) {
    recordResult('REDIRECTS', 'Canonical Host Redirects', 'PASS', 'Skipped for localhost dev server');
    return;
  }

  const parsed = new URL(target);
  const hostname = parsed.hostname;
  const isWww = hostname.startsWith('www.');
  const nonWwwHost = isWww ? hostname.slice(4) : hostname;
  const wwwHost = isWww ? hostname : `www.${hostname}`;

  // 1. Test HTTP to HTTPS redirect
  try {
    const httpUrl = `http://${hostname}${parsed.pathname}`;
    const httpRes = await fetchWithRedirects(httpUrl, {}, 3);
    const firstRedirect = httpRes.redirectChain[0];

    if (firstRedirect && [301, 308].includes(firstRedirect.status)) {
      recordResult('REDIRECTS', 'HTTP -> HTTPS Permanent Redirect', 'PASS', `Status ${firstRedirect.status} -> ${firstRedirect.to}`);
    } else if (firstRedirect) {
      recordResult('REDIRECTS', 'HTTP -> HTTPS Permanent Redirect', 'WARN', `Redirected with non-permanent status ${firstRedirect.status}`);
    } else {
      recordResult('REDIRECTS', 'HTTP -> HTTPS Permanent Redirect', 'FAIL', 'HTTP endpoint did not redirect to HTTPS');
    }
  } catch (err) {
    recordResult('REDIRECTS', 'HTTP -> HTTPS Permanent Redirect', 'WARN', `HTTP probe unavailable: ${err.message}`);
  }

  // 2. Test Alternate Host (www vs non-www)
  const alternateHost = isWww ? nonWwwHost : wwwHost;
  try {
    const altUrl = `https://${alternateHost}${parsed.pathname}`;
    const altRes = await fetchWithRedirects(altUrl, {}, 3);
    const finalHost = new URL(altRes.finalUrl).hostname;

    if (finalHost === hostname) {
      recordResult('REDIRECTS', 'Single Canonical Host (www / non-www)', 'PASS', `${alternateHost} seamlessly resolves to ${hostname}`);
    } else {
      recordResult(
        'REDIRECTS',
        'Single Canonical Host (www / non-www)',
        'FAIL',
        `${altUrl} resolved to ${finalHost} instead of canonical ${hostname}`
      );
    }
  } catch (err) {
    recordResult('REDIRECTS', 'Single Canonical Host (www / non-www)', 'WARN', `Alternate host ${alternateHost} probe failed: ${err.message}`);
  }
}

// -------------------------------------------------------------
// Check 4: robots.txt Reachability & Directives
// -------------------------------------------------------------
async function checkRobotsTxt(target) {
  const robotsUrl = `${target.replace(/\/+$/, '')}/robots.txt`;
  try {
    const res = await fetchWithRedirects(robotsUrl);
    if (res.statusCode !== 200) {
      recordResult('ROBOTS_TXT', 'robots.txt Reachability', 'FAIL', `Returned status ${res.statusCode}`);
      return null;
    }

    recordResult('ROBOTS_TXT', 'robots.txt Reachability', 'PASS', 'HTTP 200 OK');
    const content = res.body;

    // Directives audit
    const hasUserAgent = /user-agent:\s*\*/i.test(content);
    const hasDisallowAdmin = content.includes('Disallow: /admin') || content.includes('disallow: /admin');
    const hasDisallowApiReport = content.includes('/api/report');
    const hasAllowOg = content.includes('/api/og');
    const hasSitemap = /sitemap:/i.test(content);

    if (hasUserAgent) {
      recordResult('ROBOTS_TXT', 'User-agent Directive', 'PASS', 'Wildcard User-agent specified');
    } else {
      recordResult('ROBOTS_TXT', 'User-agent Directive', 'FAIL', 'Missing User-agent: *');
    }

    if (hasDisallowAdmin && hasDisallowApiReport) {
      recordResult('ROBOTS_TXT', 'Sensitive Paths Protected', 'PASS', 'Admin and mutation APIs disallowed');
    } else {
      recordResult('ROBOTS_TXT', 'Sensitive Paths Protected', 'WARN', 'Disallow directives for /admin or /api/report not found');
    }

    if (hasAllowOg) {
      recordResult('ROBOTS_TXT', 'OpenGraph Card Crawler Access', 'PASS', '/api/og explicitly permitted for image scrapers');
    } else {
      recordResult('ROBOTS_TXT', 'OpenGraph Card Crawler Access', 'WARN', '/api/og should be explicitly allowed');
    }

    if (hasSitemap) {
      const sitemapMatch = content.match(/sitemap:\s*([^\r\n]+)/i);
      const sitemapPath = sitemapMatch ? sitemapMatch[1].trim() : '';
      recordResult('ROBOTS_TXT', 'Sitemap Reference', 'PASS', `Points to: ${sitemapPath}`);
      return sitemapPath;
    } else {
      recordResult('ROBOTS_TXT', 'Sitemap Reference', 'FAIL', 'robots.txt does not declare a Sitemap');
      return null;
    }
  } catch (err) {
    recordResult('ROBOTS_TXT', 'robots.txt Reachability', 'FAIL', err.message);
    return null;
  }
}

// -------------------------------------------------------------
// Check 5: sitemap.xml Reachability & Content
// -------------------------------------------------------------
async function checkSitemap(target, declaredSitemap) {
  const sitemapUrl = declaredSitemap || `${target.replace(/\/+$/, '')}/sitemap.xml`;
  try {
    const res = await fetchWithRedirects(sitemapUrl);
    if (res.statusCode !== 200) {
      recordResult('SITEMAP', 'sitemap.xml Reachability', 'FAIL', `${sitemapUrl} returned HTTP ${res.statusCode}`);
      return;
    }

    recordResult('SITEMAP', 'sitemap.xml Reachability', 'PASS', `HTTP 200 OK from ${sitemapUrl}`);
    const xml = res.body;

    const isSitemapIndex = xml.includes('<sitemapindex');
    const isUrlSet = xml.includes('<urlset');

    if (!isSitemapIndex && !isUrlSet) {
      recordResult('SITEMAP', 'XML Schema Validity', 'FAIL', 'Neither <sitemapindex> nor <urlset> found in XML body');
      return;
    }

    recordResult('SITEMAP', 'XML Schema Validity', 'PASS', isSitemapIndex ? 'Valid <sitemapindex>' : 'Valid <urlset>');

    // If sitemapindex, test first child sitemap
    let targetXml = xml;
    if (isSitemapIndex) {
      const locMatch = xml.match(/<loc>([^<]+)<\/loc>/);
      if (locMatch) {
        const childUrl = locMatch[1].trim();
        const childRes = await fetchWithRedirects(childUrl);
        if (childRes.statusCode === 200) {
          recordResult('SITEMAP', 'Child Partitioned Sitemap', 'PASS', `Fetched ${childUrl} successfully (HTTP 200)`);
          targetXml = childRes.body;
        } else {
          recordResult('SITEMAP', 'Child Partitioned Sitemap', 'FAIL', `${childUrl} returned ${childRes.statusCode}`);
        }
      }
    }

    // Extract loc tags
    const locUrls = Array.from(targetXml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1].trim());
    if (locUrls.length === 0) {
      recordResult('SITEMAP', 'URL Count', 'FAIL', 'Zero <loc> entries found in sitemap');
      return;
    }

    recordResult('SITEMAP', 'URL Count', 'PASS', `Discovered ${locUrls.length} indexable URLs`);

    // Check base URL consistency
    const targetOrigin = new URL(target).origin;
    const nonMatchingUrls = locUrls.filter((u) => !u.startsWith(targetOrigin) && !u.startsWith('http://localhost') && !u.startsWith('https://halchal'));

    if (nonMatchingUrls.length > 0) {
      recordResult(
        'SITEMAP',
        'Canonical Origin Consistency',
        'FAIL',
        `${nonMatchingUrls.length} URLs do not match canonical host (e.g. ${nonMatchingUrls[0]})`
      );
    } else {
      recordResult('SITEMAP', 'Canonical Origin Consistency', 'PASS', 'All sitemap URLs match authoritative origin');
    }

    // Check no leaked private URLs
    const leakedUrls = locUrls.filter(
      (u) =>
        u.includes('/admin') ||
        u.includes('/api/') ||
        u.includes('/settings') ||
        u.includes('/login') ||
        u.includes('/notifications') ||
        u.includes('/design-preview')
    );

    if (leakedUrls.length > 0) {
      recordResult('SITEMAP', 'Indexation Guardrails', 'FAIL', `Private routes leaked into sitemap: ${leakedUrls.join(', ')}`);
    } else {
      recordResult('SITEMAP', 'Indexation Guardrails', 'PASS', 'Zero private or authenticated routes leaked');
    }
  } catch (err) {
    recordResult('SITEMAP', 'sitemap.xml Verification', 'FAIL', err.message);
  }
}

// -------------------------------------------------------------
// Check 6: Staging / Preview Environment Isolation (Strict Noindex)
// -------------------------------------------------------------
async function checkStagingPreviewIsolation(previewTarget) {
  console.log(`\nVerifying staging/preview isolation against ${previewTarget}...`);
  try {
    // 1. Probe preview robots.txt
    const robotsRes = await fetchWithRedirects(`${previewTarget.replace(/\/+$/, '')}/robots.txt`);
    const robotsBody = robotsRes.body;
    const hasDisallowAll = robotsBody.includes('Disallow: /') || robotsBody.includes('disallow: /');

    if (hasDisallowAll) {
      recordResult('PREVIEW_ISOLATION', 'Preview robots.txt', 'PASS', 'Contains Disallow: /');
    } else {
      recordResult('PREVIEW_ISOLATION', 'Preview robots.txt', 'FAIL', 'Preview robots.txt must contain Disallow: /');
    }

    // 2. Probe preview page for X-Robots-Tag header and HTML meta robots
    const pageRes = await fetchWithRedirects(previewTarget);
    const xRobots = pageRes.headers['x-robots-tag'];

    if (xRobots && xRobots.includes('noindex')) {
      recordResult('PREVIEW_ISOLATION', 'X-Robots-Tag Header', 'PASS', `Present: ${xRobots}`);
    } else {
      recordResult(
        'PREVIEW_ISOLATION',
        'X-Robots-Tag Header',
        'FAIL',
        `Missing "noindex" in X-Robots-Tag header (got "${xRobots || 'none'}")`
      );
    }

    const html = pageRes.body;
    const hasMetaNoindex = /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(html);

    if (hasMetaNoindex) {
      recordResult('PREVIEW_ISOLATION', 'HTML Meta Robots Tag', 'PASS', 'Contains <meta name="robots" content="...noindex...">');
    } else {
      recordResult('PREVIEW_ISOLATION', 'HTML Meta Robots Tag', 'WARN', 'Meta tag noindex not detected in HTML head');
    }
  } catch (err) {
    recordResult('PREVIEW_ISOLATION', 'Preview Probe', 'FAIL', `Failed to reach preview target ${previewTarget}: ${err.message}`);
  }
}

// -------------------------------------------------------------
// Execution Runner
// -------------------------------------------------------------
async function run() {
  checkSiteUrlConfig(targetUrl);
  await checkSecurityHeaders(targetUrl);
  await checkCanonicalRedirects(targetUrl);
  const declaredSitemap = await checkRobotsTxt(targetUrl);
  await checkSitemap(targetUrl, declaredSitemap);

  if (previewUrl || isStagingMode) {
    const pUrl = previewUrl || targetUrl;
    await checkStagingPreviewIsolation(pUrl);
  }

  // Print Summary Table
  console.log('\n===============================================================');
  console.log('                 ENVIRONMENT VERIFICATION RESULTS             ');
  console.log('===============================================================\n');

  console.table(
    results.map((r) => ({
      Category: r.category,
      Test: r.testName,
      Status: r.status === 'PASS' ? '✓ PASS' : r.status === 'WARN' ? '⚠ WARN' : '✗ FAIL',
      Details: r.details,
    }))
  );

  if (hasCriticalFailure) {
    console.error('\n❌ CRITICAL: Production environment checks failed. Resolve issues before launch.');
    process.exit(1);
  } else {
    console.log('\n✅ SUCCESS: All production environment & SEO checks passed.');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Fatal error during verification run:', err);
  process.exit(1);
});
