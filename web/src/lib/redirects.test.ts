import { describe, it, expect } from 'vitest';
import redirectsData from '@/config/redirects.json';
import { getCanonicalUrl, buildMetadata, shouldIndexZone } from './seo';
import { getAreaByH3 } from './areas';
import { SEED_ZONE_METRICS } from '@/app/sitemap';
import { siteConfig } from '@/config/site';

interface RedirectEntry {
  source: string;
  destination: string;
  permanent: boolean;
}

const redirects = redirectsData as RedirectEntry[];
const baseUrl = siteConfig.url;

describe('Redirect Rules & Canonical Behavior Mandate', () => {
  it('ensures all area redirect rules use HTTP 301 (permanent: true)', () => {
    for (const r of redirects) {
      expect(r.permanent, `Redirect from ${r.source} to ${r.destination} is not permanent`).toBe(true);
    }
  });

  it('redirects legacy /z/[area] slugs directly to /dhaka/[area] human-readable routes', () => {
    const legacyAliases = [
      { from: '/z/mohammadpur', to: '/dhaka/mohammadpur' },
      { from: '/z/dhanmondi', to: '/dhaka/dhanmondi' },
      { from: '/z/mirpur-10', to: '/dhaka/mirpur-10' },
      { from: '/z/mirpur', to: '/dhaka/mirpur-10' },
      { from: '/z/gulshan-1', to: '/dhaka/gulshan-1' },
      { from: '/z/gulshan-2', to: '/dhaka/gulshan-2' },
      { from: '/z/gulshan', to: '/dhaka/gulshan-1' },
      { from: '/z/banani', to: '/dhaka/banani' },
      { from: '/z/uttara-sector-3', to: '/dhaka/uttara-sector-3' },
      { from: '/z/uttara', to: '/dhaka/uttara-sector-3' },
      { from: '/z/farmgate', to: '/dhaka/farmgate' },
      { from: '/z/badda', to: '/dhaka/badda' },
      { from: '/z/lalbagh', to: '/dhaka/lalbagh' },
    ];

    for (const { from, to } of legacyAliases) {
      const match = redirects.find((r) => r.source === from);
      expect(match, `Missing redirect for ${from}`).toBeDefined();
      expect(match?.destination).toBe(to);
    }
  });

  it('keeps /z/[h3] functional and assigns canonical to the matching area page when one exists', () => {
    // 883cf10cebfffff is Mohammadpur
    const mohammadpurH3 = '883cf10cebfffff';
    const area = getAreaByH3(mohammadpurH3);
    expect(area).not.toBeNull();
    expect(area?.slug).toBe('mohammadpur');

    const canonicalPath = area ? `/${area.citySlug}/${area.slug}` : `/z/${mohammadpurH3}`;
    const meta = buildMetadata({
      title: 'মোহাম্মদপুর এলাকা',
      description: 'টেস্ট বিবরণ',
      path: `/z/${mohammadpurH3}`,
      canonicalPath,
    });

    const canonicalUrl = meta.alternates?.canonical;
    expect(canonicalUrl).toBe(`${baseUrl}/dhaka/mohammadpur`);
  });

  it('assigns canonical to /z/[h3] itself when no area slug matches the cell', () => {
    const unknownH3 = '883cf10865fffff'; // Arbitrary valid H3 outside pilot
    const area = getAreaByH3(unknownH3);
    expect(area).toBeNull();

    const canonicalPath = area ? `/${area.citySlug}/${area.slug}` : `/z/${unknownH3}`;
    const meta = buildMetadata({
      title: 'অজ্ঞাত এলাকা',
      description: 'টেস্ট বিবরণ',
      path: `/z/${unknownH3}`,
      canonicalPath,
    });

    const canonicalUrl = meta.alternates?.canonical;
    expect(canonicalUrl).toBe(`${baseUrl}/z/${unknownH3}`);
  });

  it('canonicals thin/unqualified category subpages to the parent area page', () => {
    // Badda has < 10 reporters -> shouldIndexZone is false
    const baddaH3 = '883cf13941fffff';
    const isIndexable = shouldIndexZone(SEED_ZONE_METRICS[baddaH3]);
    expect(isIndexable).toBe(false);

    // When not indexable, category canonical must point to parent area page
    const canonicalPath = isIndexable ? '/dhaka/badda/gas' : '/dhaka/badda';
    const meta = buildMetadata({
      title: 'বাড্ডা: গ্যাস সংকট',
      description: 'টেস্ট বিবরণ',
      path: '/dhaka/badda/gas',
      canonicalPath,
      noindex: !isIndexable,
    });

    expect(meta.alternates?.canonical).toBe(`${baseUrl}/dhaka/badda`);
    expect(meta.robots).toMatchObject({
      index: false,
      follow: true,
    });
  });

  it('canonicals established category subpages to their own category URL', () => {
    // Mohammadpur has confirmed data and >= 10 reporters
    const mohammadpurH3 = '883cf10cebfffff';
    const isIndexable = shouldIndexZone(SEED_ZONE_METRICS[mohammadpurH3]);
    expect(isIndexable).toBe(true);

    const canonicalPath = isIndexable ? '/dhaka/mohammadpur/gas' : '/dhaka/mohammadpur';
    const meta = buildMetadata({
      title: 'মোহাম্মদপুর: গ্যাস সংকট',
      description: 'টেস্ট বিবরণ',
      path: '/dhaka/mohammadpur/gas',
      canonicalPath,
      noindex: !isIndexable,
    });

    expect(meta.alternates?.canonical).toBe(`${baseUrl}/dhaka/mohammadpur/gas`);
    expect(meta.robots).toMatchObject({
      index: true,
      follow: true,
    });
  });
});
