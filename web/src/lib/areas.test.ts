import { describe, it, expect } from 'vitest';
import {
  DHAKA_PILOT_AREAS,
  AREA_SLUG_REDIRECTS,
  isValidSlug,
  getAreaBySlug,
  getAreaByH3,
  getAllAreasForCity,
  resolveSlugRedirect,
} from './areas';
import { isValidH3Zone } from './zones';

describe('Area Architecture & Spatial Slug Specifications', () => {
  it('enforces strict slug uniqueness per city', () => {
    const slugSet = new Set<string>();
    for (const area of DHAKA_PILOT_AREAS) {
      const citySlugKey = `${area.citySlug}/${area.slug}`;
      expect(slugSet.has(citySlugKey), `Duplicate slug detected: ${citySlugKey}`).toBe(false);
      slugSet.add(citySlugKey);
    }
    expect(slugSet.size).toBe(DHAKA_PILOT_AREAS.length);
  });

  it('validates that all area slugs use strictly URL-safe Latin transliterations', () => {
    for (const area of DHAKA_PILOT_AREAS) {
      expect(isValidSlug(area.slug)).toBe(true);
      // Ensure no Unicode characters or spaces
      expect(area.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      // Ensure citySlug is Latin
      expect(area.citySlug).toMatch(/^[a-z0-9]+$/);
    }
  });

  it('ensures each area maps to valid Uber H3 Resolution 8 cells', () => {
    for (const area of DHAKA_PILOT_AREAS) {
      expect(area.h3Cells.length).toBeGreaterThan(0);
      expect(area.primaryH3).toBeDefined();
      expect(area.h3Cells).toContain(area.primaryH3);

      for (const h3 of area.h3Cells) {
        expect(isValidH3Zone(h3), `Invalid H3 index: ${h3} in area ${area.slug}`).toBe(true);
      }
    }
  });

  it('ensures all neighboring area slugs reference existing valid areas', () => {
    const validSlugs = new Set(DHAKA_PILOT_AREAS.map((a) => a.slug));
    for (const area of DHAKA_PILOT_AREAS) {
      for (const neighborSlug of area.neighborSlugs) {
        expect(
          validSlugs.has(neighborSlug),
          `Area ${area.slug} references invalid neighbor slug: ${neighborSlug}`
        ).toBe(true);
      }
    }
  });

  it('correctly resolves area lookups by slug and by H3 index', () => {
    const mohammadpur = getAreaBySlug('dhaka', 'mohammadpur');
    expect(mohammadpur).not.toBeNull();
    expect(mohammadpur?.nameBn).toBe('মোহাম্মদপুর');
    expect(mohammadpur?.primaryH3).toBe('883cf10cebfffff');

    const byH3 = getAreaByH3('883cf10ca1fffff');
    expect(byH3).not.toBeNull();
    expect(byH3?.slug).toBe('dhanmondi');
    expect(byH3?.nameBn).toBe('ধানমন্ডি');
  });

  it('resolves legacy alias redirects to canonical pilot slugs', () => {
    expect(resolveSlugRedirect('dhaka', 'mirpur')).toBe('mirpur-10');
    expect(resolveSlugRedirect('dhaka', 'gulshan')).toBe('gulshan-1');
    expect(resolveSlugRedirect('dhaka', 'uttara')).toBe('uttara-sector-3');
    expect(resolveSlugRedirect('dhaka', 'mohammadpur')).toBeNull();
  });

  it('returns all areas for Dhaka city and empty for unknown cities', () => {
    expect(getAllAreasForCity('dhaka').length).toBe(10);
    expect(getAllAreasForCity('chittagong').length).toBe(0);
  });
});
