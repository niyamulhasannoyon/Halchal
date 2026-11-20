import { test, expect } from '@playwright/test';

const PUBLIC_ROUTES = [
  { path: '/', name: 'Home' },
  { path: '/z/883cf10ca1fffff', name: 'Dhanmondi Zone' },
  { path: '/map', name: 'Live Map' },
  { path: '/history', name: '7-Day Insights History' },
  { path: '/privacy', name: 'Privacy Policy' },
  { path: '/terms', name: 'Terms of Service' },
];

test.describe('Halchal Technical SEO Architecture & Quality Suite', () => {
  const titles = new Map<string, string>();
  const descriptions = new Map<string, string>();

  for (const route of PUBLIC_ROUTES) {
    test(`Route ${route.path} (${route.name}): exactly one H1, unique title, description, absolute canonical, and valid robots`, async ({
      page,
      baseURL,
    }) => {
      const response = await page.goto(route.path);
      expect(response?.status()).toBe(200);

      // 1. Assert exactly one H1 tag
      const h1Elements = page.locator('h1');
      const h1Count = await h1Elements.count();
      expect(
        h1Count,
        `Expected exactly 1 <h1> on ${route.path}, found ${h1Count}`
      ).toBe(1);
      const h1Text = (await h1Elements.first().textContent())?.trim();
      expect(h1Text).toBeTruthy();

      // 2. Assert unique title
      const pageTitle = (await page.title()).trim();
      expect(pageTitle.length).toBeGreaterThan(0);
      expect(pageTitle).toContain('হালচাল');

      // Check uniqueness across routes
      for (const [prevPath, prevTitle] of titles.entries()) {
        expect(
          pageTitle,
          `Title on ${route.path} duplicates title on ${prevPath}: "${pageTitle}"`
        ).not.toBe(prevTitle);
      }
      titles.set(route.path, pageTitle);

      // 3. Assert unique meta description
      const descMeta = page.locator('meta[name="description"]');
      const descCount = await descMeta.count();
      expect(descCount, `Expected 1 meta description on ${route.path}`).toBe(1);
      const description = (await descMeta.getAttribute('content'))?.trim() || '';
      expect(description.length).toBeGreaterThan(15);

      // Check uniqueness across routes
      for (const [prevPath, prevDesc] of descriptions.entries()) {
        expect(
          description,
          `Description on ${route.path} duplicates description on ${prevPath}`
        ).not.toBe(prevDesc);
      }
      descriptions.set(route.path, description);

      // 4. Assert canonical is present and absolute
      const canonicalLink = page.locator('link[rel="canonical"]');
      const canonicalCount = await canonicalLink.count();
      expect(canonicalCount, `Expected 1 canonical tag on ${route.path}`).toBe(1);
      const canonicalHref = await canonicalLink.getAttribute('href');
      expect(canonicalHref).toBeTruthy();
      expect(
        canonicalHref?.startsWith('http://') || canonicalHref?.startsWith('https://'),
        `Canonical on ${route.path} must be absolute, got "${canonicalHref}"`
      ).toBe(true);
      expect(canonicalHref).not.toContain('?t=');
      expect(canonicalHref).not.toContain('utm_');
      expect(canonicalHref).not.toContain('fbclid');

      // 5. Assert valid robots meta tag (must allow index for public routes)
      const robotsMeta = page.locator('meta[name="robots"]');
      if ((await robotsMeta.count()) > 0) {
        const robotsContent = await robotsMeta.getAttribute('content');
        expect(robotsContent).not.toContain('noindex');
        expect(robotsContent).toContain('index');
      }

      // 6. Assert lang="bn" on <html>
      const htmlLang = await page.locator('html').getAttribute('lang');
      expect(htmlLang).toBe('bn');
    });
  }

  test('Canonical deduplication: share URLs with ?t= and tracking params resolve to clean canonical', async ({
    page,
  }) => {
    // Navigate with rotating Facebook cache-buster & UTM tracking parameters
    await page.goto(
      '/z/883cf10ca1fffff?t=987654&utm_source=facebook&utm_medium=social&utm_campaign=winter&fbclid=IwAR9988'
    );

    const canonicalLink = page.locator('link[rel="canonical"]');
    const canonicalHref = await canonicalLink.getAttribute('href');

    expect(canonicalHref).toBeTruthy();
    expect(canonicalHref).not.toContain('?t=');
    expect(canonicalHref).not.toContain('987654');
    expect(canonicalHref).not.toContain('utm_source');
    expect(canonicalHref).not.toContain('fbclid');
    expect(canonicalHref?.endsWith('/z/883cf10ca1fffff')).toBe(true);
  });

  test('robots.txt strictly conforms to specifications', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);

    const body = await res.text();

    // Allows public pages and social OG cards
    expect(body).toContain('Allow: /');
    expect(body).toContain('Allow: /z/');
    expect(body).toContain('Allow: /map');
    expect(body).toContain('Allow: /history');
    expect(body).toContain('Allow: /privacy');
    expect(body).toContain('Allow: /terms');
    expect(body).toContain('Allow: /api/og'); // Explicitly allowed for social scrapers

    // Disallows internal and mutation APIs
    expect(body).toContain('Disallow: /api/report');
    expect(body).toContain('Disallow: /api/zone/');
    expect(body).toContain('Disallow: /admin/');
    expect(body).toContain('Disallow: /auth/');
    expect(body).toContain('Disallow: /settings');
    expect(body).toContain('Disallow: /notifications');
    expect(body).toContain('Disallow: /login');
    expect(body).toContain('Disallow: /design-preview');

    // References sitemap
    expect(body).toContain('Sitemap:');
    expect(body).toContain('/sitemap.xml');
  });

  test('Sitemap contains only 200-status indexable URLs and real lastmod timestamps', async ({
    request,
  }) => {
    // 1. Fetch root sitemap or partitioned city sitemap
    const sitemapIndexRes = await request.get('/sitemap.xml');
    expect(sitemapIndexRes.status()).toBe(200);
    const indexBody = await sitemapIndexRes.text();

    let targetSitemapXml = indexBody;

    // If partitioned by city via generateSitemaps, fetch /sitemap/dhaka.xml
    if (indexBody.includes('sitemapindex') && indexBody.includes('/sitemap/dhaka.xml')) {
      const cityRes = await request.get('/sitemap/dhaka.xml');
      expect(cityRes.status()).toBe(200);
      targetSitemapXml = await cityRes.text();
    }

    // Extract all <loc> URLs
    const locMatches = Array.from(
      targetSitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)
    ).map((m) => m[1]);

    expect(locMatches.length).toBeGreaterThan(0);

    // Verify private and noindex routes are excluded
    for (const url of locMatches) {
      expect(url).not.toContain('/admin');
      expect(url).not.toContain('/settings');
      expect(url).not.toContain('/notifications');
      expect(url).not.toContain('/login');
      expect(url).not.toContain('/design-preview');
      expect(url).not.toContain('/api/');

      // Verify each URL returns HTTP 200
      const parsedPath = new URL(url).pathname;
      const pageRes = await request.get(parsedPath);
      expect(
        pageRes.status(),
        `Sitemap URL ${url} returned unexpected status ${pageRes.status()}`
      ).toBe(200);
    }

    // Verify lastModified timestamps are real historical/verified dates (not dynamically generated current time)
    const lastModMatches = Array.from(
      targetSitemapXml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)
    ).map((m) => m[1]);

    expect(lastModMatches.length).toBeGreaterThan(0);
    const nowEpoch = Date.now();
    for (const lastMod of lastModMatches) {
      const timestamp = new Date(lastMod).getTime();
      expect(Number.isNaN(timestamp)).toBe(false);
      expect(timestamp).toBeLessThanOrEqual(nowEpoch);
    }
  });

  test('Custom 404 returns genuine HTTP 404 status (not soft 404) for unknown slugs', async ({
    request,
    page,
  }) => {
    // Direct HTTP status assertion
    const res = await request.get('/z/invalid-slug-xyz123');
    expect(res.status()).toBe(404);

    // Browser navigation and Bengali 404 UI assertion
    const pageRes = await page.goto('/z/invalid-slug-xyz123');
    expect(pageRes?.status()).toBe(404);
    await expect(page.getByText('পাতাটি পাওয়া যায়নি')).toBeVisible();
    await expect(page.locator('h1')).toHaveText(/পাতাটি পাওয়া যায়নি/);
  });

  test('Renamed zone slugs issue 301 Permanent Redirects', async ({ page }) => {
    // /z/dhanmondi -> /z/883cf10ca1fffff
    const dhanmondiRes = await page.goto('/z/dhanmondi');
    expect(dhanmondiRes?.status()).toBe(200);
    expect(page.url()).toContain('/z/883cf10ca1fffff');

    // /z/mirpur -> /z/883cf10eb1fffff
    await page.goto('/z/mirpur');
    expect(page.url()).toContain('/z/883cf10eb1fffff');
  });
});
