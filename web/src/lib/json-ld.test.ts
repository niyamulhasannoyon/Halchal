/**
 * Halchal - Structured Data (JSON-LD) Unit & Linting Tests
 *
 * Verifies:
 * 1. Safe JSON-LD serialization (HTML escaping for '<', '>', '&')
 * 2. RootLayout WebSite & Organization schemas (STRICTLY NO SearchAction)
 * 3. BreadcrumbList schema on area and hub pages (1-based positions, canonical absolute URLs)
 * 4. WebPage schema with real dateModified and inLanguage: "bn"
 * 5. Strict lint-style tests that FAIL if markup contains FAQPage, Review, Rating, Event,
 *    or fields not visible on the crowd-sourced page.
 */

import { describe, it, expect } from 'vitest';
import { siteConfig } from '@/config/site';
import {
  serializeJsonLd,
  createWebSiteSchema,
  createOrganizationSchema,
  createRootJsonLd,
  createBreadcrumbSchema,
  createWebPageSchema,
  lintStructuredData,
  FORBIDDEN_SCHEMA_TYPES,
  FORBIDDEN_SCHEMA_FIELDS,
} from './json-ld';

describe('1. Safe JSON-LD Serialization (serializeJsonLd)', () => {
  it('strictly escapes "<", ">", and "&" to prevent script tag breakout / XSS', () => {
    const maliciousPayload = {
      name: '</script><script>alert("XSS")</script>',
      description: 'Test & Validate <b>safe</b> text',
    };

    const serialized = serializeJsonLd(maliciousPayload);

    // Assert that raw '<' and '>' are NEVER present in serialized JSON-LD
    expect(serialized).not.toContain('</script>');
    expect(serialized).not.toContain('<script>');
    expect(serialized).not.toContain('<b>');
    expect(serialized).toContain('\\u003c/script\\u003e');
    expect(serialized).toContain('\\u003cscript\\u003e');
    expect(serialized).toContain('\\u0026');

    // Assert that JSON.parse decodes it back to original content accurately
    const parsed = JSON.parse(serialized);
    expect(parsed.name).toBe('</script><script>alert("XSS")</script>');
    expect(parsed.description).toBe('Test & Validate <b>safe</b> text');
  });
});

describe('2. Root Layout Schemas: WebSite & Organization', () => {
  it('generates valid WebSite schema and STRICTLY OMITS SearchAction / sitelinks searchbox', () => {
    const website = createWebSiteSchema();

    expect(website['@context']).toBe('https://schema.org');
    expect(website['@type']).toBe('WebSite');
    expect(website['@id']).toBe(`${siteConfig.url}/#website`);
    expect(website.name).toBe(siteConfig.name);
    expect(website.alternateName).toBe(siteConfig.nameEn);
    expect(website.url).toBe(siteConfig.url);
    expect(website.inLanguage).toBe('bn');
    expect(website.publisher).toEqual({
      '@id': `${siteConfig.url}/#organization`,
    });

    // CRITICAL: SearchAction is forbidden because Halchal is not a search engine
    expect(website).not.toHaveProperty('potentialAction');
    expect(website).not.toHaveProperty('searchAction');
  });

  it('generates valid Organization schema with logo and conditional sameAs', () => {
    const orgWithoutSameAs = createOrganizationSchema('https://halchal.bd', []);
    expect(orgWithoutSameAs['@context']).toBe('https://schema.org');
    expect(orgWithoutSameAs['@type']).toBe('Organization');
    expect(orgWithoutSameAs['@id']).toBe('https://halchal.bd/#organization');
    expect(orgWithoutSameAs.name).toBe(siteConfig.name);
    expect(orgWithoutSameAs.url).toBe('https://halchal.bd');
    expect(orgWithoutSameAs.logo).toBe('https://halchal.bd/icons/icon-512.png');
    expect(orgWithoutSameAs.publishingPrinciples).toBe('https://halchal.bd/terms');
    // When no real profiles exist, sameAs should be omitted
    expect(orgWithoutSameAs.sameAs).toBeUndefined();

    // When real verified profiles exist, sameAs is included
    const verifiedProfiles = [
      'https://www.facebook.com/halchal.bd',
      'https://twitter.com/halchal_bd',
    ];
    const orgWithSameAs = createOrganizationSchema('https://halchal.bd', verifiedProfiles);
    expect(orgWithSameAs.sameAs).toEqual(verifiedProfiles);
  });

  it('creates combined connected @graph for root layout', () => {
    const rootGraph = createRootJsonLd('https://halchal.bd');
    expect(rootGraph['@context']).toBe('https://schema.org');
    expect(rootGraph['@graph']).toHaveLength(2);

    const types = rootGraph['@graph'].map((node) => node['@type']);
    expect(types).toContain('Organization');
    expect(types).toContain('WebSite');
  });
});

describe('3. BreadcrumbList Schema on Area and Hub Pages', () => {
  it('generates standard 1-based ListItem sequence with canonical absolute URLs', () => {
    const items = [
      { name: 'হোম', url: 'https://halchal.bd' },
      { name: 'ঢাকা', url: 'https://halchal.bd/map' },
      { name: 'ধানমন্ডি (ওয়ার্ড ১৫)', url: 'https://halchal.bd/z/883cf10ca1fffff?t=999' },
    ];

    const breadcrumbs = createBreadcrumbSchema(
      items,
      'https://halchal.bd/z/883cf10ca1fffff',
      'https://halchal.bd'
    );

    expect(breadcrumbs['@context']).toBe('https://schema.org');
    expect(breadcrumbs['@type']).toBe('BreadcrumbList');
    expect(breadcrumbs['@id']).toBe('https://halchal.bd/z/883cf10ca1fffff/#breadcrumb');
    expect(breadcrumbs.itemListElement).toHaveLength(3);

    expect(breadcrumbs.itemListElement[0]).toEqual({
      '@type': 'ListItem',
      position: 1,
      name: 'হোম',
      item: 'https://halchal.bd/',
    });

    expect(breadcrumbs.itemListElement[1]).toEqual({
      '@type': 'ListItem',
      position: 2,
      name: 'ঢাকা',
      item: 'https://halchal.bd/map',
    });

    // Must strip ?t= from breadcrumb item URL
    expect(breadcrumbs.itemListElement[2]).toEqual({
      '@type': 'ListItem',
      position: 3,
      name: 'ধানমন্ডি (ওয়ার্ড ১৫)',
      item: 'https://halchal.bd/z/883cf10ca1fffff',
    });
  });
});

describe('4. WebPage Schema (dateModified & inLanguage: "bn")', () => {
  it('generates WebPage schema with exact data update timestamp and Bengali language', () => {
    const realDataUpdate = '2026-11-20T10:45:00.000Z';
    const webpage = createWebPageSchema({
      title: 'ধানমন্ডি এলাকার হালচাল',
      description: 'ধানমন্ডি এলাকার বিদ্যুৎ, গ্যাস, পানি এবং এলপিজি সিলিন্ডারের সর্বশেষ লাইভ স্ট্যাটাস।',
      pathOrUrl: '/z/883cf10ca1fffff?t=2991946',
      dateModified: realDataUpdate,
    });

    expect(webpage['@context']).toBe('https://schema.org');
    expect(webpage['@type']).toBe('WebPage');
    expect(webpage['@id']).toBe(`${siteConfig.url}/z/883cf10ca1fffff/#webpage`);
    expect(webpage.url).toBe(`${siteConfig.url}/z/883cf10ca1fffff`);
    expect(webpage.name).toBe('ধানমন্ডি এলাকার হালচাল');
    expect(webpage.inLanguage).toBe('bn');
    expect(webpage.dateModified).toBe(realDataUpdate);
    expect(webpage.isPartOf).toEqual({
      '@id': `${siteConfig.url}/#website`,
    });
    expect(webpage.publisher).toEqual({
      '@id': `${siteConfig.url}/#organization`,
    });
  });
});

describe('5. Anti-Overclaiming Lint-Style Test Suite', () => {
  it('passes for legitimate Halchal WebSite, Organization, BreadcrumbList, and WebPage schemas', () => {
    const rootGraph = createRootJsonLd();
    const rootLint = lintStructuredData(rootGraph);
    expect(rootLint.isValid).toBe(true);
    expect(rootLint.errors).toHaveLength(0);

    const breadcrumbs = createBreadcrumbSchema([
      { name: 'হোম', url: '/' },
      { name: 'লাইভ ম্যাপ', url: '/map' },
    ]);
    const breadcrumbLint = lintStructuredData(breadcrumbs);
    expect(breadcrumbLint.isValid).toBe(true);
    expect(breadcrumbLint.errors).toHaveLength(0);

    const webpage = createWebPageSchema({
      title: 'লাইভ ম্যাপ — এলাকাভিত্তিক ইউটিলিটি হালচাল',
      description: 'ঢাকার বিভিন্ন এলাকার বিদ্যুৎ, গ্যাস ও পানির লাইভ ম্যাপ।',
      pathOrUrl: '/map',
      dateModified: '2026-11-20T08:00:00.000Z',
    });
    const webpageLint = lintStructuredData(webpage, ['লাইভ ম্যাপ', 'ইউটিলিটি হালচাল']);
    expect(webpageLint.isValid).toBe(true);
    expect(webpageLint.errors).toHaveLength(0);
  });

  it('FAILS if schema claims FAQPage, Review, Rating, AggregateRating, or Event', () => {
    FORBIDDEN_SCHEMA_TYPES.forEach((forbiddenType) => {
      const fraudulentSchema = {
        '@context': 'https://schema.org',
        '@type': forbiddenType,
        name: 'Unjustified rich result claim',
      };

      const result = lintStructuredData(fraudulentSchema);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes(`Forbidden schema type "${forbiddenType}"`))).toBe(true);
    });
  });

  it('FAILS if schema contains forbidden fields (potentialAction, aggregateRating, review, ratingValue)', () => {
    FORBIDDEN_SCHEMA_FIELDS.forEach((forbiddenField) => {
      const fraudulentSchema = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Valid WebPage with hidden spam field',
        inLanguage: 'bn',
        dateModified: new Date().toISOString(),
        [forbiddenField]: { ratingValue: 5, reviewCount: 120 },
      };

      const result = lintStructuredData(fraudulentSchema);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes(`Forbidden field "${forbiddenField}"`))).toBe(true);
    });
  });

  it('FAILS if WebSite schema contains SearchAction / sitelinks searchbox', () => {
    const websiteWithSearchAction = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'হালচাল',
      url: 'https://halchal.bd',
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://halchal.bd/search?q={query}',
        'query-input': 'required name=query',
      },
    };

    const result = lintStructuredData(websiteWithSearchAction);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('SearchAction/sitelinks searchbox is strictly forbidden'))).toBe(true);
  });

  it('FAILS if text in schema does not correlate with visible content on the page', () => {
    const webpageWithInvisibleClaim = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'অফিসিয়াল সরকারি বিদ্যুৎ বোর্ড অনুমোদিত রিপোর্ট',
      inLanguage: 'bn',
      dateModified: '2026-11-20T10:00:00.000Z',
    };

    // Visible page only has community disclaimer, not official government claim
    const visiblePageText = [
      'নাগরিকদের তথ্যের ভিত্তিতে তৈরি, এটি কোনো অফিশিয়াল পরিমাপ নয়',
      'ধানমন্ডি এলাকার হালচাল',
    ];

    const result = lintStructuredData(webpageWithInvisibleClaim, visiblePageText);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('was not found among visible text'))).toBe(true);
  });
});
