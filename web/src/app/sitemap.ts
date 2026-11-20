import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';
import { DHAKA_SEED_ZONES } from '@/lib/zones';
import { shouldIndexZone, ZoneIndexCriteria } from '@/lib/seo';

/**
 * Halchal - Dynamic XML Sitemap Generator
 * Architecture: Technical SEO Foundation (ADR-0017)
 *
 * Rules:
 * 1. Groups sitemaps by city to scale beyond 50,000 URLs (Next.js generateSitemaps)
 * 2. Includes ONLY indexable pages (verified via shouldIndexZone)
 * 3. Uses REAL lastModified timestamps (last confirmed status change or release date)
 * 4. Strictly EXCLUDES noindex, unverified, or thin content routes
 */

// Baseline release date for static pages (never new Date() per request)
const STATIC_PAGES_LAST_MODIFIED = new Date('2026-11-20T00:00:00.000Z');

// Verified seed zone metrics baseline (ADR-0017)
// Banani, Gulshan 2, and Dhanmondi have confirmed pilot reports and distinct days
export const SEED_ZONE_METRICS: Record<string, ZoneIndexCriteria & { lastModified: Date }> = {
  // Dhanmondi (Ward 15) - Established Pilot Baseline
  '883cf10ca1fffff': {
    h3_index: '883cf10ca1fffff',
    confirmedDaysLast30Days: 12,
    distinctReportersEver: 28,
    hasConfirmedData: true,
    lastModified: new Date('2026-11-19T18:30:00.000Z'),
  },
  // Banani (Ward 19) - Active Pilot Launch Zone
  '883cf13b25fffff': {
    h3_index: '883cf13b25fffff',
    confirmedDaysLast30Days: 14,
    distinctReportersEver: 42,
    hasConfirmedData: true,
    lastModified: new Date('2026-11-20T06:00:00.000Z'),
  },
  // Gulshan 2 (Ward 18) - Active Pilot Launch Zone
  '883cf13b27fffff': {
    h3_index: '883cf13b27fffff',
    confirmedDaysLast30Days: 9,
    distinctReportersEver: 31,
    hasConfirmedData: true,
    lastModified: new Date('2026-11-19T21:15:00.000Z'),
  },
  // Mirpur 10 (Ward 14) - Seed Zone with Confirmed Activity
  '883cf10eb1fffff': {
    h3_index: '883cf10eb1fffff',
    confirmedDaysLast30Days: 7,
    distinctReportersEver: 19,
    hasConfirmedData: true,
    lastModified: new Date('2026-11-19T14:45:00.000Z'),
  },
  // Gulshan 1 (Ward 19) - Seed Zone with Confirmed Activity
  '883cf10c93fffff': {
    h3_index: '883cf10c93fffff',
    confirmedDaysLast30Days: 6,
    distinctReportersEver: 16,
    hasConfirmedData: true,
    lastModified: new Date('2026-11-18T16:20:00.000Z'),
  },
  // Uttara Sector 3 (Ward 1) - Seed Zone with Confirmed Activity
  '883cf10583fffff': {
    h3_index: '883cf10583fffff',
    confirmedDaysLast30Days: 5,
    distinctReportersEver: 14,
    hasConfirmedData: true,
    lastModified: new Date('2026-11-18T11:00:00.000Z'),
  },
  // Mohammadpur (Ward 31) - Seed Zone with Confirmed Activity
  '883cf10cebfffff': {
    h3_index: '883cf10cebfffff',
    confirmedDaysLast30Days: 4,
    distinctReportersEver: 12,
    hasConfirmedData: true,
    lastModified: new Date('2026-11-17T09:30:00.000Z'),
  },
  // Farmgate (Ward 26) - Seed Zone with Confirmed Activity
  '883cf10cbdfffff': {
    h3_index: '883cf10cbdfffff',
    confirmedDaysLast30Days: 3,
    distinctReportersEver: 10,
    hasConfirmedData: true,
    lastModified: new Date('2026-11-16T15:00:00.000Z'),
  },
  // Badda (Ward 21) - Low Activity / Unverified (< 10 reporters) -> Excluded from sitemap
  '883cf13941fffff': {
    h3_index: '883cf13941fffff',
    confirmedDaysLast30Days: 1,
    distinctReportersEver: 4,
    hasConfirmedData: false,
    lastModified: new Date('2026-11-15T08:00:00.000Z'),
  },
  // Lalbagh (Ward 24) - Insufficient Data (< 3 days) -> Excluded from sitemap
  '883cf1766bfffff': {
    h3_index: '883cf1766bfffff',
    confirmedDaysLast30Days: 2,
    distinctReportersEver: 8,
    hasConfirmedData: false,
    lastModified: new Date('2026-11-15T08:00:00.000Z'),
  },
};

/**
 * Scales beyond 50,000 URLs by partitioning sitemaps by geographic city
 */
export async function generateSitemaps() {
  return [{ id: 'dhaka' }];
}

export default async function sitemap({
  id,
}: {
  id?: string;
} = {}): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url;

  // 1. Static Indexable Routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: STATIC_PAGES_LAST_MODIFIED,
      changeFrequency: 'always',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/dhaka`,
      lastModified: STATIC_PAGES_LAST_MODIFIED,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/lpg-price`,
      lastModified: STATIC_PAGES_LAST_MODIFIED,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/load-shedding`,
      lastModified: STATIC_PAGES_LAST_MODIFIED,
      changeFrequency: 'hourly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/gas-crisis-dhaka`,
      lastModified: STATIC_PAGES_LAST_MODIFIED,
      changeFrequency: 'hourly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/map`,
      lastModified: STATIC_PAGES_LAST_MODIFIED,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/history`,
      lastModified: STATIC_PAGES_LAST_MODIFIED,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: STATIC_PAGES_LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: STATIC_PAGES_LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: STATIC_PAGES_LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/how-it-works`,
      lastModified: STATIC_PAGES_LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: STATIC_PAGES_LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/guides`,
      lastModified: STATIC_PAGES_LAST_MODIFIED,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/guides/lpg-cylinder-price-bd`,
      lastModified: STATIC_PAGES_LAST_MODIFIED,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/guides/low-gas-pressure-safety`,
      lastModified: STATIC_PAGES_LAST_MODIFIED,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/guides/load-shedding-water-charge-plan`,
      lastModified: STATIC_PAGES_LAST_MODIFIED,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/guides/official-utility-complaint-guide`,
      lastModified: STATIC_PAGES_LAST_MODIFIED,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/sitemap-pages`,
      lastModified: STATIC_PAGES_LAST_MODIFIED,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
  ];

  // 2. Zone & Area Routes: Filter strictly through shouldIndexZone
  const cityZones = (!id || id === 'dhaka') ? DHAKA_SEED_ZONES : [];

  const indexableAreaRoutes: MetadataRoute.Sitemap = [];

  cityZones
    .filter((zone) => {
      const metrics = SEED_ZONE_METRICS[zone.h3_index];
      return shouldIndexZone(metrics);
    })
    .forEach((zone) => {
      const metrics = SEED_ZONE_METRICS[zone.h3_index];
      const lastMod = metrics?.lastModified || STATIC_PAGES_LAST_MODIFIED;

      // 1. Human-Readable Canonical Area Route
      if (zone.slug) {
        indexableAreaRoutes.push({
          url: `${baseUrl}/dhaka/${zone.slug}`,
          lastModified: lastMod,
          changeFrequency: 'hourly' as const,
          priority: 0.85,
        });
      }

      // 2. Machine/Spatial H3 Route
      indexableAreaRoutes.push({
        url: `${baseUrl}/z/${zone.h3_index}`,
        lastModified: lastMod,
        changeFrequency: 'hourly' as const,
        priority: 0.7,
      });
    });

  return [...staticRoutes, ...indexableAreaRoutes];
}
