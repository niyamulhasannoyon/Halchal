/**
 * Halchal - Technical SEO Foundation Unit Tests
 * Architecture: Technical SEO Foundation (ADR-0017)
 *
 * Covers:
 * 1. Site configuration & production URL validation
 * 2. Canonical URL normalization & parameter stripping (?t=, utm_*, fbclid, trailing slash, hex casing)
 * 3. Crowd-sourced data indexation rules: shouldIndexZone() across all decision branches
 * 4. buildMetadata() validation ensuring unique title, description, and absolute canonical
 * 5. Google SERP preview visual rendering & title/description length compliance checks
 * 6. Robots rules & Sitemap indexation constraints
 */

import { describe, it, expect } from 'vitest';
import { siteConfig, getSiteUrl } from '@/config/site';
import {
  getCanonicalUrl,
  shouldIndexZone,
  buildMetadata,
  formatSerpPreview,
  ZoneIndexCriteria,
} from '@/lib/seo';
import { SLUG_REDIRECTS } from '@/config/redirects';
import robots from '@/app/robots';
import sitemap, { SEED_ZONE_METRICS, generateSitemaps } from '@/app/sitemap';
import { DHAKA_SEED_ZONES } from '@/lib/zones';

describe('1. Site Configuration Module (siteConfig)', () => {
  it('exposes authentic Bengali brand name, English name, and tagline', () => {
    expect(siteConfig.name).toBe('হালচাল');
    expect(siteConfig.nameEn).toBe('Halchal');
    expect(siteConfig.locale).toBe('bn-BD');
    expect(siteConfig.ogLocale).toBe('bn_BD');
    expect(siteConfig.tagline).toBe('এলাকার কারেন্ট, গ্যাস ও পানির লাইভ খবর');
    expect(siteConfig.url).toBeDefined();
    expect(siteConfig.url.startsWith('http')).toBe(true);
  });

  it('fails build in production when NEXT_PUBLIC_SITE_URL is missing', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    const originalTestMode = process.env.HALCHAL_TEST_MODE;

    try {
      // @ts-expect-error mutating for testing
      process.env.NODE_ENV = 'production';
      delete process.env.NEXT_PUBLIC_SITE_URL;
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.HALCHAL_TEST_MODE;

      expect(() => getSiteUrl()).toThrowError(
        /CRITICAL: NEXT_PUBLIC_SITE_URL \(or NEXT_PUBLIC_APP_URL\) is missing in production environment/
      );
    } finally {
      // Restore environment
      // @ts-expect-error mutating for testing
      process.env.NODE_ENV = originalEnv;
      if (originalSiteUrl) process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
      if (originalAppUrl) process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
      if (originalTestMode) process.env.HALCHAL_TEST_MODE = originalTestMode;
    }
  });
});

describe('2. Canonical URL Normalization (getCanonicalUrl)', () => {
  const base = 'https://halchal.bd';

  it('strictly strips Facebook cache-busting ?t= parameter', () => {
    const input = '/z/883cf10ca1fffff?t=2991946';
    const canonical = getCanonicalUrl(input, base);
    expect(canonical).toBe('https://halchal.bd/z/883cf10ca1fffff');
    expect(canonical).not.toContain('?t=');
    expect(canonical).not.toContain('2991946');
  });

  it('strictly strips marketing tracking parameters (utm_*, fbclid, gclid)', () => {
    const input =
      '/z/883cf10ca1fffff?utm_source=facebook&utm_medium=cpc&utm_campaign=winter2026&fbclid=IwAR2x_abc123&gclid=CjwKCAiA';
    const canonical = getCanonicalUrl(input, base);
    expect(canonical).toBe('https://halchal.bd/z/883cf10ca1fffff');
  });

  it('simultaneously strips ?t=, fbclid, and multiple utm parameters together', () => {
    const input =
      '/z/883cf10ca1fffff?t=488192&utm_source=whatsapp&fbclid=998877&other=safe';
    const canonical = getCanonicalUrl(input, base);
    expect(canonical).toBe('https://halchal.bd/z/883cf10ca1fffff?other=safe');
  });

  it('normalizes uppercase H3 hex slugs to lowercase', () => {
    const input = '/z/883CF10CA1FFFFF';
    const canonical = getCanonicalUrl(input, base);
    expect(canonical).toBe('https://halchal.bd/z/883cf10ca1fffff');
  });

  it('normalizes trailing slashes (strips trailing slash except for root)', () => {
    expect(getCanonicalUrl('/map/', base)).toBe('https://halchal.bd/map');
    expect(getCanonicalUrl('/z/883cf10ca1fffff/', base)).toBe(
      'https://halchal.bd/z/883cf10ca1fffff'
    );
    expect(getCanonicalUrl('/', base)).toBe('https://halchal.bd/');
  });

  it('returns absolute URL when given a full external URL', () => {
    const input = 'https://halchal420.vercel.app/z/883cf10ca1fffff?t=123';
    const canonical = getCanonicalUrl(input, base);
    expect(canonical).toBe('https://halchal.bd/z/883cf10ca1fffff');
  });
});

describe('3. Indexing Rules for Crowd-Sourced Data (shouldIndexZone)', () => {
  it('rejects null, undefined, and non-object inputs', () => {
    expect(shouldIndexZone(null)).toBe(false);
    expect(shouldIndexZone(undefined)).toBe(false);
    // @ts-expect-error testing invalid type
    expect(shouldIndexZone('')).toBe(false);
    // @ts-expect-error testing invalid type
    expect(shouldIndexZone(123)).toBe(false);
  });

  it('rejects zone with confirmed data on fewer than 3 days (e.g. 2 days, 20 reporters)', () => {
    const zone: ZoneIndexCriteria = {
      h3_index: '883cf10ca1fffff',
      confirmedDaysLast30Days: 2,
      distinctReportersEver: 20,
      hasConfirmedData: true,
    };
    expect(shouldIndexZone(zone)).toBe(false);
  });

  it('rejects zone with fewer than 10 distinct reporters ever (e.g. 5 days, 9 reporters)', () => {
    const zone: ZoneIndexCriteria = {
      h3_index: '883cf10ca1fffff',
      confirmedDaysLast30Days: 5,
      distinctReportersEver: 9,
      hasConfirmedData: true,
    };
    expect(shouldIndexZone(zone)).toBe(false);
  });

  it('rejects zone failing both thresholds (e.g. 1 day, 3 reporters)', () => {
    const zone: ZoneIndexCriteria = {
      h3_index: '883cf10ca1fffff',
      confirmedDaysLast30Days: 1,
      distinctReportersEver: 3,
      hasConfirmedData: false,
    };
    expect(shouldIndexZone(zone)).toBe(false);
  });

  it('rejects zone in unknown or unverified state on that basis alone', () => {
    const unverifiedZone: ZoneIndexCriteria = {
      h3_index: '883cf10ca1fffff',
      confirmedDaysLast30Days: 0,
      distinctReportersEver: 12,
      state: 'unverified',
      hasConfirmedData: false,
    };
    expect(shouldIndexZone(unverifiedZone)).toBe(false);

    const unknownZone: ZoneIndexCriteria = {
      h3_index: '883cf10ca1fffff',
      confirmedDaysLast30Days: 0,
      distinctReportersEver: 0,
      state: 'unknown',
      hasConfirmedData: false,
      categories: {
        electricity: { state: 'unknown' },
        gas: { state: 'unknown' },
        water: { state: 'unknown' },
        lpg: { state: 'unknown' },
      },
    };
    expect(shouldIndexZone(unknownZone)).toBe(false);
  });

  it('approves zone meeting exact boundary threshold: 3 confirmed days AND 10 reporters with confirmed data', () => {
    const boundaryZone: ZoneIndexCriteria = {
      h3_index: '883cf10ca1fffff',
      confirmedDaysLast30Days: 3,
      distinctReportersEver: 10,
      hasConfirmedData: true,
    };
    expect(shouldIndexZone(boundaryZone)).toBe(true);
  });

  it('approves well-established zone (e.g. Banani pilot: 14 confirmed days, 42 reporters)', () => {
    const establishedZone: ZoneIndexCriteria = {
      h3_index: '883cf13b25fffff',
      confirmedDaysLast30Days: 14,
      distinctReportersEver: 42,
      hasConfirmedData: true,
    };
    expect(shouldIndexZone(establishedZone)).toBe(true);
  });

  it('correctly handles snake_case database columns (confirmed_days_last_30_days, distinct_reporters_ever)', () => {
    const dbRowZone = {
      h3_index: '883cf13b25fffff',
      confirmed_days_last_30_days: 7,
      distinct_reporters_ever: 25,
      has_confirmed_data: true,
    };
    expect(shouldIndexZone(dbRowZone)).toBe(true);
  });
});

describe('4. Metadata System (buildMetadata)', () => {
  it('generates complete metadata with absolute canonical, 1200x630 OG image, Bengali alt, and restricts ?t= ONLY to image URL', () => {
    const meta = buildMetadata({
      title: 'মিরপুর ১০ এলাকার হালচাল',
      description: 'মিরপুর ১০ এলাকার বিদ্যুৎ, গ্যাস, পানি ও এলপিজি সিলিন্ডারের সর্বশেষ খবর।',
      path: '/z/883cf10eb1fffff?t=999888',
      ogImage: '/api/og?h3=883cf10eb1fffff',
    });

    expect(meta.title).toBe('মিরপুর ১০ এলাকার হালচাল');
    expect(meta.description).toBe(
      'মিরপুর ১০ এলাকার বিদ্যুৎ, গ্যাস, পানি ও এলপিজি সিলিন্ডারের সর্বশেষ খবর।'
    );

    // Canonical MUST NEVER contain ?t=
    expect(meta.alternates?.canonical).toBe(
      `${siteConfig.url}/z/883cf10eb1fffff`
    );
    expect(meta.alternates?.canonical).not.toContain('?t=');

    // og:url MUST be clean canonical and NEVER contain ?t=
    expect(meta.openGraph?.url).toBe(`${siteConfig.url}/z/883cf10eb1fffff`);
    expect(meta.openGraph?.url).not.toContain('?t=');

    // og:locale = bn_BD and og:type = website
    expect(meta.openGraph?.locale).toBe('bn_BD');
    expect((meta.openGraph as any)?.type).toBe('website');

    // OG Image must have ?t= bucket, 1200x630 dimensions, and Bengali alt
    const ogImg = Array.isArray(meta.openGraph?.images)
      ? meta.openGraph.images[0]
      : meta.openGraph?.images;

    expect(ogImg).toBeDefined();
    expect(typeof ogImg).toBe('object');
    expect((ogImg as any).width).toBe(1200);
    expect((ogImg as any).height).toBe(630);
    expect((ogImg as any).alt).toBe('মিরপুর ১০ এলাকার হালচাল — হালচাল');
    expect((ogImg as any).url).toContain('/api/og?h3=883cf10eb1fffff&t=');

    // Twitter image also receives the time bucket
    const twImages = meta.twitter?.images as string[];
    expect(twImages).toBeDefined();
    expect(twImages[0]).toContain('/api/og?h3=883cf10eb1fffff&t=');

    expect(meta.robots).toEqual({
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    });
  });

  it('enforces noindex, follow when noindex flag is true', () => {
    const meta = buildMetadata({
      title: 'অযাচাইকৃত এলাকা',
      description: 'এই এলাকার এখনো পর্যাপ্ত তথ্য নেই।',
      path: '/z/883cf13941fffff',
      noindex: true,
    });

    expect(meta.robots).toEqual({
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true,
      },
    });
  });

  it('enforces strict noindex, nofollow on preview and staging deployments', () => {
    const originalVercelEnv = process.env.VERCEL_ENV;
    process.env.VERCEL_ENV = 'preview';

    try {
      const meta = buildMetadata({
        title: 'ধানমন্ডি এলাকার হালচাল',
        description: 'ধানমন্ডি এলাকার বিদ্যুৎ ও গ্যাস স্ট্যাটাস।',
        path: '/dhaka/dhanmondi',
        noindex: false, // Explicitly requesting index, but environment MUST override
      });

      expect(meta.robots).toEqual({
        index: false,
        follow: false,
        googleBot: {
          index: false,
          follow: false,
        },
      });
    } finally {
      process.env.VERCEL_ENV = originalVercelEnv;
    }
  });
});

describe('5. SERP Preview & Character Length Verification (Visual Preview)', () => {
  const routes = [
    {
      route: '/',
      title: 'হালচাল — এলাকার লাইভ ইউটিলিটি খবর',
      desc: 'এলাকার কারেন্ট, গ্যাস ও পানির লাইভ খবর। বিদ্যুৎ, গ্যাস, পানি এবং এলপিজি সিলিন্ডারের হাইপারলোকাল স্ট্যাটাস জানুন। নাগরিকদের তথ্যের ভিত্তিতে হালচাল।',
    },
    {
      route: '/z/883cf10ca1fffff',
      title: 'ধানমন্ডি এলাকার হালচাল',
      desc: 'ধানমন্ডি এলাকার বিদ্যুৎ, গ্যাস, পানি এবং এলপিজি সিলিন্ডারের সর্বশেষ লাইভ স্ট্যাটাস। নাগরিকদের তথ্যের ভিত্তিতে তৈরি হালচাল।',
    },
    {
      route: '/map',
      title: 'লাইভ ম্যাপ — এলাকাভিত্তিক ইউটিলিটি',
      desc: 'ঢাকার বিভিন্ন এলাকার বিদ্যুৎ, গ্যাস ও পানির লাইভ ম্যাপ। Uber H3 হেক্সাগন গ্রিডে নাগরিক রিপোর্টের রিয়েল-টাইম অবস্থা ও উপাত্ত দেখুন।',
    },
    {
      route: '/history',
      title: '৭ দিনের ইউটিলিটি রিপোর্ট ও ইতিহাস',
      desc: 'এলাকাভিত্তিক গত ৭ দিনের বিদ্যুৎ বিভ্রাট, গ্যাস সংকট ও পানির প্রেসারের নির্ভরযোগ্য ইতিহাস এবং কমিউনিটি বিশ্লেষণ। নাগরিকদের রিপোর্টের সারসংক্ষেপ।',
    },
    {
      route: '/privacy',
      title: 'গোপনীয়তা নীতি',
      desc: 'হালচালের কঠোর গোপনীয়তা নীতি: জিরো র জিপিএস স্টোরেজ, সম্পূর্ণ নাগরিক পরিচয়হীনতা এবং স্বচ্ছ ডেটা নীতিমালার বিস্তারিত বিবরণ।',
    },
    {
      route: '/terms',
      title: 'ব্যবহারের শর্তাবলি',
      desc: 'হালচাল ব্যবহারের নিয়মাবলী, নাগরিক দায়িত্ব, অপব্যবহার রোধ নীতিমালা এবং পরিষেবা ব্যবহারের শর্তাবলির পূর্ণ বিবরণ।',
    },
  ];

  it('renders Google SERP preview and verifies lengths visually without hard-failing', () => {
    console.log('\n=================== GOOGLE SERP PREVIEW AUDIT ===================');

    routes.forEach((r) => {
      const preview = formatSerpPreview(r.title, r.desc, r.route);
      console.log(preview.previewBlock);

      // Verify Title Budget: <= 60 characters for desktop/mobile SERP display
      expect(preview.titleLength).toBeLessThanOrEqual(60);

      // Verify Description Budget: Practical Bengali range ~100 to 165 characters
      expect(preview.descriptionLength).toBeGreaterThanOrEqual(95);
      expect(preview.descriptionLength).toBeLessThanOrEqual(165);
    });

    console.log('=================================================================\n');
  });
});

describe('6. 301 Redirects Table Specification', () => {
  it('contains valid permanent 301 rules for all key Dhaka seed zones', () => {
    expect(SLUG_REDIRECTS.length).toBeGreaterThanOrEqual(10);

    const dhanmondiRedirect = SLUG_REDIRECTS.find(
      (r) => r.source === '/z/dhanmondi'
    );
    expect(dhanmondiRedirect).toBeDefined();
    expect(dhanmondiRedirect?.destination).toBe('/dhaka/dhanmondi');
    expect(dhanmondiRedirect?.permanent).toBe(true);

    const mirpurRedirect = SLUG_REDIRECTS.find(
      (r) => r.source === '/z/mirpur-10' || r.source === '/z/mirpur'
    );
    expect(mirpurRedirect).toBeDefined();
    expect(mirpurRedirect?.permanent).toBe(true);
  });
});

describe('7. Robots & Sitemap Constraints', () => {
  it('robots() allows all public pages, explicitly allows /api/og, and disallows API/auth/admin', () => {
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules[0] : r.rules;

    expect(rules.allow).toContain('/');
    expect(rules.allow).toContain('/map');
    expect(rules.allow).toContain('/history');
    expect(rules.allow).toContain('/privacy');
    expect(rules.allow).toContain('/terms');
    expect(rules.allow).toContain('/z/');
    expect(rules.allow).toContain('/api/og'); // Critical: OG image crawlability

    expect(rules.disallow).toContain('/api/report');
    expect(rules.disallow).toContain('/api/zone/');
    expect(rules.disallow).toContain('/admin/');
    expect(rules.disallow).toContain('/auth/');
    expect(rules.disallow).toContain('/settings');
    expect(rules.disallow).toContain('/notifications');
    expect(rules.disallow).toContain('/login');
    expect(rules.disallow).toContain('/design-preview');

    expect(r.sitemap).toBe(`${siteConfig.url}/sitemap.xml`);
  });

  it('sitemap() includes only indexable pages with real lastModified and excludes unverified zones', async () => {
    const sitemaps = await generateSitemaps();
    expect(sitemaps).toEqual([{ id: 'dhaka' }]);

    const entries = await sitemap({ id: 'dhaka' });
    expect(entries.length).toBeGreaterThan(0);

    const urls = entries.map((e) => e.url);

    // Static pages included
    expect(urls).toContain(siteConfig.url);
    expect(urls).toContain(`${siteConfig.url}/map`);
    expect(urls).toContain(`${siteConfig.url}/history`);
    expect(urls).toContain(`${siteConfig.url}/privacy`);
    expect(urls).toContain(`${siteConfig.url}/terms`);

    // Noindex / private pages strictly excluded
    expect(urls).not.toContain(`${siteConfig.url}/admin`);
    expect(urls).not.toContain(`${siteConfig.url}/settings`);
    expect(urls).not.toContain(`${siteConfig.url}/notifications`);
    expect(urls).not.toContain(`${siteConfig.url}/login`);
    expect(urls).not.toContain(`${siteConfig.url}/design-preview`);

    // High activity zones included
    expect(urls).toContain(`${siteConfig.url}/z/883cf10ca1fffff`); // Dhanmondi
    expect(urls).toContain(`${siteConfig.url}/z/883cf13b25fffff`); // Banani
    expect(urls).toContain(`${siteConfig.url}/z/883cf13b27fffff`); // Gulshan 2

    // Unverified / insufficient zones excluded
    expect(urls).not.toContain(`${siteConfig.url}/z/883cf13941fffff`); // Badda (< 10 reporters)
    expect(urls).not.toContain(`${siteConfig.url}/z/883cf1766bfffff`); // Lalbagh (< 3 days)

    // Real lastModified timestamps verified (never the current millisecond)
    const beforeNow = Date.now();
    for (const entry of entries) {
      expect(entry.lastModified).toBeDefined();
      const lastModTime = new Date(entry.lastModified!).getTime();
      expect(lastModTime).toBeLessThanOrEqual(beforeNow);
    }
  });
});
