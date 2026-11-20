import { test, expect } from '@playwright/test';

/**
 * Halchal - Post-Deploy Production SEO Smoke Test (20+ Sample URLs)
 * Architecture: Technical SEO Foundation (ADR-0017)
 *
 * Assertions per URL:
 * 1. HTTP Status 200
 * 2. Exactly one authoritative <link rel="canonical"> (absolute, clean, no ?t= or tracking params)
 * 3. Exactly one non-empty <h1> tag
 * 4. Unique, descriptive <title> tag with brand mention
 * 5. Valid JSON-LD structured data (@context schema.org, valid @type)
 * 6. Reachable OpenGraph image (HTTP 200, valid image content-type)
 */

export const SAMPLE_URLS = [
  // 1. Core Hubs & Topic Portals
  { path: '/', name: 'Home Reporting & Live Overview', hasJsonLd: true },
  { path: '/dhaka', name: 'Dhaka Metropolitan City Hub', hasJsonLd: true },
  { path: '/lpg-price', name: 'National LPG Price Explainer Hub', hasJsonLd: true },
  { path: '/load-shedding', name: 'Dhaka City Load Shedding Hub', hasJsonLd: true },
  { path: '/gas-crisis-dhaka', name: 'Dhaka Gas Crisis Hub', hasJsonLd: true },
  { path: '/map', name: 'Live Spatial Map View', hasJsonLd: false },
  { path: '/history', name: '7-Day Insights History', hasJsonLd: false },

  // 2. Verified Seed Area Hubs (Meeting shouldIndexZone criteria)
  { path: '/dhaka/mohammadpur', name: 'Mohammadpur Area Utility Hub', hasJsonLd: true },
  { path: '/dhaka/dhanmondi', name: 'Dhanmondi Area Utility Hub', hasJsonLd: true },
  { path: '/dhaka/mirpur-10', name: 'Mirpur 10 Area Utility Hub', hasJsonLd: true },
  { path: '/dhaka/banani', name: 'Banani Area Utility Hub', hasJsonLd: true },
  { path: '/dhaka/gulshan-2', name: 'Gulshan 2 Area Utility Hub', hasJsonLd: true },
  { path: '/dhaka/gulshan-1', name: 'Gulshan 1 Area Utility Hub', hasJsonLd: true },
  { path: '/dhaka/uttara-sector-3', name: 'Uttara Sector 3 Area Hub', hasJsonLd: true },
  { path: '/dhaka/farmgate', name: 'Farmgate Area Utility Hub', hasJsonLd: true },

  // 3. Category-Specific Deep Dive Subpages
  { path: '/dhaka/mohammadpur/gas', name: 'Mohammadpur Gas Deep Dive', hasJsonLd: true },
  { path: '/dhaka/mohammadpur/electricity', name: 'Mohammadpur Electricity Deep Dive', hasJsonLd: true },
  { path: '/dhaka/dhanmondi/water', name: 'Dhanmondi Water Deep Dive', hasJsonLd: true },

  // 4. Content & Citizen Safety Guides
  { path: '/guides', name: 'Guides Hub', hasJsonLd: true },
  { path: '/guides/lpg-cylinder-price-bd', name: 'LPG Cylinder Price Guide', hasJsonLd: true },
  { path: '/guides/low-gas-pressure-safety', name: 'Low Gas Pressure Safety Guide', hasJsonLd: true },

  // 5. Trust, Governance & Sitemap Pages
  { path: '/about', name: 'About Halchal', hasJsonLd: true },
  { path: '/how-it-works', name: 'How It Works & Methodology', hasJsonLd: true },
  { path: '/privacy', name: 'Privacy Policy', hasJsonLd: true },
  { path: '/terms', name: 'Terms of Service', hasJsonLd: true },
  { path: '/contact', name: 'Contact & Editorial Board', hasJsonLd: true },
  { path: '/sitemap-pages', name: 'HTML Sitemap Directory', hasJsonLd: true },

  // 6. Spatial H3 Canonical Machine Route
  { path: '/z/883cf10ca1fffff', name: 'Dhanmondi H3 Spatial Route', hasJsonLd: true },
];

test.describe('Halchal Post-Deploy Smoke Test (28 Sample URLs)', () => {
  const seenTitles = new Map<string, string>();

  for (const sample of SAMPLE_URLS) {
    test(`Smoke test ${sample.path} (${sample.name}): 200, canonical, 1 H1, unique title, JSON-LD, OG image`, async ({
      page,
      request,
      baseURL,
    }) => {
      // 1. Assert HTTP Status 200
      const response = await page.goto(sample.path, { waitUntil: 'domcontentloaded' });
      expect(
        response?.status(),
        `Expected HTTP 200 on ${sample.path}, got ${response?.status()}`
      ).toBe(200);

      // 2. Assert Canonical Tag is present, absolute, and normalized
      const canonical = page.locator('link[rel="canonical"]');
      expect(
        await canonical.count(),
        `Expected exactly 1 canonical tag on ${sample.path}`
      ).toBe(1);

      const canonicalHref = await canonical.getAttribute('href');
      expect(canonicalHref, `Canonical tag on ${sample.path} is empty`).toBeTruthy();
      expect(
        canonicalHref?.startsWith('http://') || canonicalHref?.startsWith('https://'),
        `Canonical URL on ${sample.path} must be absolute, got "${canonicalHref}"`
      ).toBe(true);
      expect(canonicalHref).not.toContain('?t=');
      expect(canonicalHref).not.toContain('utm_');
      expect(canonicalHref).not.toContain('fbclid');

      // 3. Assert exactly one non-empty H1 tag
      const h1 = page.locator('h1');
      const h1Count = await h1.count();
      expect(
        h1Count,
        `Expected exactly 1 <h1> on ${sample.path}, but found ${h1Count}`
      ).toBe(1);

      const h1Text = (await h1.first().textContent())?.trim();
      expect(h1Text, `<h1> on ${sample.path} cannot be empty`).toBeTruthy();
      expect(h1Text!.length).toBeGreaterThan(2);

      // 4. Assert Unique, Descriptive Title
      const title = (await page.title()).trim();
      expect(title.length, `Title on ${sample.path} is empty`).toBeGreaterThan(3);
      expect(
        title.includes('হালচাল') || title.includes('Halchal'),
        `Title "${title}" on ${sample.path} should contain brand name`
      ).toBe(true);

      if (seenTitles.has(title)) {
        const prevPath = seenTitles.get(title);
        throw new Error(
          `Title collision detected: "${title}" on ${sample.path} duplicates title on ${prevPath}`
        );
      }
      seenTitles.set(title, sample.path);

      // 5. Assert JSON-LD parses and conforms to Schema.org
      const jsonLdScripts = page.locator('script[type="application/ld+json"]');
      const scriptCount = await jsonLdScripts.count();

      if (sample.hasJsonLd) {
        expect(
          scriptCount,
          `Expected JSON-LD script tag on ${sample.path}, found 0`
        ).toBeGreaterThanOrEqual(1);

        for (let i = 0; i < scriptCount; i++) {
          const rawJson = await jsonLdScripts.nth(i).textContent();
          expect(rawJson, `JSON-LD script #${i} on ${sample.path} is empty`).toBeTruthy();

          let parsed: any;
          try {
            parsed = JSON.parse(rawJson!);
          } catch (err: any) {
            throw new Error(`JSON-LD parse failure on ${sample.path} script #${i}: ${err.message}`);
          }

          expect(parsed, `JSON-LD on ${sample.path} script #${i} did not yield an object`).toBeTruthy();
          expect(
            parsed['@context'],
            `JSON-LD on ${sample.path} missing or invalid @context: ${parsed['@context']}`
          ).toMatch(/schema\.org/i);

          // Handle single Schema.org entity or @graph collection
          const entities = Array.isArray(parsed)
            ? parsed
            : Array.isArray(parsed['@graph'])
            ? parsed['@graph']
            : [parsed];

          expect(
            entities.length,
            `Expected at least one Schema.org entity inside JSON-LD on ${sample.path}`
          ).toBeGreaterThan(0);

          for (const entity of entities) {
            expect(
              entity['@type'],
              `JSON-LD entity on ${sample.path} missing @type`
            ).toBeTruthy();
          }
        }
      }

      // 6. Assert OpenGraph Image exists and is reachable (HTTP 200)
      const ogImageMeta = page.locator('meta[property="og:image"]');
      expect(
        await ogImageMeta.count(),
        `Expected meta[property="og:image"] on ${sample.path}`
      ).toBeGreaterThanOrEqual(1);

      const ogImageUrl = await ogImageMeta.first().getAttribute('content');
      expect(ogImageUrl, `og:image content on ${sample.path} is empty`).toBeTruthy();
      expect(
        ogImageUrl?.startsWith('http://') || ogImageUrl?.startsWith('https://'),
        `og:image on ${sample.path} must be absolute, got "${ogImageUrl}"`
      ).toBe(true);

      // Probe OG image endpoint directly
      const imgRes = await request.get(ogImageUrl!);
      expect(
        imgRes.status(),
        `OG image ${ogImageUrl} on ${sample.path} returned status ${imgRes.status()}`
      ).toBe(200);

      const contentType = imgRes.headers()['content-type'] || '';
      expect(
        contentType.includes('image/') || contentType.includes('application/octet-stream'),
        `OG image ${ogImageUrl} returned non-image content-type: "${contentType}"`
      ).toBe(true);
    });
  }
});
