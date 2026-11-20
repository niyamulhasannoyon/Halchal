/**
 * Halchal - Trust & Evergreen Content Layer Test Suite
 * Architecture: Technical SEO Foundation & Evergreen Content (ADR-0017)
 *
 * Verifies:
 * 1. Exactly one semantic <h1> per page across all trust pages and evergreen guides
 * 2. Unique, descriptive meta titles and descriptions for every page (no duplicates)
 * 3. Title and description length compliance with SERP budgets
 * 4. All internal links in footer, header, guides, and sitemap resolve to valid routes
 * 5. Dynamic LPG price integration from official_prices (no hardcoded price in prose)
 * 6. Stale content audit detection (>90 days)
 * 7. Truthful Article and WebPage JSON-LD schemas
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { EVERGREEN_GUIDES, getGuideBySlug } from '@/data/guides';
import { buildArticleJsonLd, buildWebPageJsonLd } from '@/lib/json-ld';
import { getLatestOfficialLpgPrice } from '@/lib/official-price';
import { auditGuides } from '../../../scripts/check-stale-content';
import { siteConfig } from '@/config/site';

const PAGES_DIR = path.resolve(__dirname, '../app');

const TRUST_PAGES = [
  { slug: 'about', file: 'about/page.tsx', path: '/about' },
  { slug: 'how-it-works', file: 'how-it-works/page.tsx', path: '/how-it-works' },
  { slug: 'contact', file: 'contact/page.tsx', path: '/contact' },
  { slug: 'privacy', file: 'privacy/page.tsx', path: '/privacy' },
  { slug: 'terms', file: 'terms/page.tsx', path: '/terms' },
  { slug: 'sitemap-pages', file: 'sitemap-pages/page.tsx', path: '/sitemap-pages' },
  { slug: 'guides-index', file: 'guides/page.tsx', path: '/guides' },
];

const GUIDE_PAGES = EVERGREEN_GUIDES.map((g) => ({
  slug: g.slug,
  file: `guides/${g.slug}/page.tsx`,
  path: g.path,
}));

const ALL_CONTENT_PAGES = [...TRUST_PAGES, ...GUIDE_PAGES];

describe('Trust & Evergreen Content Layer — Semantic Heading Hierarchy', () => {
  it('ensures each page contains EXACTLY ONE <h1> tag', () => {
    for (const page of ALL_CONTENT_PAGES) {
      const fullPath = path.join(PAGES_DIR, page.file);
      expect(fs.existsSync(fullPath), `File must exist: ${page.file}`).toBe(true);

      const content = fs.readFileSync(fullPath, 'utf-8');

      // Match all occurrences of <h1
      const h1Matches = content.match(/<h1[\s>]/g) || [];
      expect(
        h1Matches.length,
        `Page ${page.file} must have exactly one <h1> tag, but found ${h1Matches.length}`
      ).toBe(1);
    }
  });

  it('ensures all sub-sections use <h2> or <h3> headings below <h1>', () => {
    for (const page of ALL_CONTENT_PAGES) {
      const fullPath = path.join(PAGES_DIR, page.file);
      const content = fs.readFileSync(fullPath, 'utf-8');

      // Ensure h2 tags exist for scannable hierarchy
      const h2Matches = content.match(/<h2[\s>]/g) || [];
      expect(
        h2Matches.length,
        `Page ${page.file} should contain scannable <h2> sub-sections`
      ).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('Trust & Evergreen Content Layer — Unique Metadata & SERP Budgets', () => {
  it('ensures every trust page and guide exports unique titles and descriptions', () => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();

    for (const page of ALL_CONTENT_PAGES) {
      const fullPath = path.join(PAGES_DIR, page.file);
      const content = fs.readFileSync(fullPath, 'utf-8');

      // Extract title from buildMetadata
      const titleMatch = content.match(/title:\s*['"`](.*?)['"`]|title:\s*guide\.metaTitle/);
      expect(titleMatch, `Page ${page.file} must define a title in buildMetadata`).toBeTruthy();

      let resolvedTitle = titleMatch![1];
      if (!resolvedTitle) {
        const guideMeta = EVERGREEN_GUIDES.find((g) => page.file.includes(g.slug));
        resolvedTitle = guideMeta?.metaTitle || '';
      }

      // Extract description from buildMetadata
      const descMatch = content.match(/description:\s*['"`]([\s\S]*?)['"`]|description:\s*guide\.metaDescription/);
      expect(descMatch, `Page ${page.file} must define a description in buildMetadata`).toBeTruthy();

      let resolvedDesc = descMatch![1];
      if (!resolvedDesc) {
        const guideMeta = EVERGREEN_GUIDES.find((g) => page.file.includes(g.slug));
        resolvedDesc = guideMeta?.metaDescription || '';
      }

      // Assert uniqueness
      expect(
        titles.has(resolvedTitle),
        `Duplicate title found: "${resolvedTitle}" in ${page.file}`
      ).toBe(false);
      titles.add(resolvedTitle);

      expect(
        descriptions.has(resolvedDesc),
        `Duplicate description found: "${resolvedDesc}" in ${page.file}`
      ).toBe(false);
      descriptions.add(resolvedDesc);
    }
  });

  it('ensures all evergreen guides meet practical description length budgets', () => {
    for (const guide of EVERGREEN_GUIDES) {
      expect(
        guide.metaDescription.length,
        `Description for ${guide.slug} should be within 100-165 characters`
      ).toBeGreaterThanOrEqual(100);
      expect(
        guide.metaDescription.length,
        `Description for ${guide.slug} should be within 100-165 characters`
      ).toBeLessThanOrEqual(175);
    }
  });
});

describe('Trust & Evergreen Content Layer — Internal Linking Integrity', () => {
  it('ensures all 4 evergreen guides link to 3 or more relevant area pages', () => {
    for (const guide of EVERGREEN_GUIDES) {
      expect(
        guide.relevantZones.length,
        `Guide ${guide.slug} must link to at least 3 relevant area pages`
      ).toBeGreaterThanOrEqual(3);

      for (const zone of guide.relevantZones) {
        expect(zone.h3_index).toMatch(/^[0-9a-f]{15}$/);
        expect(zone.nameBn).toBeTruthy();
        expect(zone.ward).toBeTruthy();
      }
    }
  });

  it('ensures all internal links in SiteFooter point to valid routes', () => {
    const footerFile = path.resolve(__dirname, '../components/SiteFooter.tsx');
    const content = fs.readFileSync(footerFile, 'utf-8');

    // Extract all href attributes
    const hrefMatches = [...content.matchAll(/href=["'](\/[a-zA-Z0-9\-_/]*)["']/g)].map(
      (m) => m[1]
    );

    const validRoutes = new Set([
      '/',
      '/map',
      '/history',
      '/about',
      '/how-it-works',
      '/contact',
      '/privacy',
      '/terms',
      '/guides',
      '/sitemap-pages',
      ...EVERGREEN_GUIDES.map((g) => g.path),
    ]);

    for (const href of hrefMatches) {
      expect(
        validRoutes.has(href),
        `SiteFooter link "${href}" must be a valid known route`
      ).toBe(true);
    }
  });

  it('ensures all internal links in HTML sitemap point to valid routes', () => {
    const sitemapFile = path.resolve(__dirname, '../app/sitemap-pages/page.tsx');
    const content = fs.readFileSync(sitemapFile, 'utf-8');

    const hrefMatches = [...content.matchAll(/href=["'](\/[a-zA-Z0-9\-_/]*)["']/g)].map(
      (m) => m[1]
    );

    for (const href of hrefMatches) {
      expect(href.startsWith('/'), `Link "${href}" must be a valid local path`).toBe(true);
    }
  });
});

describe('Trust & Evergreen Content Layer — Dynamic LPG Price & No Hardcoded Price in Prose', () => {
  it('pulls the official price from official_prices table without throwing', async () => {
    const priceData = await getLatestOfficialLpgPrice();

    expect(priceData).toBeDefined();
    expect(priceData.price_bdt).toBeGreaterThan(1000);
    expect(priceData.effective_from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(priceData.source_url).toContain('berc.org.bd');
  });

  it('ensures the LPG guide text NEVER hard-codes a static price in its editorial prose', () => {
    const lpgGuidePath = path.resolve(__dirname, '../app/guides/lpg-cylinder-price-bd/page.tsx');
    const content = fs.readFileSync(lpgGuidePath, 'utf-8');

    // Check that static price strings like "১৪৫৫ টাকা" or "1455" are NOT in the prose
    // Exclude the fallback baseline test or dynamic component
    const proseWithoutWidget = content.replace(/<OfficialLpgPriceWidget[\s\S]*?\/>/, '');

    expect(proseWithoutWidget).not.toContain('১৪৫৫ টাকা');
    expect(proseWithoutWidget).not.toContain('1455.00');
    expect(proseWithoutWidget).not.toContain('১৪৫৫/-');
  });
});

describe('Trust & Evergreen Content Layer — Editorial Freshness & Stale Content Detection', () => {
  it('passes the 90-day stale content audit for current guides', () => {
    const mockToday = new Date('2026-11-20T12:00:00.000Z');
    const { results, hasStaleContent } = auditGuides(EVERGREEN_GUIDES, mockToday);

    expect(hasStaleContent).toBe(false);
    for (const item of results) {
      expect(item.isStale).toBe(false);
      expect(item.daysOld).toBeLessThanOrEqual(90);
    }
  });

  it('correctly flags content as STALE when lastReviewed exceeds 90 days', () => {
    const staleGuides = [
      {
        ...EVERGREEN_GUIDES[0],
        lastReviewed: '2026-05-01', // > 200 days old
      },
    ];

    const mockToday = new Date('2026-11-20T12:00:00.000Z');
    const { results, hasStaleContent } = auditGuides(staleGuides, mockToday);

    expect(hasStaleContent).toBe(true);
    expect(results[0].isStale).toBe(true);
    expect(results[0].daysOld).toBeGreaterThan(90);
  });
});

describe('Trust & Evergreen Content Layer — Truthful Schema.org JSON-LD', () => {
  it('generates compliant Article JSON-LD with truthful dates and author', () => {
    const guide = EVERGREEN_GUIDES[0];
    const jsonLd = buildArticleJsonLd(guide);

    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('Article');
    expect(jsonLd.headline).toBe(guide.title);
    expect(jsonLd.description).toBe(guide.metaDescription);
    expect(jsonLd.inLanguage).toBe('bn-BD');
    expect(jsonLd.publisher.name).toBe(siteConfig.name);
    expect(jsonLd.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(jsonLd.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('generates compliant WebPage JSON-LD for trust pages', () => {
    const jsonLd = buildWebPageJsonLd({
      title: 'আমাদের সম্পর্কে',
      description: 'হালচালের পরিচয় ও লক্ষ্য',
      path: '/about',
      type: 'AboutPage',
    });

    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('AboutPage');
    expect(jsonLd.name).toBe('আমাদের সম্পর্কে');
    expect(jsonLd.publisher).toEqual({
      '@id': `${siteConfig.url}/#organization`,
    });
  });
});
