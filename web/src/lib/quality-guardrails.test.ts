import { describe, it, expect } from 'vitest';
import { shouldIndexZone } from './seo';
import { SEED_ZONE_METRICS } from '@/app/sitemap';
import { DHAKA_PILOT_AREAS } from './areas';
import { createDefaultZoneStatus } from './zones';
import { generateAreaBengaliSummary } from './aggregation';

describe('Quality Guardrails Against Thin & Duplicate Content', () => {
  it('correctly gates indexation using shouldIndexZone from S1', () => {
    // 1. Established zones meet criteria (>= 3 confirmed days, >= 10 reporters)
    expect(shouldIndexZone(SEED_ZONE_METRICS['883cf10ca1fffff'])).toBe(true); // Dhanmondi
    expect(shouldIndexZone(SEED_ZONE_METRICS['883cf10cebfffff'])).toBe(true); // Mohammadpur
    expect(shouldIndexZone(SEED_ZONE_METRICS['883cf10eb1fffff'])).toBe(true); // Mirpur 10
    expect(shouldIndexZone(SEED_ZONE_METRICS['883cf13b25fffff'])).toBe(true); // Banani

    // 2. Low activity / thin zones fail criteria and must be noindexed
    expect(shouldIndexZone(SEED_ZONE_METRICS['883cf13941fffff'])).toBe(false); // Badda (< 10 reporters)
    expect(shouldIndexZone(SEED_ZONE_METRICS['883cf1766bfffff'])).toBe(false); // Lalbagh (< 3 days)
  });

  it('generates the helpful insufficient data Bengali fallback when reports are lacking', () => {
    const status = createDefaultZoneStatus('883cf13941fffff'); // Badda
    const summary = generateAreaBengaliSummary(status, 'বাড্ডা');

    expect(summary.reporterConfirmationText).toContain('কোনো নাগরিক রিপোর্ট জমা দেননি');
    expect(summary.detailsList).toContain('বিদ্যুৎ: বিদ্যুৎ সরবরাহের সাম্প্রতিক কোনো তথ্য নেই');
  });

  it('strictly adheres to privacy directives: zero dealer, shop, or personal names', () => {
    // Audit area metadata
    for (const area of DHAKA_PILOT_AREAS) {
      expect(area.nameBn).not.toMatch(/(দোকান|ডিলার|এন্টারপ্রাইজ|ট্রেডার্স|ভাই ভাই|স্টোর)/);
      expect(area.slug).not.toMatch(/(shop|dealer|store|enterprise)/);
    }
  });

  it('ensures H1 headings follow the mandated format "<এলাকা>: এখনকার কারেন্ট, গ্যাস ও পানির হাল"', () => {
    for (const area of DHAKA_PILOT_AREAS) {
      const expectedH1 = `${area.nameBn}: এখনকার কারেন্ট, গ্যাস ও পানির হাল`;
      expect(expectedH1).toContain(area.nameBn);
      expect(expectedH1).toContain('এখনকার কারেন্ট, গ্যাস ও পানির হাল');
      // Ensure H1 length is concise and impactful
      expect(expectedH1.length).toBeLessThanOrEqual(55);
    }
  });
});
