#!/usr/bin/env node
/**
 * Halchal - Sitemap-Driven Broken-Link & Redirect-Chain Crawler
 * Architecture: Technical SEO Foundation (ADR-0017)
 *
 * Capabilities:
 * 1. Discovers all indexable URLs directly from the XML sitemap (including sitemap indexes)
 * 2. Crawls each page to extract all <a href="..."> hyperlinks
 * 3. Inspects every link, resolving redirect chains (301/302/307/308) and detecting broken links (4xx/5xx)
 * 4. Outputs full diagnostic details to a CSV file (default: crawl-results.csv)
 * 5. Returns exit code 1 if broken internal links or redirect loops are detected
 *
 * Usage:
 *   node scripts/crawl-sitemap-links.mjs
 *   node scripts/crawl-sitemap-links.mjs --url http://localhost:3000
 *   node scripts/crawl-sitemap-links.mjs --sitemap http://localhost:3000/sitemap.xml --out ./reports/crawl.csv
 */

import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
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

const explicitSitemap = getArgValue('--sitemap');
const explicitUrl = getArgValue('--url') || process.env.BASE_URL || 'http://localhost:3000';
const outputPath = getArgValue('--out') || path.resolve(process.cwd(), 'crawl-results.csv');
const sitemapUrl = explicitSitemap || `${explicitUrl.replace(/\/+$/, '')}/sitemap.xml`;
const baseOrigin = new URL(explicitUrl).origin;

console.log('\n===============================================================');
console.log(' Halchal Sitemap-Driven Broken-Link & Redirect Crawler');
console.log(` Sitemap URL: ${sitemapUrl}`);
console.log(` Output CSV:  ${outputPath}`);
console.log('===============================================================\n');

function escapeCsv(value) {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

async function requestUrl(urlStr, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(urlStr);
      const client = parsed.protocol === 'https:' ? https : http;

      const req = client.request(
        urlStr,
        {
          method: options.method || 'GET',
          headers: {
            'User-Agent': 'Halchal-Seo-Crawler/1.0 (+https://halchal.bd)',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            ...(options.headers || {}),
          },
          timeout: 12000,
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            if (body.length < 300000) body += chunk;
          });
          res.on('end', () => {
            resolve({
              statusCode: res.statusCode || 0,
              headers: res.headers,
              body,
              url: urlStr,
            });
          });
        }
      );

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Timeout (${12000}ms) fetching ${urlStr}`));
      });
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

async function traceRedirects(urlStr, maxHops = 6) {
  let currentUrl = urlStr;
  const chain = [];

  for (let hop = 0; hop < maxHops; hop++) {
    try {
      const res = await requestUrl(currentUrl, { method: 'HEAD' }).catch(async () => {
        // Fall back to GET if server does not permit HEAD
        return await requestUrl(currentUrl, { method: 'GET' });
      });

      const isRedirect = [301, 302, 303, 307, 308].includes(res.statusCode);

      if (isRedirect && res.headers.location) {
        const nextUrl = new URL(res.headers.location, currentUrl).toString();
        chain.push({
          from: currentUrl,
          to: nextUrl,
          statusCode: res.statusCode,
        });

        if (chain.some((c, idx) => idx < chain.length - 1 && c.from === nextUrl)) {
          return {
            statusCode: 310, // Redirect loop
            finalUrl: nextUrl,
            hops: chain.length,
            chain,
            isRedirect: true,
            isLoop: true,
            error: `Redirect loop detected at ${nextUrl}`,
          };
        }

        currentUrl = nextUrl;
      } else {
        return {
          statusCode: res.statusCode,
          finalUrl: currentUrl,
          hops: chain.length,
          chain,
          isRedirect: chain.length > 0,
          isLoop: false,
          error: res.statusCode >= 400 ? `HTTP ${res.statusCode}` : '',
        };
      }
    } catch (err) {
      return {
        statusCode: 0,
        finalUrl: currentUrl,
        hops: chain.length,
        chain,
        isRedirect: chain.length > 0,
        isLoop: false,
        error: err.message,
      };
    }
  }

  return {
    statusCode: 310,
    finalUrl: currentUrl,
    hops: chain.length,
    chain,
    isRedirect: true,
    isLoop: false,
    error: `Exceeded maximum redirect hops (${maxHops})`,
  };
}

function normalizeToTargetOrigin(urlStr, targetBaseUrl) {
  try {
    const parsed = new URL(urlStr);
    const targetParsed = new URL(targetBaseUrl);
    // If the sitemap was built with a domain (e.g. Vercel or production),
    // but the crawler is explicitly targeting another host (e.g. localhost or staging),
    // rebase the pathname + search onto targetBaseUrl
    return new URL(parsed.pathname + parsed.search, targetBaseUrl).toString();
  } catch {
    return urlStr;
  }
}

// -------------------------------------------------------------
// Sitemap Discovery
// -------------------------------------------------------------
async function harvestSitemapUrls(rootSitemap) {
  console.log(`Fetching root sitemap: ${rootSitemap}...`);
  const initialRes = await requestUrl(rootSitemap);
  if (initialRes.statusCode !== 200) {
    throw new Error(`Failed to fetch sitemap at ${rootSitemap}: HTTP ${initialRes.statusCode}`);
  }

  const sitemapXml = initialRes.body;
  const isIndex = sitemapXml.includes('<sitemapindex');
  const urlsToCrawl = new Set();

  if (isIndex) {
    console.log('Sitemap is an index; harvesting child sitemaps...');
    const childSitemaps = Array.from(sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) =>
      normalizeToTargetOrigin(m[1].trim(), explicitUrl)
    );

    for (const childUrl of childSitemaps) {
      console.log(`Fetching child sitemap: ${childUrl}...`);
      const childRes = await requestUrl(childUrl);
      if (childRes.statusCode === 200) {
        const matches = Array.from(childRes.body.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) =>
          normalizeToTargetOrigin(m[1].trim(), explicitUrl)
        );
        matches.forEach((u) => urlsToCrawl.add(u));
      }
    }
  } else {
    const matches = Array.from(sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) =>
      normalizeToTargetOrigin(m[1].trim(), explicitUrl)
    );
    matches.forEach((u) => urlsToCrawl.add(u));
  }

  return Array.from(urlsToCrawl);
}

// -------------------------------------------------------------
// HTML Link Extraction
// -------------------------------------------------------------
function extractLinksFromHtml(html, pageUrl) {
  const links = [];
  const anchorRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = anchorRegex.exec(html)) !== null) {
    const rawHref = match[1].trim();
    const anchorText = match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

    // Ignore anchors, javascript, mailto, tel
    if (
      !rawHref ||
      rawHref.startsWith('#') ||
      rawHref.startsWith('javascript:') ||
      rawHref.startsWith('mailto:') ||
      rawHref.startsWith('tel:')
    ) {
      continue;
    }

    try {
      let resolvedUrl = new URL(rawHref, pageUrl).toString().split('#')[0];
      const isInternal =
        resolvedUrl.startsWith(baseOrigin) ||
        resolvedUrl.startsWith('http://localhost') ||
        resolvedUrl.startsWith('https://halchal');

      if (isInternal && (baseOrigin.includes('localhost') || baseOrigin.includes('127.0.0.1'))) {
        resolvedUrl = normalizeToTargetOrigin(resolvedUrl, explicitUrl);
      }

      links.push({
        href: resolvedUrl,
        rawHref,
        text: anchorText || '[No anchor text]',
        isInternal,
      });
    } catch {
      // Invalid URL syntax
      links.push({
        href: rawHref,
        rawHref,
        text: anchorText || '[Invalid URL]',
        isInternal: false,
        invalid: true,
      });
    }
  }

  return links;
}

// -------------------------------------------------------------
// Main Crawler Engine
// -------------------------------------------------------------
async function runCrawler() {
  const sitemapUrls = await harvestSitemapUrls(sitemapUrl);
  console.log(`Found ${sitemapUrls.length} indexable URLs from sitemap.\n`);

  const csvRows = [
    [
      'Source URL',
      'Link URL',
      'Link Text',
      'Link Type',
      'Status Code',
      'Is Broken',
      'Is Redirect',
      'Redirect Hops',
      'Redirect Chain',
      'Final URL',
      'Error Message',
    ].join(','),
  ];

  const linkStatusCache = new Map();
  const allDiscoveredLinks = [];
  let brokenInternalCount = 0;
  let redirectCount = 0;

  // Crawl each sitemap page to harvest links
  console.log('Crawling pages to harvest internal and external hyperlinks...');
  for (let i = 0; i < sitemapUrls.length; i++) {
    const pageUrl = sitemapUrls[i];
    process.stdout.write(`[${i + 1}/${sitemapUrls.length}] Parsing ${pageUrl}...\r`);

    try {
      const pageRes = await requestUrl(pageUrl);
      if (pageRes.statusCode !== 200) {
        csvRows.push(
          [
            escapeCsv('SITEMAP'),
            escapeCsv(pageUrl),
            escapeCsv('SITEMAP_ENTRY'),
            escapeCsv('internal'),
            escapeCsv(pageRes.statusCode),
            escapeCsv(true),
            escapeCsv(false),
            escapeCsv(0),
            escapeCsv(''),
            escapeCsv(pageUrl),
            escapeCsv(`Sitemap entry returned HTTP ${pageRes.statusCode}`),
          ].join(',')
        );
        brokenInternalCount++;
        continue;
      }

      const links = extractLinksFromHtml(pageRes.body, pageUrl);
      for (const link of links) {
        allDiscoveredLinks.push({
          sourceUrl: pageUrl,
          ...link,
        });
      }
    } catch (err) {
      console.error(`\nFailed to fetch sitemap URL ${pageUrl}:`, err.message);
      csvRows.push(
        [
          escapeCsv('SITEMAP'),
          escapeCsv(pageUrl),
          escapeCsv('SITEMAP_ENTRY'),
          escapeCsv('internal'),
          escapeCsv(0),
          escapeCsv(true),
          escapeCsv(false),
          escapeCsv(0),
          escapeCsv(''),
          escapeCsv(pageUrl),
          escapeCsv(err.message),
        ].join(',')
      );
      brokenInternalCount++;
    }
  }

  console.log(`\nHarvested ${allDiscoveredLinks.length} total link instances. Verifying statuses & redirect chains...\n`);

  // Verify unique destination links with concurrency
  const uniqueUrls = Array.from(new Set(allDiscoveredLinks.map((l) => l.href)));
  console.log(`Checking ${uniqueUrls.length} unique URLs...`);

  const concurrency = 6;
  for (let i = 0; i < uniqueUrls.length; i += concurrency) {
    const batch = uniqueUrls.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (url) => {
        try {
          const result = await traceRedirects(url);
          linkStatusCache.set(url, result);
        } catch (err) {
          linkStatusCache.set(url, {
            statusCode: 0,
            finalUrl: url,
            hops: 0,
            chain: [],
            isRedirect: false,
            isLoop: false,
            error: err.message,
          });
        }
      })
    );
    process.stdout.write(`Verified ${Math.min(i + concurrency, uniqueUrls.length)} / ${uniqueUrls.length} links...\r`);
  }
  console.log('\nVerification complete.\n');

  // Process rows
  const brokenLinksSummary = [];
  const redirectChainsSummary = [];

  for (const item of allDiscoveredLinks) {
    const trace = linkStatusCache.get(item.href) || {
      statusCode: 0,
      finalUrl: item.href,
      hops: 0,
      chain: [],
      isRedirect: false,
      isLoop: false,
      error: 'Unchecked',
    };

    const isBroken = trace.statusCode >= 400 || trace.statusCode === 0 || trace.isLoop;
    const isRedirect = trace.isRedirect;

    const chainStr = trace.chain.length > 0
      ? trace.chain.map((c) => `${c.from} [${c.statusCode}] -> ${c.to}`).join(' | ')
      : '';

    if (isBroken && item.isInternal) {
      brokenInternalCount++;
      brokenLinksSummary.push({
        source: item.sourceUrl,
        link: item.href,
        text: item.text,
        status: trace.statusCode || 'ERR',
        error: trace.error,
      });
    }

    if (isRedirect) {
      redirectCount++;
      if (trace.hops > 1 || item.isInternal) {
        redirectChainsSummary.push({
          source: item.sourceUrl,
          link: item.href,
          hops: trace.hops,
          chain: chainStr,
          final: trace.finalUrl,
        });
      }
    }

    csvRows.push(
      [
        escapeCsv(item.sourceUrl),
        escapeCsv(item.href),
        escapeCsv(item.text),
        escapeCsv(item.isInternal ? 'internal' : 'external'),
        escapeCsv(trace.statusCode),
        escapeCsv(isBroken),
        escapeCsv(isRedirect),
        escapeCsv(trace.hops),
        escapeCsv(chainStr),
        escapeCsv(trace.finalUrl),
        escapeCsv(trace.error),
      ].join(',')
    );
  }

  // Ensure output directory exists and write CSV
  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(outputPath, csvRows.join('\n'), 'utf8');

  // Print Summary Table
  console.log('===============================================================');
  console.log('                     CRAWLER AUDIT SUMMARY                    ');
  console.log('===============================================================');
  console.log(` Sitemap URLs Crawled:     ${sitemapUrls.length}`);
  console.log(` Total Hyperlinks Found:   ${allDiscoveredLinks.length}`);
  console.log(` Unique Target URLs:       ${uniqueUrls.length}`);
  console.log(` Broken Internal Links:    ${brokenInternalCount}`);
  console.log(` Redirect Chains Detected: ${redirectCount}`);
  console.log(` CSV Report Generated:     ${outputPath}`);
  console.log('===============================================================\n');

  if (brokenLinksSummary.length > 0) {
    console.error('❌ BROKEN INTERNAL HYPERLINKS DETECTED:');
    console.table(brokenLinksSummary.slice(0, 15));
  }

  if (redirectChainsSummary.length > 0) {
    console.log('⚠ INTERNAL REDIRECT CHAINS (>1 hop or uncanonical link targets):');
    console.table(redirectChainsSummary.slice(0, 10));
  }

  if (brokenInternalCount > 0) {
    console.error(`\n❌ CRAWL FAILED: Found ${brokenInternalCount} broken internal link(s).`);
    process.exit(1);
  } else {
    console.log('\n✅ CRAWL PASSED: Zero broken internal links discovered.');
    process.exit(0);
  }
}

runCrawler().catch((err) => {
  console.error('\nFatal crawler error:', err);
  process.exit(1);
});
